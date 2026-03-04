import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from 'mediasoup-client';

export const useWebRTCGroupVoice = (socket, roomId, userId, roomType = 'battle') => {
    const [inVoice, setInVoice] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [activePeers, setActivePeers] = useState([]);
    const [triggerRender, setTriggerRender] = useState(0);

    const deviceRef = useRef(null);
    const sendTransportRef = useRef(null);
    const recvTransportRef = useRef(null);
    const producerRef = useRef(null);
    const consumersRef = useRef(new Map()); // consumerId => { consumer, socketId }

    const localStreamRef = useRef(null);
    const remoteStreamsRef = useRef({}); // socketId => MediaStream

    const getEventName = useCallback((base) => {
        return roomType === 'session' ? `session_${base}` : base;
    }, [roomType]);

    const getPayload = useCallback((extra = {}) => {
        return roomType === 'session'
            ? { session_id: roomId, ...extra }
            : { battle_id: roomId, ...extra };
    }, [roomType, roomId]);

    const request = useCallback((type, data = {}) => {
        return new Promise((resolve, reject) => {
            socket.emit(getEventName(type), getPayload(data), (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }, [socket, getEventName, getPayload]);

    const cleanup = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (producerRef.current) producerRef.current.close();
        for (const { consumer } of consumersRef.current.values()) {
            consumer.close();
        }
        if (sendTransportRef.current) sendTransportRef.current.close();
        if (recvTransportRef.current) recvTransportRef.current.close();

        consumersRef.current.clear();
        remoteStreamsRef.current = {};
        setActivePeers([]);
        setInVoice(false);

        if (socket) {
            socket.emit(getEventName('leave_voice'), getPayload());
        }
    }, [socket, getEventName, getPayload]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const consumeProducer = async (producerId, socketId, name) => {
        try {
            if (!deviceRef.current) return;

            const { params } = await request('transport-consume', {
                transportId: recvTransportRef.current.id,
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities
            });

            const consumer = await recvTransportRef.current.consume({
                id: params.id,
                producerId: params.producerId,
                kind: params.kind,
                rtpParameters: params.rtpParameters
            });

            consumersRef.current.set(consumer.id, { consumer, socketId });

            const stream = new MediaStream();
            stream.addTrack(consumer.track);
            remoteStreamsRef.current[socketId] = stream;

            await request('resume-consumer', { consumerId: consumer.id });

            setActivePeers(prev => {
                if (!prev.includes(socketId)) return [...prev, socketId];
                return prev;
            });
            setTriggerRender(p => p + 1);

        } catch (err) {
            console.error('[WebRTC] Error consuming producer', err);
        }
    };

    useEffect(() => {
        if (!socket || !inVoice) return;

        const handleNewProducer = async ({ producerId, socketId, name }) => {
            console.log(`[WebRTC] New producer found from ${socketId} - ${name}`);
            await consumeProducer(producerId, socketId, name);
        };

        const handleUserLeft = ({ socketId }) => {
            console.log(`[WebRTC] User left voice: (${socketId})`);

            // Cleanup their consumers
            for (const [consumerId, cData] of consumersRef.current.entries()) {
                if (cData.socketId === socketId) {
                    cData.consumer.close();
                    consumersRef.current.delete(consumerId);
                }
            }

            if (remoteStreamsRef.current[socketId]) {
                delete remoteStreamsRef.current[socketId];
            }

            setActivePeers((prev) => prev.filter(id => id !== socketId));
            setTriggerRender(prev => prev + 1);
        };

        const handleProducerClosed = ({ producerId }) => {
            for (const [consumerId, cData] of consumersRef.current.entries()) {
                if (cData.consumer.producerId === producerId) {
                    cData.consumer.close();
                    consumersRef.current.delete(consumerId);

                    const socketId = cData.socketId;
                    delete remoteStreamsRef.current[socketId];
                    setActivePeers((prev) => prev.filter(id => id !== socketId));
                    setTriggerRender(p => p + 1);
                    break;
                }
            }
        };

        const handleMutedByHost = () => {
            console.log('[WebRTC] Muted by host!');
            if (producerRef.current && !isMuted) {
                producerRef.current.pause();
                setIsMuted(true);
            }
        };

        socket.on(getEventName('newProducer'), handleNewProducer);
        socket.on(getEventName('user_left_voice'), handleUserLeft);
        socket.on(getEventName('producerClosed'), handleProducerClosed);
        socket.on(getEventName('you_were_muted_by_host'), handleMutedByHost);

        return () => {
            socket.off(getEventName('newProducer'), handleNewProducer);
            socket.off(getEventName('user_left_voice'), handleUserLeft);
            socket.off(getEventName('producerClosed'), handleProducerClosed);
            socket.off(getEventName('you_were_muted_by_host'), handleMutedByHost);
        };
    }, [socket, inVoice, isMuted, getEventName]);

    const joinVoice = async () => {
        if (inVoice) return;
        try {
            // 1. Get Router capabilities
            const { rtpCapabilities } = await request('getRouterRtpCapabilities');

            // 2. Load Device
            const device = new Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;

            // 3. Create Send Transport
            const { params: sendTransportParams } = await request('createWebRtcTransport');
            const sendTransport = device.createSendTransport(sendTransportParams);

            sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await request('transport-connect', {
                        transportId: sendTransport.id,
                        dtlsParameters
                    });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                try {
                    const { id } = await request('transport-produce', {
                        transportId: sendTransport.id,
                        kind,
                        rtpParameters
                    });
                    callback({ id });
                } catch (error) {
                    errback(error);
                }
            });

            sendTransportRef.current = sendTransport;

            // 4. Create Receive Transport
            const { params: recvTransportParams } = await request('createWebRtcTransport');
            const recvTransport = device.createRecvTransport(recvTransportParams);

            recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await request('transport-connect', {
                        transportId: recvTransport.id,
                        dtlsParameters
                    });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            recvTransportRef.current = recvTransport;

            // 5. Get and produce local audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            const audioTrack = stream.getAudioTracks()[0];

            producerRef.current = await sendTransport.produce({ track: audioTrack });

            // 6. Consume existing producers
            const { producers } = await request('getProducers');
            for (const { producerId, socketId, name } of producers) {
                await consumeProducer(producerId, socketId, name);
            }

            setInVoice(true);
            setIsMuted(false);

        } catch (error) {
            console.error('[WebRTC] Failed to join voice:', error);
            alert('Could not connect to voice server. Make sure microphone is allowed.');
            cleanup();
        }
    };

    const leaveVoice = () => {
        cleanup();
    };

    const toggleMute = () => {
        if (producerRef.current) {
            if (isMuted) {
                producerRef.current.resume();
            } else {
                producerRef.current.pause();
            }
            setIsMuted(!isMuted);
        }
    };

    const toggleDeafen = () => {
        setIsDeafened(!isDeafened);
    };

    return {
        inVoice,
        isMuted,
        isDeafened,
        activePeers,
        remoteStreams: remoteStreamsRef.current,
        joinVoice,
        leaveVoice,
        toggleMute,
        toggleDeafen,
    };
};
