import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from 'mediasoup-client';

export const useWebRTCGroupVoice = (socket, battle_id, userId) => {
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

    const request = useCallback((type, data = {}) => {
        return new Promise((resolve, reject) => {
            socket.emit(type, data, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }, [socket]);

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
            socket.emit('leave_voice', { battle_id });
        }
    }, [socket, battle_id]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const consumeProducer = async (producerId, socketId) => {
        try {
            if (!deviceRef.current) return;

            const { params } = await request('transport-consume', {
                battle_id,
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

            await request('resume-consumer', { battle_id, consumerId: consumer.id });

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

        const handleNewProducer = async ({ producerId, socketId }) => {
            console.log(`[WebRTC] New producer found from ${socketId}`);
            await consumeProducer(producerId, socketId);
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
            if (producerRef.current && !isMuted) { // Only pause if not already paused
                producerRef.current.pause();
                setIsMuted(true);
            }
        };

        socket.on('newProducer', handleNewProducer);
        socket.on('user_left_voice', handleUserLeft);
        socket.on('producerClosed', handleProducerClosed);
        socket.on('you_were_muted_by_host', handleMutedByHost);

        return () => {
            socket.off('newProducer', handleNewProducer);
            socket.off('user_left_voice', handleUserLeft);
            socket.off('producerClosed', handleProducerClosed);
            socket.off('you_were_muted_by_host', handleMutedByHost);
        };
    }, [socket, inVoice, isMuted]);

    const joinVoice = async () => {
        if (inVoice) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            // 1. Get Router RTP Capabilities
            const { rtpCapabilities } = await request('getRouterRtpCapabilities', { battle_id });

            // 2. Load Device
            const device = new Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;

            // 3. Create Send Transport
            const sendTransportData = await request('createWebRtcTransport', { battle_id });
            sendTransportRef.current = device.createSendTransport(sendTransportData.params);

            sendTransportRef.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                request('transport-connect', { battle_id, transportId: sendTransportRef.current.id, dtlsParameters })
                    .then(callback).catch(errback);
            });

            sendTransportRef.current.on('produce', async (parameters, callback, errback) => {
                try {
                    const { id } = await request('transport-produce', {
                        battle_id,
                        transportId: sendTransportRef.current.id,
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters
                    });
                    callback({ id });
                } catch (err) {
                    errback(err);
                }
            });

            // 4. Create Receive Transport
            const recvTransportData = await request('createWebRtcTransport', { battle_id });
            recvTransportRef.current = device.createRecvTransport(recvTransportData.params);

            recvTransportRef.current.on('connect', ({ dtlsParameters }, callback, errback) => {
                request('transport-connect', { battle_id, transportId: recvTransportRef.current.id, dtlsParameters })
                    .then(callback).catch(errback);
            });

            // 5. Produce Local Audio
            const audioTrack = stream.getAudioTracks()[0];
            producerRef.current = await sendTransportRef.current.produce({ track: audioTrack });

            // 6. Consume existing producers
            const { producers } = await request('getProducers', { battle_id });
            for (const { producerId, socketId } of producers) {
                await consumeProducer(producerId, socketId);
            }

            setInVoice(true);
            setIsMuted(false);

        } catch (err) {
            console.error('[WebRTC] Failed to join voice:', err);
            alert('Could not connect to voice server. Make sure microphone is allowed.');
            cleanup();
        }
    };

    const leaveVoice = () => {
        cleanup();
    };

    const toggleMute = () => {
        if (producerRef.current) {
            if (!isMuted) {
                producerRef.current.pause();
            } else {
                producerRef.current.resume();
            }
            setIsMuted(!isMuted);
        } else if (localStreamRef.current) {
            // Fallback if producer isn't ready
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
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
