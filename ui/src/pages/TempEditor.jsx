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

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '5px' }}>
                <div><strong>Socket Status:</strong> {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                <div><strong>Socket ID:</strong> {socket?.id || 'N/A'}</div>
                <div><strong>User:</strong> {user ? `${user.name} (${user.email})` : 'Not logged in'}</div>
            </div>
            <input 
                type="text" 
                placeholder="Enter your code" 
                value={code} 
                onChange={handleCodeChange}
                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
            {user && <div style={{ marginTop: '10px' }}>{user.name} typed: {code}</div>}
        </div>
    );
}