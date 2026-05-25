
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "./Utils/sql_connection.js";
import { activeSocketConnections } from "./Utils/custom_prometheus_metrics.util.js";
import { redis } from "./Utils/redis_connection.utils.js";

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

            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
            const redisKey = `jwt:auth:${tokenHash}`;

            // Try to get cached user details
            const cachedUser = await redis.get(redisKey);
            if (cachedUser) {
                socket.user = JSON.parse(cachedUser);
                return next();
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const [rows] = await db.execute("SELECT user_id, name, email FROM user WHERE user_id = ?", [decoded.user_id]);

            if (rows.length === 0) return next(new Error('User not found'));

            socket.user = rows[0];

            // Cache the user details in Redis
            const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
            if (remainingTime > 0) {
                await redis.setEx(redisKey, remainingTime, JSON.stringify(socket.user));
            }

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
        activeSocketConnections.inc();

        try {
            await setupSessionEvents(socket,io);
            await db.execute('UPDATE user SET socket_id=? WHERE user_id=?', [socket.id, socket.user.user_id]);
            await setupTestEvents(socket,io);
            await setupBattleEvents(io,socket);
        } catch (err) {
            console.error(`❌ Socket connection setup error for user ${socket.user.name}:`, err.message);
        }

        socket.on('disconnect', async () => {
            if (!socket.user) return;
            console.log(`🔌 User disconnected: ${socket.user.name} (${socket.id})`);
            activeSocketConnections.dec();
            // const { user_id } = socket.user;

        });

    });

}


