import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "./Utils/sql_connection.js";
import { createSession, joinSession } from "./controller/session.controller.js";
import { v4 as uuidv4 } from "uuid";

class SocketManager {
    constructor() {
        this.io = null;
    }

    async initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Default to frontend port for development
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        await this.setupMiddleware();
        await this.setupEventHandlers();

        console.log("✅ Socket.IO initialized");
    }

    async setupMiddleware() {
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

    async setupEventHandlers() {
        this.io.on('connection', async(socket) => {
            console.log(`🔌 User connected: ${socket.user?.name || 'Unknown'} SOCK_ID=(${socket.id})`);
            await this.handleConnection(socket);
            await this.setupSocketEvents(socket);
            await db.execute('update user set socket_id=? where user_id=?',[socket.id,socket.user.user_id])
        });

        // Handle connection errors
        this.io.on('connection_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
        });
    }

    async handleConnection(socket) {
        const { user_id } = socket.user;

        await this.broadcastUserStatus(user_id, 'online');
    }

    
    

    async broadcastUserStatus(user_id, status) {

        this.io.emit('user_status_changed', {
            user_id,
            status
        });
    }


    async broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        } else {
            console.warn('Socket.IO not initialized. Cannot broadcast:', event);
        }
    }

    async setupSocketEvents(socket) {
        const { user_id, name } = socket.user;


        socket.on('disconnect', async () => {
            console.log(`🔌 User disconnected: ${name} (${socket.id})`);
            this.broadcastUserStatus(user_id, 'offline');
        });

        socket.on('code_change',async(currCode)=>{
            console.log(`currcode: ${currCode}`);
            
            this.io.emit('listen-code-change',currCode)
        });

        socket.on('create_session', async () => {
            const { user_id } = socket.user;
            const sessionId = uuidv4(); 
            await createSession(user_id, sessionId);
            console.log(`Created a new Session with id=${sessionId}`);
            this.io.emit('session_created',sessionId);
        });

        socket.on('join_session',async(session_id)=>{
            const { user_id } = socket.user;
            await joinSession(user_id,session_id)
            this.io.emit('user_joined_session',`${socket.user.email} [${socket.user.name}] joined session!`)
        })

        

    }
}

const socketManager = new SocketManager();
export { socketManager };