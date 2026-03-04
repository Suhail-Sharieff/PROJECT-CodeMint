import React, { useEffect, useRef } from 'react';
import { useWebRTCGroupVoice } from '../hooks/useWebRTCGroupVoice';
import { Mic, MicOff, Headphones, HeadphonesOff, PhoneCall, PhoneOff } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const AudioTag = ({ stream, isDeafened }) => {
    const audioRef = useRef();

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            muted={isDeafened} // If the local user is deafened, we mute all incoming audio
        />
    );
};

export const VoiceChatControls = ({ battle_id }) => {
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

    const {
        inVoice,
        isMuted,
        isDeafened,
        activePeers,
        remoteStreams,
        joinVoice,
        leaveVoice,
        toggleMute,
        toggleDeafen
    } = useWebRTCGroupVoice(socket, battle_id, user?.user_id);

    if (!isConnected) return null;

    return (
        <div className="flex items-center gap-3 bg-gray-900/50 p-2 border border-gray-800 rounded-lg">

            {/* Hidden audio tags for remote peers */}
            {activePeers.map(socketId => (
                <AudioTag
                    key={socketId}
                    stream={remoteStreams[socketId]}
                    isDeafened={isDeafened}
                />
            ))}

            {!inVoice ? (
                <button
                    onClick={joinVoice}
                    className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
                    title="Join Voice Chat"
                >
                    <PhoneCall size={16} />
                    <span>Join Voice</span>
                </button>
            ) : (
                <>
                    <div className="flex px-2 items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{activePeers.length} Peer(s)</span>
                    </div>

                    <div className="flex items-center space-x-1 bg-gray-800 rounded px-1">
                        <button
                            onClick={toggleMute}
                            className={`p-2 rounded hover:bg-gray-700 transition-colors ${isMuted ? 'text-red-400' : 'text-gray-200'}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        <button
                            onClick={toggleDeafen}
                            className={`p-2 rounded hover:bg-gray-700 transition-colors ${isDeafened ? 'text-red-400' : 'text-gray-200'}`}
                            title={isDeafened ? "Undeafen" : "Deafen"}
                        >
                            {isDeafened ? <HeadphonesOff size={18} /> : <Headphones size={18} />}
                        </button>
                    </div>

                    <button
                        onClick={leaveVoice}
                        className="p-2 bg-red-900/40 hover:bg-red-900/80 text-red-500 rounded transition-colors"
                        title="Leave Voice"
                    >
                        <PhoneOff size={18} />
                    </button>
                </>
            )}
        </div>
    );
};
