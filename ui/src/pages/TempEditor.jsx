import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function TempEditor() {
    const [code, setCode] = useState("");
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();

    // Listen for code changes from other users
    useEffect(() => {
        if (!socket) return;

        socket.on('listen-code-change', (newCode) => {
            setCode(newCode);
        });

        socket.on('user_joined_session', (message) => {
            console.log(message);
        });

        return () => {
            socket.off('listen-code-change');
        };
    }, [socket]);

    const handleCodeChange = (e) => {
        const newCode = e.target.value;
        setCode(newCode);
        
        // Emit code change to other users
        if (socket && isConnected) {
            socket.emit('code-change', newCode);
        }
    };

    const [sessionId, setSessionId] = useState(null);
    useEffect(() => {
        if (!socket) return;

        socket.on('session_created', (newSessionId) => {
            setSessionId(newSessionId);
            console.log('Session created with ID:', newSessionId);
        });

        return () => {
            socket.off('session_created');
        };
    }, [socket]);

    const createSession = () => {
        socket.emit('create_session');
    }

    const joinSession = () => {
        if (sessionId) {
            socket.emit('join_session', sessionId);
        } else {
            alert('Please enter a session ID');
        }
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '5px' }}>
                <div><strong>Socket Status:</strong> {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                <div><strong>Socket ID:</strong> {socket?.id || 'N/A'}</div>
                <div><strong>User:</strong> {user ? `${user.name} (${user.email})` : 'Not logged in'}</div>
                {sessionId && <div><strong>Session ID:</strong> {sessionId}</div>}
            </div>
            <input 
                type="text" 
                placeholder="Enter your code" 
                value={code} 
                onChange={handleCodeChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
            {user && <div style={{ marginTop: '10px' }}>{user.name} typed: {code}</div>}

            <div style={{ marginTop: '10px' }}>
                <button onClick={createSession}>Create Session</button>
                <input 
                    type="text" 
                    placeholder="Enter Session ID to Join" 
                    onChange={(e) => setSessionId(e.target.value)}
                    style={{ margin: '0 10px', padding: '5px' }}
                />
                <button onClick={joinSession}>Join Session</button>
            </div>
        </div>
    );
}