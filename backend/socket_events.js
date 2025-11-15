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
                origin: process.env.CORS_ORIGIN,
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
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                const [rows] = await db.execute(
                    "SELECT user_id, name, email FROM user WHERE user_id = ?",
                    [decoded.user_id]
                );

                if (rows.length === 0) {
                    return next(new Error('Authentication error: User not found'));
                }

                socket.user = rows[0];
                next();
            } catch (err) {
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 User connected: ${socket.user.name} SOCK_ID=(${socket.id})`);
            this.handleConnection(socket);
            this.setupSocketEvents(socket);
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
    }
}

const socketManager = new SocketManager();
export { socketManager };