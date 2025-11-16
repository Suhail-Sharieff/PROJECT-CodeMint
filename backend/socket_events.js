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
                origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
                const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
                if (!token) return next(new Error('Authentication error: No token'));

                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                const [rows] = await db.execute("SELECT user_id, name, email FROM user WHERE user_id = ?", [decoded.user_id]);

                if (rows.length === 0) return next(new Error('User not found'));

                socket.user = rows[0];
                next();
            } catch (err) {
                next(new Error(`Authentication error: ${err.message}`));
            }
        });
    }

    async setupEventHandlers() {
        this.io.on('connection', async (socket) => {
            console.log(`🔌 User connected: ${socket.user.name} (${socket.id})`);
            await this.setupSessionEvents(socket);
            await db.execute('UPDATE user SET socket_id=? WHERE user_id=?', [socket.id, socket.user.user_id]);

            // ... inside setupSessionEvents
            socket.on('disconnect', async () => {
                console.log(`🔌 User disconnected: ${socket.user.name} (${socket.id})`);

                const { user_id } = socket.user;
                // Get the session_id we stored during the join
                const session_id = socket.current_session_id;

                if (session_id) {
                    try {
                        // 1. Remove the user from the session_participant table
                        await db.execute(
                            'DELETE FROM session_participant WHERE session_id=? AND user_id=?',
                            [session_id, user_id]
                        );

                        // 2. Notify the Host (and all others in the room) that this user left
                        this.io.to(session_id).emit('joinee_left', user_id);

                        console.log(`User ${user_id} removed from session ${session_id}`);

                    } catch (err) {
                        console.error("Error handling disconnect: ", err);
                    }
                }
            });
        });
    }

    async setupSessionEvents(socket) {
        const { user_id, name } = socket.user;

        // --- 1. HOST: Create Session ---
        socket.on('create_session', async () => {
            const sessionId = uuidv4();
            // Create session entry
            await createSession(user_id, sessionId);
            // Initialize Host Code
            await db.execute('INSERT INTO codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)',
                [sessionId, user_id, '// Session Started', 'javascript']);

            // Add Host to participants
            await joinSession(user_id, sessionId, 'host');

            socket.emit('session_created', sessionId);
        });

        // --- 2. COMMON: Join Session ---
        // inside socketManager.js -> setupSessionEvents

        socket.on('join_session', async ({ session_id }) => {
            socket.join(session_id);

            // --- ADD THIS LINE ---
            // Store session_id on the socket for cleanup during disconnect
            socket.current_session_id = session_id;

            // 1. Determine Role
            const [sessionData] = await db.execute('SELECT host_id FROM session WHERE session_id = ?', [session_id]);
            const role = (sessionData[0] && sessionData[0].host_id === user_id) ? 'host' : 'student';

            // 2. Add to participants
            await joinSession(user_id, session_id, role);

            // 3. Fetch Initial State

            // A. Get Host's Code (Public View)
            const [hostCodeRows] = await db.execute(
                'SELECT code, code_lang FROM codes WHERE session_id=? AND user_id=(SELECT host_id FROM session WHERE session_id=?)',
                [session_id, session_id]
            );

            // B. Get THIS User's Personal Code (Private View) --- [NEW STEP]
            const [myCodeRows] = await db.execute(
                'SELECT code FROM codes WHERE session_id=? AND user_id=?',
                [session_id, user_id]
            );

            // C. Get Participants & Chat (Existing logic...)
            const [users] = await db.execute(`
        SELECT u.user_id as id, u.name, sp.role 
        FROM session_participant sp 
        JOIN user u ON sp.user_id = u.user_id 
        WHERE sp.session_id = ?`, [session_id]);

            const [chat] = await db.execute(`
        SELECT m.message, m.created_at as timestamp, u.name as sender 
        FROM messages m 
        JOIN user u ON m.user_id = u.user_id 
        WHERE m.session_id = ? ORDER BY m.created_at ASC`, [session_id]);

            // 4. Emit State to THIS user
            socket.emit('session_state', {
                code: hostCodeRows[0]?.code || '// Host has not started yet...', // Host's code
                language: hostCodeRows[0]?.code_lang || 'javascript',
                users: users,
                chat: chat,
                // Send the user's own code back to them
                userCode: myCodeRows[0]?.code || '// Write your solution here...' // [NEW FIELD]
            });

            // Notify OTHERS
            socket.to(session_id).emit('joinee_joined', { id: user_id, name: name, role: role });
        });

        // --- 3. HOST: Code Change (Broadcasts to everyone) ---
        socket.on('host_code_change', async ({ session_id, new_code }) => {
            // Update DB so new joiners get latest code
            await db.execute('UPDATE codes SET code=? WHERE session_id=? AND user_id=?', [new_code, session_id, user_id]);
            // Broadcast to room (excluding sender)
            socket.to(session_id).emit('host_code_update', new_code);
        });

        // --- 4. HOST: Language Change ---
        socket.on('host_language_change', async ({ session_id, language }) => {
            await db.execute('UPDATE codes SET code_lang=? WHERE session_id=? AND user_id=?', [language, session_id, user_id]);
            socket.to(session_id).emit('language_change', language);
        });

        // --- 5. JOINEE: Code Change (Sent to Host Monitor) ---
        socket.on('joinee_code_change', async ({ session_id, code }) => {
            // Update Joinee's specific code in DB
            // Upsert logic (Insert if not exists, update if exists)
            const [existing] = await db.execute('SELECT * FROM codes WHERE session_id=? AND user_id=?', [session_id, user_id]);
            if (existing.length > 0) {
                await db.execute('UPDATE codes SET code=? WHERE session_id=? AND user_id=?', [code, session_id, user_id]);
            } else {
                await db.execute('INSERT INTO codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)', [session_id, user_id, code, 'javascript']);
            }

            // Emit ONLY to Host (Assuming we store host socket id, or just broadcast to room and frontend filters)
            // Easier approach: Broadcast to room, Frontend logic filters it out if not Host
            socket.to(session_id).emit('joinee_code_update', { joineeId: user_id, code: code });
        });

        // --- 6. COMMON: Chat ---
        socket.on('send_message', async ({ session_id, message }) => {
            await db.execute('INSERT INTO messages(session_id, user_id, message) VALUES(?,?,?)', [session_id, user_id, message]);
            const msgPayload = { message, sender: name, timestamp: new Date() };
            socket.to(session_id).emit('chat_message', msgPayload);
        });

        // --- 7. HOST: End Session ---
        socket.on('end_session', async ({ session_id }) => {
            await db.execute('UPDATE session SET is_ended=true WHERE session_id=?', [session_id]);
            this.io.to(session_id).emit('session_ended');
            this.io.in(session_id).disconnectSockets(); // Force disconnect everyone
        });

        // Inside setupSessionEvents (Host Methods)

        socket.on('kick_user', async ({ session_id, user_id_to_kick }) => {
            // Optional: Check if requestor is actually the host

            // 1. Remove from DB (participants table)
            await db.execute(
                'DELETE FROM session_participant WHERE session_id=? AND user_id=?',
                [session_id, user_id_to_kick]
            );

            // 2. Get the socket ID of the user to kick
            const [userRows] = await db.execute(
                'SELECT socket_id FROM user WHERE user_id=?',
                [user_id_to_kick]
            );

            if (userRows.length > 0 && userRows[0].socket_id) {
                // 3. Emit 'kicked' event specifically to that user
                this.io.to(userRows[0].socket_id).emit('kicked');

                // 4. Force disconnect the socket
                // this.io.sockets.sockets.get(userRows[0].socket_id)?.disconnect();
            }

            // 5. Notify everyone else that they left
            this.io.to(session_id).emit('joinee_left', user_id_to_kick);
        });
    }
}

const socketManager = new SocketManager();
export { socketManager };