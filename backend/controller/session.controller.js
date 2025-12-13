import { asyncHandler } from "../Utils/AsyncHandler.utils.js"
import { ApiError } from "../Utils/Api_Error.utils.js"
import { ApiResponse } from "../Utils/Api_Response.utils.js"
import { db } from "../Utils/sql_connection.js"

const createSession =
    async (user_id, session_id) => {

        try {
            if (!user_id) throw new ApiError(400, `No user_id provided by SocketManager to create session!`)
            if (!session_id) throw new ApiError(400, `No session_id provided by SocketManager to create session!`)

            const query = 'insert into session (session_id,host_id) values(?,?)'
            const [rows] = await db.execute(query, [session_id, user_id])
            if (rows.length === 0) throw new ApiError(400, "Unabe to create session!")





        } catch (e) {
            throw new ApiError(400, e.message);
        }

    }


const getHostIdOf = asyncHandler(
    async (req, res) => {
        const { session_id } = req.params
        console.log(req.params);

        if (!session_id) throw new ApiError(400, 'Please provide session_id to find host of!')

        const [rows] = await db.execute('select host_id from session where session_id=?', [session_id])

        if (rows.length <= 0) throw new ApiError(404, 'No such session_id exists!')

        return res.status(200).json(new ApiResponse(200, rows[0].host_id, 'Host ID retrieved successfully'))
    }
)
const joinSession =
    async (user_id, session_id) => {
        try {
            if (!session_id) throw new ApiError(400, "Socket manager didnt provide session id to join !")
            if (!user_id) throw new ApiError(400, "Socket manager didnt provide user id to join !")

            const query = 'insert into session_participant(session_id,user_id) values (?,?)'
            const [rows] = await db.execute(query, [session_id, user_id])

            console.log(`User id = ${user_id} joined Session id = ${session_id}`);


        } catch (e) {
            console.log(e.message);

        }

    }

import { v4 as uuidv4 } from "uuid";
import { Server,Socket } from "socket.io"
import { produceEvent } from "../Utils/kafka_connection.js"
import { Events, Topics } from "../Utils/kafka_events.js"
/**
* @param {Server} io
* @param {Socket} socket
*/

async function setupSessionEvents(socket,io) {
    const { user_id, name } = socket.user;

    // --- 1. HOST: Create Session ---
    socket.on('create_session', async () => {
        const sessionId = uuidv4();
        // Create session entry
        await createSession(user_id, sessionId);
        // Initialize Host Code
        await db.execute('INSERT INTO session_codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)',
            [sessionId, user_id, '// Session Started', 'javascript']);

        // Add Host to participants
        await joinSession(user_id, sessionId, 'host');

        socket.emit('session_created', sessionId);
    });

    // --- 2. COMMON: Join Session ---
    // inside socketManager.js -> setupSessionEvents

    socket.on('join_session', async ({ session_id }) => {
        const [temp] = await db.execute('SELECT is_ended FROM session WHERE session_id = ?', [session_id]);
        console.log('join session: ', temp);

        if (!temp[0]) {
            socket.emit('error', { message: "No such session id exists!" });
            return;
        }
        if (temp[0].is_ended === 1) {
            socket.emit('error', { message: "This session has ended already" });
            return;
        }
        socket.join(session_id);

        // --- ADD THIS LINE ---
        // Store session_id on the socket for cleanup during disconnect
        socket.current_session_id = session_id;

        // 1. Determine Role
        const [sessionData] = await db.execute('SELECT host_id FROM session WHERE session_id = ?', [session_id]);
        const role = (sessionData[0] && sessionData[0].host_id === user_id) ? 'host' : 'joinee';

        // 2. Add to participants
        await joinSession(user_id, session_id, role);

        // 3. Fetch Initial State

        // A. Get Host's Code (Public View)
        const [hostCodeRows] = await db.execute(
            'SELECT code, code_lang FROM session_codes WHERE session_id=? AND user_id=(SELECT host_id FROM session WHERE session_id=?)',
            [session_id, session_id]
        );

        // B. Get THIS User's Personal Code (Private View) --- [NEW STEP]
        const [myCodeRows] = await db.execute(
            'SELECT code FROM session_codes WHERE session_id=? AND user_id=?',
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
        const query='UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?'
        // await db.execute(query, [new_code, session_id, user_id]);
        await produceEvent(Topics.DB_TOPIC,{
            type:Events.DB_QUERY.type,
            payload:{
                desc:`host_code_change in session_id=${session_id} user_id=${user_id}`,
                query:query,
                params:[new_code, session_id, user_id]
            }
        })
        // Broadcast to room (excluding sender)
        socket.to(session_id).emit('host_code_update', new_code);
    });

    // --- 4. HOST: Language Change ---
    socket.on('host_language_change', async ({ session_id, language }) => {
        const query='UPDATE session_codes SET code_lang=? WHERE session_id=? AND user_id=?'
        // await db.execute(query, [language, session_id, user_id]);
        await produceEvent(Topics.DB_TOPIC,{
            type:Events.DB_QUERY.type,
            payload:{
                desc:`host_language_change in session_id=${session_id} user_id=${user_id}`,
                query:query,
                params: [language, session_id, user_id]
            }
        })
        socket.to(session_id).emit('language_change', language);
    });

    // --- 5. JOINEE: Code Change (Sent to Host Monitor) ---
    socket.on('joinee_code_change', async ({ session_id, code }) => {
        // Update Joinee's specific code in DB
        // Upsert logic (Insert if not exists, update if exists)
        const [existing] = await db.execute('SELECT * FROM session_codes WHERE session_id=? AND user_id=?', [session_id, user_id]);
        let query;
        let params;
        if (existing.length > 0) {
            query='UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?'
            params=[code, session_id, user_id]
        } else {
            query='INSERT INTO session_codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)'
            params=[session_id, user_id, code, 'javascript']
        }
        // await db.execute(query,params );
        await produceEvent(Topics.DB_TOPIC,{
            type:Events.DB_QUERY.type,
            payload:{
                desc:`joinee_code_change in session_id=${session_id} user_id=${user_id}`,
                query:query,
                params: params
            }
        })
        // Emit ONLY to Host (Assuming we store host socket id, or just broadcast to room and frontend filters)
        // Easier approach: Broadcast to room, Frontend logic filters it out if not Host
        socket.to(session_id).emit('joinee_code_update', { joineeId: user_id, code: code });
    });

    // --- 6. COMMON: Chat ---
    socket.on('send_message', async ({ session_id, message }) => {
        const query='INSERT INTO messages(session_id, user_id, message) VALUES(?,?,?)'
        // await db.execute(query, [session_id, user_id, message]);
        await produceEvent(Topics.DB_TOPIC,{
            type:Events.DB_QUERY.type,
            payload:{
                desc:`send_message in session_id=${session_id} user_id=${user_id}`,
                query:query,
                params: [session_id, user_id, message]
            }
        })
        const msgPayload = { message, sender: name, timestamp: new Date() };
        socket.to(session_id).emit('chat_message', msgPayload);
    });

    // --- 7. HOST: End Session ---
    socket.on('end_session', async ({ session_id }) => {
        // 1. Mark session as ended in DB
        await db.execute('UPDATE session SET is_ended=true WHERE session_id=?', [session_id]);

        // 2. Broadcast to everyone that session ended
        io.to(session_id).emit('session_ended');

        // 3. Clean up the socket room
        // Ideally, we make all sockets leave the room so they don't receive old events
        const socketsInRoom = await io.in(session_id).fetchSockets();

        for (const s of socketsInRoom) {
            s.leave(session_id);
            // CLEAR the session ID so they are "free"
            s.current_session_id = null;
        }

        console.log(`Session ${session_id} ended and room cleared.`);
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
            io.to(userRows[0].socket_id).emit('kicked');

            // 4. Force disconnect the socket
            // this.io.sockets.sockets.get(userRows[0].socket_id)?.disconnect();
        }

        // 5. Notify everyone else that they left
        io.to(session_id).emit('joinee_left', user_id_to_kick);
    });
}


export { createSession, joinSession, getHostIdOf,setupSessionEvents }