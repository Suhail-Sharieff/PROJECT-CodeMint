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

    socket.on('create_session', async () => {
        const sessionId = uuidv4();
        
        await createSession(user_id, sessionId);
        
        await db.execute('INSERT INTO session_codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)',
            [sessionId, user_id, '// Session Started', 'javascript']);

        
        await joinSession(user_id, sessionId, 'host');

        socket.emit('session_created', sessionId);
    });

    
    

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

        
        
        socket.current_session_id = session_id;

        
        const [sessionData] = await db.execute('SELECT host_id FROM session WHERE session_id = ?', [session_id]);
        const role = (sessionData[0] && sessionData[0].host_id === user_id) ? 'host' : 'joinee';

        
        await joinSession(user_id, session_id, role);

        

        
        const [hostCodeRows] = await db.execute(
            'SELECT code, code_lang FROM session_codes WHERE session_id=? AND user_id=(SELECT host_id FROM session WHERE session_id=?)',
            [session_id, session_id]
        );

        
        const [myCodeRows] = await db.execute(
            'SELECT code FROM session_codes WHERE session_id=? AND user_id=?',
            [session_id, user_id]
        );

        
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

        
        socket.emit('session_state', {
            code: hostCodeRows[0]?.code || '// Host has not started yet...', // Host's code
            language: hostCodeRows[0]?.code_lang || 'javascript',
            users: users,
            chat: chat,
            
            userCode: myCodeRows[0]?.code || '// Write your solution here...' // [NEW FIELD]
        });

        
        socket.to(session_id).emit('joinee_joined', { id: user_id, name: name, role: role });
    });

    
    socket.on('host_code_change', async ({ session_id, new_code }) => {
        
        const query='UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?'
        
        await produceEvent(Topics.DB_TOPIC,{
            type:Events.DB_QUERY.type,
            payload:{
                desc:`host_code_change in session_id=${session_id} user_id=${user_id}`,
                query:query,
                params:[new_code, session_id, user_id]
            }
        })
        
        socket.to(session_id).emit('host_code_update', new_code);
    });

    
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

    
    socket.on('joinee_code_change', async ({ session_id, code }) => {
        
        
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
        
        
        socket.to(session_id).emit('joinee_code_update', { joineeId: user_id, code: code });
    });

    
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

    
    socket.on('end_session', async ({ session_id }) => {
        
        await db.execute('UPDATE session SET is_ended=true WHERE session_id=?', [session_id]);

        
        io.to(session_id).emit('session_ended');

        
        
        const socketsInRoom = await io.in(session_id).fetchSockets();

        for (const s of socketsInRoom) {
            s.leave(session_id);
            
            s.current_session_id = null;
        }

        console.log(`Session ${session_id} ended and room cleared.`);
    });

    

    socket.on('kick_user', async ({ session_id, user_id_to_kick }) => {
        

        
        await db.execute(
            'DELETE FROM session_participant WHERE session_id=? AND user_id=?',
            [session_id, user_id_to_kick]
        );

        
        const [userRows] = await db.execute(
            'SELECT socket_id FROM user WHERE user_id=?',
            [user_id_to_kick]
        );

        if (userRows.length > 0 && userRows[0].socket_id) {
            
            io.to(userRows[0].socket_id).emit('kicked');

            
            // this.io.sockets.sockets.get(userRows[0].socket_id)?.disconnect();
        }

        
        io.to(session_id).emit('joinee_left', user_id_to_kick);
    });
}


export { createSession, joinSession, getHostIdOf,setupSessionEvents }