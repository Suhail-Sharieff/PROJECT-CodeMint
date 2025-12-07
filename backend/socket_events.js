
import jwt from "jsonwebtoken";
import { db } from "./Utils/sql_connection.js";





//********************************************* */
import { setupSessionEvents } from "./controller/session.controller.js";
import { setupTestEvents } from "./controller/test.controller.js";
export function registerSocketEvents(io) {

    io.use(async (socket, next) => {
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


    io.on('connection', async (socket) => {

        if(!socket.user) {
             socket.disconnect(); 
             return;
        }
        console.log(`🔌 User connected: ${socket.user.name} (${socket.id})`);

        await setupSessionEvents(socket,io);
        await db.execute('UPDATE user SET socket_id=? WHERE user_id=?', [socket.id, socket.user.user_id]);
        await setupTestEvents(socket,io); // Initializes the join_test listener

        // --- GLOBAL DISCONNECT HANDLER ---
        socket.on('disconnect', async () => {
            if (!socket.user) return;
            console.log(`🔌 User disconnected: ${socket.user.name} (${socket.id})`);
            const { user_id } = socket.user;

            // 1. Handle LIVE SESSION Disconnect (Delete & Notify)
            if (socket.current_session_id) {
                const session_id = socket.current_session_id;
                try {
                    // Remove from participant list (Sessions are ephemeral)
                    await db.execute('DELETE FROM session_participant WHERE session_id=? AND user_id=?', [session_id, user_id]);
                    io.to(session_id).emit('joinee_left', user_id);
                } catch (err) {
                    console.error("Error handling session disconnect:", err);
                }
            }

            // 2. Handle TEST Disconnect (Notify Only)
            if (socket.current_test_id) {
                const test_id = socket.current_test_id;
                try {
                    // NOTE: We DO NOT delete from 'test_participant' because they might be reloading!
                    // We just tell the Host "Hey, this user is offline now".

                    io.to(test_id).emit('joinee_left', user_id);
                    console.log(`User ${user_id} disconnected from test ${test_id}`);

                } catch (err) {
                    console.error("Error handling test disconnect:", err);
                }
            }
        });

    });

}

