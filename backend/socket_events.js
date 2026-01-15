
import jwt from "jsonwebtoken";
import { db } from "./Utils/sql_connection.js";





//********************************************* */
import { setupSessionEvents } from "./controller/session.controller.js";
import { setupTestEvents } from "./controller/test.controller.js";
import { setupBattleEvents } from "./controller/battle.controller.js";
// import { setupBattleEvents } from "./controller/battle.controller.js";
export function registerSocketEvents(io) {

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '') || socket.handshake.headers?.accesstoken;
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
        await setupTestEvents(socket,io);
        await setupBattleEvents(io,socket)

        socket.on('disconnect', async () => {
            if (!socket.user) return;
            console.log(`🔌 User disconnected: ${socket.user.name} (${socket.id})`);
            // const { user_id } = socket.user;

        });

    });

}

