import { asyncHandler } from "../Utils/AsyncHandler.utils.js"
import { ApiError } from "../Utils/Api_Error.utils.js"
import { ApiResponse } from "../Utils/Api_Response.utils.js"
import { db } from "../Utils/sql_connection.js"
import { getWorker, mediasoupConfig } from '../Utils/mediasoup.js';

const sessionRoomState = new Map();

// Helper to get or create Mediasoup room for a session
const getOrCreateSessionRoom = async (session_id) => {
    if (!sessionRoomState.has(session_id)) {
        const worker = getWorker();
        const router = await worker.createRouter(mediasoupConfig.routerOptions);

        sessionRoomState.set(session_id, {
            router,
            transports: new Map(), // transportId => transport object
            producers: new Map(),  // producerId => { producer, socketId, userId, name }
            consumers: new Map(),  // consumerId => { consumer, socketId }
            socketToTransports: new Map() // socketId => Set of transport IDs
        });
    }
    return sessionRoomState.get(session_id);
};

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
import { Server, Socket } from "socket.io"
import { produceEvent } from "../Utils/kafka_connection.js"
import { Events, Topics } from "../Utils/kafka_events.js"
/**
* @param {Server} io
* @param {Socket} socket
*/

async function setupSessionEvents(socket, io) {
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

        const query = 'UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?'

        await produceEvent(Topics.SESSION_TOPIC.name, {
            type: Events.DB_QUERY.type,
            payload: {
                desc: `host_code_change in session_id=${session_id} user_id=${user_id}`,
                query: query,
                params: [new_code, session_id, user_id]
            },
            key:session_id
        })

        socket.to(session_id).emit('host_code_update', new_code);
    });


    socket.on('host_language_change', async ({ session_id, language }) => {
        const query = 'UPDATE session_codes SET code_lang=? WHERE session_id=? AND user_id=?'
        // await db.execute(query, [language, session_id, user_id]);
        await produceEvent(Topics.SESSION_TOPIC.name, {
            type: Events.DB_QUERY.type,
            payload: {
                desc: `host_language_change in session_id=${session_id} user_id=${user_id}`,
                query: query,
                params: [language, session_id, user_id]
            },
            key:session_id
        })
        socket.to(session_id).emit('language_change', language);
    });


    socket.on('joinee_code_change', async ({ session_id, code }) => {


        const [existing] = await db.execute('SELECT * FROM session_codes WHERE session_id=? AND user_id=?', [session_id, user_id]);
        let query;
        let params;
        if (existing.length > 0) {
            query = 'UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?'
            params = [code, session_id, user_id]
        } else {
            query = 'INSERT INTO session_codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)'
            params = [session_id, user_id, code, 'javascript']
        }
        // await db.execute(query,params );
        await produceEvent(Topics.SESSION_TOPIC.name, {
            type: Events.DB_QUERY.type,
            payload: {
                desc: `joinee_code_change in session_id=${session_id} user_id=${user_id}`,
                query: query,
                params: params
            },
            key:session_id
        })


        socket.to(session_id).emit('joinee_code_update', { joineeId: user_id, code: code });
    });


    socket.on('send_message', async ({ session_id, message }) => {
        const query = 'INSERT INTO messages(session_id, user_id, message) VALUES(?,?,?)'
        // await db.execute(query, [session_id, user_id, message]);
        await produceEvent(Topics.SESSION_TOPIC.name, {
            type: Events.DB_QUERY.type,
            payload: {
                desc: `send_message in session_id=${session_id} user_id=${user_id}`,
                query: query,
                params: [session_id, user_id, message]
            },
            key:session_id
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

    // --- WebRTC Voice Events (SFU) ---

    const cleanupSessionVoice = (socketId, sessionId) => {
        const room = sessionRoomState.get(sessionId);
        if (!room) return;

        const transportIds = room.socketToTransports.get(socketId);
        if (transportIds) {
            for (const transportId of transportIds) {
                const transport = room.transports.get(transportId);
                if (transport) transport.close();
                room.transports.delete(transportId);
            }
            room.socketToTransports.delete(socketId);
        }

        for (const [producerId, pData] of room.producers.entries()) {
            if (pData.socketId === socketId) {
                pData.producer.close();
                room.producers.delete(producerId);
            }
        }

        for (const [consumerId, cData] of room.consumers.entries()) {
            if (cData.socketId === socketId) {
                cData.consumer.close();
                room.consumers.delete(consumerId);
            }
        }

        socket.to(sessionId).emit('session_user_left_voice', { socketId });
    };

    socket.on('session_getRouterRtpCapabilities', async ({ session_id }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            if (callback) callback({ rtpCapabilities: room.router.rtpCapabilities });
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_createWebRtcTransport', async ({ session_id }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            const transport = await room.router.createWebRtcTransport(mediasoupConfig.webRtcTransportOptions);

            room.transports.set(transport.id, transport);
            if (!room.socketToTransports.has(socket.id)) {
                room.socketToTransports.set(socket.id, new Set());
            }
            room.socketToTransports.get(socket.id).add(transport.id);

            if (callback) callback({
                params: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters
                }
            });
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_transport-connect', async ({ session_id, transportId, dtlsParameters }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            const transport = room.transports.get(transportId);
            if (!transport) throw new Error(`Transport ${transportId} not found`);
            await transport.connect({ dtlsParameters });
            if (callback) callback({});
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_transport-produce', async ({ session_id, transportId, kind, rtpParameters }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            const transport = room.transports.get(transportId);
            if (!transport) throw new Error(`Transport ${transportId} not found`);

            const producer = await transport.produce({ kind, rtpParameters });
            room.producers.set(producer.id, { producer, socketId: socket.id, userId: socket.user.user_id, name: socket.user.name });

            producer.on('transportclose', () => {
                producer.close();
                room.producers.delete(producer.id);
            });

            if (callback) callback({ id: producer.id });

            // Broadcast to other users in the room
            socket.to(session_id).emit('session_newProducer', {
                producerId: producer.id,
                socketId: socket.id,
                userId: socket.user.user_id,
                name: socket.user.name
            });
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_force_mute', async ({ session_id, userIdToMute }) => {
        try {
            const [check] = await db.execute('SELECT host_id FROM session WHERE session_id=?', [session_id]);
            if (!check[0] || check[0].host_id !== socket.user.user_id) return;

            const room = await getOrCreateSessionRoom(session_id);
            for (const [producerId, pData] of room.producers.entries()) {
                if (pData.userId === userIdToMute) {
                    await pData.producer.pause();
                    io.to(pData.socketId).emit('session_you_were_muted_by_host');
                    break;
                }
            }
        } catch (err) {
            console.error('Error in session_force_mute', err);
        }
    });

    socket.on('session_transport-consume', async ({ session_id, transportId, producerId, rtpCapabilities }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            const router = room.router;
            const transport = room.transports.get(transportId);
            if (!transport) throw new Error(`Transport ${transportId} not found`);

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                throw new Error(`cannot consume producer ${producerId}`);
            }

            const consumer = await transport.consume({
                producerId,
                rtpCapabilities,
                paused: true
            });

            room.consumers.set(consumer.id, { consumer, socketId: socket.id });

            consumer.on('transportclose', () => {
                consumer.close();
                room.consumers.delete(consumer.id);
            });
            consumer.on('producerclose', () => {
                consumer.close();
                room.consumers.delete(consumer.id);
                socket.emit('session_producerClosed', { producerId });
            });

            if (callback) callback({
                params: {
                    id: consumer.id,
                    producerId: consumer.producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters
                }
            });
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_resume-consumer', async ({ session_id, consumerId }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            const cData = room.consumers.get(consumerId);
            if (cData) {
                await cData.consumer.resume();
            }
            if (callback) callback({});
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_getProducers', async ({ session_id }, callback) => {
        try {
            const room = await getOrCreateSessionRoom(session_id);
            const producerList = [];
            for (const [producerId, pData] of room.producers.entries()) {
                if (pData.socketId !== socket.id) {
                    producerList.push({ producerId, socketId: pData.socketId, name: pData.name });
                }
            }
            if (callback) callback({ producers: producerList });
        } catch (err) {
            console.error(err);
            if (callback) callback({ error: err.message });
        }
    });

    socket.on('session_leave_voice', ({ session_id }) => {
        cleanupSessionVoice(socket.id, session_id);
    });

    socket.on('disconnect_voice', () => {
        if (socket.current_session_id) cleanupSessionVoice(socket.id, socket.current_session_id);
    });

    socket.on('disconnect', () => {
        if (socket.current_session_id) cleanupSessionVoice(socket.id, socket.current_session_id);
    });

}


export { createSession, joinSession, getHostIdOf, setupSessionEvents }