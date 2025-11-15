import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "./Utils/sql_connection.js";

class SocketManager {
    constructor() {
        this.io = null;
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Default to frontend port for development
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        console.log("✅ Socket.IO initialized");
    }

    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                console.log('🔍 Socket middleware - Checking authentication...');
                // console.log('🔍 Handshake auth:', socket.handshake.auth);
                // console.log('🔍 Handshake headers:', socket.handshake.headers);
                
                const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    console.error('❌ No token provided in socket handshake');
                    // console.error('   Auth object:', socket.handshake.auth);
                    // console.error('   Headers:', socket.handshake.headers);
                    return next(new Error('Authentication error: No token provided'));
                }

                console.log('✅ Token found, verifying...');
                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                console.log('✅ Token decoded successfully, user_id:', decoded.user_id);
                
                const [rows] = await db.execute(
                    "SELECT user_id, name, email FROM user WHERE user_id = ?",
                    [decoded.user_id]
                );

                if (rows.length === 0) {
                    console.error('❌ User not found in database for user_id:', decoded.user_id);
                    return next(new Error('Authentication error: User not found'));
                }

                socket.user = rows[0];
                console.log('✅ Socket authenticated for user:', rows[0].name);
                next();
            } catch (err) {
                console.error('❌ Socket authentication error:', err.message);
                console.error('   Error stack:', err.stack);
                next(new Error(`Authentication error: ${err.message}`));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 User connected: ${socket.user?.name || 'Unknown'} SOCK_ID=(${socket.id})`);
            this.handleConnection(socket);
            this.setupSocketEvents(socket);
        });

        // Handle connection errors
        this.io.on('connection_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
        });
    }

    async handleConnection(socket) {
        const { user_id } = socket.user;

        this.broadcastUserStatus(user_id, 'online');
    }

    
    

    broadcastUserStatus(user_id, status) {

        this.io.emit('user_status_changed', {
            user_id,
            status
        });
    }


    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        } else {
            console.warn('Socket.IO not initialized. Cannot broadcast:', event);
        }
    }

    setupSocketEvents(socket) {
        const { user_id, name } = socket.user;


        socket.on('disconnect', async () => {
            console.log(`🔌 User disconnected: ${name} (${socket.id})`);
            this.broadcastUserStatus(user_id, 'offline');
        });

        socket.on('code-change',async(currCode)=>{
            console.log(`currcode: ${currCode}`);
            
            this.io.emit('listen-code-change',currCode)
        })


    }
}

const socketManager = new SocketManager();
export { socketManager };