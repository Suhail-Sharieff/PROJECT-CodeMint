import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ],
};

export const useWebRTCGroupVoice = (socket, battle_id, userId) => {
    const [inVoice, setInVoice] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [activePeers, setActivePeers] = useState([]);

    const localStreamRef = useRef(null);
    const peersRef = useRef({}); // { socketId: RTCPeerConnection }
    const remoteStreamsRef = useRef({}); // { socketId: MediaStream }

    // Expose remote streams for the UI to bind to <audio> tags
    const [triggerRender, setTriggerRender] = useState(0);

    const cleanup = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        Object.values(peersRef.current).forEach((peer) => peer.close());
        peersRef.current = {};
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

    // Handle socket events
    useEffect(() => {
        if (!socket || !inVoice) return;

        const handleUserJoined = async ({ socketId, userId: remoteUserId, name }) => {
            console.log(`[WebRTC] User joined voice: ${name} (${socketId})`);
            // We initiate the call if we hear someone joined
            createPeerConnection(socketId, true);
        };

        const handleUserLeft = ({ socketId }) => {
            console.log(`[WebRTC] User left voice: (${socketId})`);
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }
            if (remoteStreamsRef.current[socketId]) {
                delete remoteStreamsRef.current[socketId];
            }
            setActivePeers((prev) => prev.filter(id => id !== socketId));
            setTriggerRender(prev => prev + 1);
        };

        const handleReceiveOffer = async ({ callerSocketId, offer }) => {
            console.log(`[WebRTC] Received offer from ${callerSocketId}`);
            try {
                const peerConnection = createPeerConnection(callerSocketId, false);
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('webrtc_answer', { targetSocketId: callerSocketId, answer });
            } catch (err) {
                console.error('[WebRTC] Error handling offer:', err);
            }
        };

        const handleReceiveAnswer = async ({ answererSocketId, answer }) => {
            console.log(`[WebRTC] Received answer from ${answererSocketId}`);
            const peerConnection = peersRef.current[answererSocketId];
            if (peerConnection) {
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (err) {
                    console.error('[WebRTC] Error setting remote description (answer):', err);
                }
            }
        };

        const handleReceiveIceCandidate = async ({ senderSocketId, candidate }) => {
            const peerConnection = peersRef.current[senderSocketId];
            if (peerConnection) {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error('[WebRTC] Error adding ICE candidate:', err);
                }
            }
        };

        socket.on('user_joined_voice', handleUserJoined);
        socket.on('user_left_voice', handleUserLeft);
        socket.on('webrtc_offer', handleReceiveOffer);
        socket.on('webrtc_answer', handleReceiveAnswer);
        socket.on('webrtc_ice_candidate', handleReceiveIceCandidate);

        return () => {
            socket.off('user_joined_voice', handleUserJoined);
            socket.off('user_left_voice', handleUserLeft);
            socket.off('webrtc_offer', handleReceiveOffer);
            socket.off('webrtc_answer', handleReceiveAnswer);
            socket.off('webrtc_ice_candidate', handleReceiveIceCandidate);
        };
    }, [socket, inVoice]);

    const createPeerConnection = (targetSocketId, isInitiator) => {
        if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

        const peerConnection = new RTCPeerConnection(ICE_SERVERS);
        peersRef.current[targetSocketId] = peerConnection;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current);
            });
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_ice_candidate', { targetSocketId, candidate: event.candidate });
            }
        };

        peerConnection.ontrack = (event) => {
            console.log(`[WebRTC] Received remote track from ${targetSocketId}`);
            remoteStreamsRef.current[targetSocketId] = event.streams[0];
            setActivePeers((prev) => {
                if (!prev.includes(targetSocketId)) return [...prev, targetSocketId];
                return prev;
            });
            setTriggerRender(prev => prev + 1);
        };

        if (isInitiator) {
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('webrtc_offer', {
                        targetSocketId,
                        callerId: userId,
                        offer: peerConnection.localDescription
                    });
                })
                .catch(err => console.error('[WebRTC] Error creating offer:', err));
        }

        return peerConnection;
    };

    const joinVoice = async () => {
        if (inVoice) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            setInVoice(true);
            setIsMuted(false);
            socket.emit('join_voice', { battle_id });
        } catch (err) {
            console.error('[WebRTC] Failed to get local media:', err);
            alert('Could not access microphone.');
        }
    };

    const leaveVoice = () => {
        cleanup();
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleDeafen = () => {
        setIsDeafened(!isDeafened);
        // UI layer handles deafen by setting audio tags to muted
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
