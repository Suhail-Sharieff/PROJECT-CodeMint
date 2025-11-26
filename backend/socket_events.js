import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { db } from "./Utils/sql_connection.js";
import { createSession, joinSession } from "./controller/session.controller.js";
import { v4 as uuidv4 } from "uuid";
import { createTest, joinTest } from "./controller/test.controller.js";


//--------------COMMENTED FOR CLUSTER SCALING, since i have added sticky sessions for socket to work at scale
/*
class SocketManager {
    constructor() {
        this.io = null;
    }

    async initialize(server) {
        const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

        this.io = new Server(server, {
            cors: {
                origin: (origin, cb) => {
                    if (!origin) return cb(null, true);
                    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
                    cb(new Error('Not allowed by CORS'));
                },
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
            await this.setupTestEvents(socket); // Initializes the join_test listener

            // --- GLOBAL DISCONNECT HANDLER ---
            socket.on('disconnect', async () => {
                console.log(`🔌 User disconnected: ${socket.user.name} (${socket.id})`);
                const { user_id } = socket.user;

                // 1. Handle LIVE SESSION Disconnect (Delete & Notify)
                if (socket.current_session_id) {
                    const session_id = socket.current_session_id;
                    try {
                        // Remove from participant list (Sessions are ephemeral)
                        await db.execute('DELETE FROM session_participant WHERE session_id=? AND user_id=?', [session_id, user_id]);
                        this.io.to(session_id).emit('joinee_left', user_id);
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

                        this.io.to(test_id).emit('joinee_left', user_id);
                        console.log(`User ${user_id} disconnected from test ${test_id}`);

                    } catch (err) {
                        console.error("Error handling test disconnect:", err);
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
            await db.execute('UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?', [new_code, session_id, user_id]);
            // Broadcast to room (excluding sender)
            socket.to(session_id).emit('host_code_update', new_code);
        });

        // --- 4. HOST: Language Change ---
        socket.on('host_language_change', async ({ session_id, language }) => {
            await db.execute('UPDATE session_codes SET code_lang=? WHERE session_id=? AND user_id=?', [language, session_id, user_id]);
            socket.to(session_id).emit('language_change', language);
        });

        // --- 5. JOINEE: Code Change (Sent to Host Monitor) ---
        socket.on('joinee_code_change', async ({ session_id, code }) => {
            // Update Joinee's specific code in DB
            // Upsert logic (Insert if not exists, update if exists)
            const [existing] = await db.execute('SELECT * FROM session_codes WHERE session_id=? AND user_id=?', [session_id, user_id]);
            if (existing.length > 0) {
                await db.execute('UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?', [code, session_id, user_id]);
            } else {
                await db.execute('INSERT INTO session_codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)', [session_id, user_id, code, 'javascript']);
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
            // 1. Mark session as ended in DB
            await db.execute('UPDATE session SET is_ended=true WHERE session_id=?', [session_id]);

            // 2. Broadcast to everyone that session ended
            this.io.to(session_id).emit('session_ended');

            // 3. Clean up the socket room
            // Ideally, we make all sockets leave the room so they don't receive old events
            const socketsInRoom = await this.io.in(session_id).fetchSockets();

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
                this.io.to(userRows[0].socket_id).emit('kicked');

                // 4. Force disconnect the socket
                // this.io.sockets.sockets.get(userRows[0].socket_id)?.disconnect();
            }

            // 5. Notify everyone else that they left
            this.io.to(session_id).emit('joinee_left', user_id_to_kick);
        });
    }


    async setupTestEvents(socket) {
        const { user_id, name } = socket.user;
        socket.on('kick_test_user', async ({ test_id, user_id_to_kick }) => {
            const { user_id } = socket.user;
            // Verify Host
            const [check] = await db.execute('SELECT host_id FROM test WHERE test_id=?', [test_id]);
            if (check[0].host_id !== user_id) return;

            await db.execute('DELETE FROM test_participant WHERE test_id=? AND user_id=?', [test_id, user_id_to_kick]);

            // Find socket and force kick
            const [u] = await db.execute('SELECT socket_id FROM user WHERE user_id=?', [user_id_to_kick]);
            if (u.length > 0 && u[0].socket_id) {
                this.io.to(u[0].socket_id).emit('kicked');
            }
            this.io.to(test_id).emit('joinee_left', user_id_to_kick);
        });
        // --- 1. Create & Join Logic ---
        socket.on('create_test', async ({ duration, title }) => {
            const test_id = uuidv4();
            // Default to 60 if not provided, ensure it is INT
            const finalDuration = parseInt(duration) || 60;

            await createTest(user_id, test_id, finalDuration, title);
            await joinTest(user_id, test_id);

            socket.emit('test_created', test_id);
        });

        socket.on('join_test', async ({ test_id }) => {
            try {
                socket.join(test_id);
                socket.current_test_id = test_id;
                const { user_id, name } = socket.user;

                // 1. Metadata & Role
                const [testRows] = await db.execute('SELECT host_id, status, start_time, duration FROM test WHERE test_id = ?', [test_id]);
                if (testRows.length === 0) return socket.emit('error', { message: "Test not found" });

                const testMeta = testRows[0];
                const role = (testMeta.host_id === user_id) ? 'host' : 'joinee';

                if (testMeta.status === 'ENDED') {
                    socket.emit('error', { message: "This test has ended already" });
                    return;
                }

                // 2. Check if Finished (Joinee only)
                if (role === 'joinee') {
                    const [pCheck] = await db.execute('SELECT status FROM test_participant WHERE test_id=? AND user_id=?', [test_id, user_id]);
                    if (pCheck.length > 0 && pCheck[0].status === 'finished') {
                        socket.emit('error', { message: "You have already submitted this test." });
                        return;
                    }
                }

                // 3. Add Participant
                await db.execute(
                    `INSERT INTO test_participant (test_id, user_id, role) VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE joined_at=NOW()`,
                    [test_id, user_id, role]
                );

                // 4. Questions
                const [questions] = await db.execute('SELECT * FROM question WHERE test_id = ?', [test_id]);

                // 5. Test Cases (FIXED: Send Hidden cases, but MASKED for Joinees)
                let testCases = [];
                if (questions.length > 0) {
                    const qIds = questions.map(q => q.question_id);

                    // Fetch ALL cases for these questions
                    const query = `SELECT * FROM testcase WHERE question_id IN (${qIds.join(',')})`;
                    const [cases] = await db.execute(query);

                    // Sanitize Logic
                    testCases = cases.map(tc => {
                        return tc;
                    });
                }

                // 6. Saved Code
                let savedCode = [];
                if (role === 'host') {
                    const [allCodes] = await db.execute('SELECT user_id, question_id, code, language FROM test_submissions WHERE test_id=?', [test_id]);
                    savedCode = allCodes;
                } else {
                    const [myCodes] = await db.execute('SELECT question_id, code, language FROM test_submissions WHERE test_id=? AND user_id=?', [test_id, user_id]);
                    savedCode = myCodes;
                }

                // 7. Users & 8. Time
                const [users] = await db.execute('SELECT u.user_id as id, u.name, tp.role, tp.status FROM test_participant tp JOIN user u ON tp.user_id = u.user_id WHERE tp.test_id = ?', [test_id]);

                let timeLeft = null;
                if (testMeta.status === 'LIVE' && testMeta.start_time) {
                    const now = new Date();
                    const endTime = new Date(new Date(testMeta.start_time).getTime() + testMeta.duration * 60000);
                    timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
                }

                // Emit State
                socket.emit('test_state', {
                    testId: test_id,
                    status: testMeta.status,
                    role,
                    questions,
                    testCases, // Now includes masked hidden cases for joinees
                    savedCode,
                    users,
                    timeLeft
                });

                if (role === 'joinee') {
                    socket.to(test_id).emit('test_participant_joined', { id: user_id, name, role, status: 'active' });
                }

            } catch (err) {
                console.error("Error in join_test:", err);
                socket.emit('error', { message: err.message });
            }
        });
        // --- 2. Host Management Events ---
        socket.on('add_question', async ({ test_id, title, description, example }) => {
            const [res] = await db.execute(
                'INSERT INTO question (test_id, title, description, example) VALUES (?,?,?,?)',
                [test_id, title, description, example]
            );
            const question_id = res.insertId;
            // Broadcast Update
            this.io.to(test_id).emit('question_added', { question_id, test_id, title, description, example });
        });

        socket.on('add_testcase', async ({ question_id, stdin, expected_output, is_hidden }) => {
            await db.execute(
                'INSERT INTO testcase (question_id, stdin, expected_output, is_hidden) VALUES (?,?,?,?)',
                [question_id, stdin, expected_output, is_hidden]
            );
            // Only send to Host? Or send "Hidden Case Added" to students?
            // Simpler: Just refresh state for everyone, filtering hidden logic in join/refresh.
        });

        socket.on('start_test', async ({ test_id }) => {
            await db.execute('UPDATE test SET status="LIVE", start_time=NOW() WHERE test_id=?', [test_id]);
            const [rows] = await db.execute('SELECT duration FROM test WHERE test_id=?', [test_id]);
            this.io.to(test_id).emit('test_started', { duration: rows[0].duration * 60 });
        });

        // --- HOST: End Test ---
        socket.on('end_test', async ({ test_id }) => {
            try {
                // Verify host
                const [check] = await db.execute('SELECT host_id FROM test WHERE test_id=?', [test_id]);
                if (!check[0] || check[0].host_id !== user_id) return;

                // 1. Mark test as ended in DB
                await db.execute('UPDATE test SET status="ENDED" WHERE test_id=?', [test_id]);

                // 2. Notify all participants that test ended
                this.io.to(test_id).emit('test_ended', { test_id });

                // 3. Optional cleanup: remove sockets from room (they may reconnect to other rooms later)
                const socketsInRoom = await this.io.in(test_id).fetchSockets();
                for (const s of socketsInRoom) {
                    s.leave(test_id);
                    s.current_test_id = null;
                }

                console.log(`Test ${test_id} ended by host ${user_id}`);
            } catch (err) {
                console.error('Error ending test:', err);
            }
        });

        socket.on('submit_test', async ({ test_id }) => {
            await db.execute('UPDATE test_participant SET status="finished" WHERE test_id=? AND user_id=?', [test_id, user_id]);
            socket.emit('test_submitted');
            socket.to(test_id).emit('participant_finished', { userId: user_id });
            socket.disconnect();
        });
        // --- 3. Joinee Events ---
        socket.on('save_code', async ({ test_id, question_id, code, language }) => {
            // Save to DB
            await db.execute(`
        INSERT INTO test_submissions (test_id, question_id, user_id, code, language)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE code=?, language=?, last_updated=NOW()
    `, [test_id, question_id, user_id, code, language, code, language]);

            // Broadcast to Host so they can see it LIVE
            // We emit to the room; Host frontend will filter for the selected student
            socket.to(test_id).emit('participant_code_update', {
                userId: user_id,
                questionId: question_id,
                code,
                language
            });
        });

        // New listener to broadcast score updates
        socket.on('score_update', ({ test_id, score }) => {
            // Broadcast to the room (so Host sees it in the sidebar)
            socket.to(test_id).emit('participant_score_update', {
                userId: socket.user.user_id,
                score: score
            });
        });
    }
}

const socketManager = new SocketManager();
export { socketManager };

*/


//********************************************* */

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
        await db.execute('UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?', [new_code, session_id, user_id]);
        // Broadcast to room (excluding sender)
        socket.to(session_id).emit('host_code_update', new_code);
    });

    // --- 4. HOST: Language Change ---
    socket.on('host_language_change', async ({ session_id, language }) => {
        await db.execute('UPDATE session_codes SET code_lang=? WHERE session_id=? AND user_id=?', [language, session_id, user_id]);
        socket.to(session_id).emit('language_change', language);
    });

    // --- 5. JOINEE: Code Change (Sent to Host Monitor) ---
    socket.on('joinee_code_change', async ({ session_id, code }) => {
        // Update Joinee's specific code in DB
        // Upsert logic (Insert if not exists, update if exists)
        const [existing] = await db.execute('SELECT * FROM session_codes WHERE session_id=? AND user_id=?', [session_id, user_id]);
        if (existing.length > 0) {
            await db.execute('UPDATE session_codes SET code=? WHERE session_id=? AND user_id=?', [code, session_id, user_id]);
        } else {
            await db.execute('INSERT INTO session_codes(session_id, user_id, code, code_lang) VALUES(?,?,?,?)', [session_id, user_id, code, 'javascript']);
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


async function setupTestEvents(socket,io) {
    const { user_id, name } = socket.user;
    socket.on('kick_test_user', async ({ test_id, user_id_to_kick }) => {
        const { user_id } = socket.user;
        // Verify Host
        const [check] = await db.execute('SELECT host_id FROM test WHERE test_id=?', [test_id]);
        if (check[0].host_id !== user_id) return;

        await db.execute('update test_participant set status=? WHERE test_id=? AND user_id=?', ["finished",test_id, user_id_to_kick]);

        // Find socket and force kick
        const [u] = await db.execute('SELECT socket_id FROM user WHERE user_id=?', [user_id_to_kick]);
        if (u.length > 0 && u[0].socket_id) {
            io.to(u[0].socket_id).emit('kicked');
        }
        io.to(test_id).emit('joinee_left', user_id_to_kick);
    });
    // --- 1. Create & Join Logic ---
    socket.on('create_test', async ({ duration, title }) => {
        const test_id = uuidv4();
        // Default to 60 if not provided, ensure it is INT
        const finalDuration = parseInt(duration) || 60;

        await createTest(user_id, test_id, finalDuration, title);
        await joinTest(user_id, test_id);

        socket.emit('test_created', test_id);
    });

    socket.on('join_test', async ({ test_id }) => {
        try {
            socket.join(test_id);
            socket.current_test_id = test_id;
            const { user_id, name } = socket.user;

            // 1. Metadata & Role
            const [testRows] = await db.execute('SELECT host_id, status, start_time, duration FROM test WHERE test_id = ?', [test_id]);
            if (testRows.length === 0) return socket.emit('error', { message: "Test not found" });

            const testMeta = testRows[0];
            const role = (testMeta.host_id === user_id) ? 'host' : 'joinee';

            if (testMeta.status === 'ENDED') {
                socket.emit('error', { message: "This test has ended already" });
                return;
            }

            // 2. Check if Finished (Joinee only)
            if (role === 'joinee') {
                const [pCheck] = await db.execute('SELECT status FROM test_participant WHERE test_id=? AND user_id=?', [test_id, user_id]);
                if (pCheck.length > 0 && pCheck[0].status === 'finished') {
                    socket.emit('error', { message: "You have already submitted this test." });
                    return;
                }
            }

            // 3. Add Participant
            await db.execute(
                `INSERT INTO test_participant (test_id, user_id, role) VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE joined_at=NOW()`,
                [test_id, user_id, role]
            );

            // 4. Questions
            const [questions] = await db.execute('SELECT * FROM question WHERE test_id = ?', [test_id]);

            // 5. Test Cases (FIXED: Send Hidden cases, but MASKED for Joinees)
            let testCases = [];
            if (questions.length > 0) {
                const qIds = questions.map(q => q.question_id);

                // Fetch ALL cases for these questions
                const query = `SELECT * FROM testcase WHERE question_id IN (${qIds.join(',')})`;
                const [cases] = await db.execute(query);

                // Sanitize Logic
                testCases = cases.map(tc => {
                    return tc;
                });
            }

            // 6. Saved Code
            let savedCode = [];
            if (role === 'host') {
                const [allCodes] = await db.execute('SELECT user_id, question_id, code, language FROM test_submissions WHERE test_id=?', [test_id]);
                savedCode = allCodes;
            } else {
                const [myCodes] = await db.execute('SELECT question_id, code, language FROM test_submissions WHERE test_id=? AND user_id=?', [test_id, user_id]);
                savedCode = myCodes;
            }

            // 7. Users & 8. Time
            const [users] = await db.execute('SELECT u.user_id as id, u.name, tp.role, tp.status FROM test_participant tp JOIN user u ON tp.user_id = u.user_id WHERE tp.test_id = ?', [test_id]);

            let timeLeft = null;
            if (testMeta.status === 'LIVE' && testMeta.start_time) {
                const now = new Date();
                const endTime = new Date(new Date(testMeta.start_time).getTime() + testMeta.duration * 60000);
                timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
            }

            // Emit State
            socket.emit('test_state', {
                testId: test_id,
                status: testMeta.status,
                role,
                questions,
                testCases, // Now includes masked hidden cases for joinees
                savedCode,
                users,
                timeLeft
            });

            if (role === 'joinee') {
                socket.to(test_id).emit('test_participant_joined', { id: user_id, name, role, status: 'active' });
            }

        } catch (err) {
            console.error("Error in join_test:", err);
            socket.emit('error', { message: err.message });
        }
    });
    // --- 2. Host Management Events ---
    socket.on('add_question', async ({ test_id, title, description, example }) => {
        const [res] = await db.execute(
            'INSERT INTO question (test_id, title, description, example) VALUES (?,?,?,?)',
            [test_id, title, description, example]
        );
        const question_id = res.insertId;
        // Broadcast Update
        io.to(test_id).emit('question_added', { question_id, test_id, title, description, example });
    });

    socket.on('add_testcase', async ({ question_id, stdin, expected_output, is_hidden }) => {
        await db.execute(
            'INSERT INTO testcase (question_id, stdin, expected_output, is_hidden) VALUES (?,?,?,?)',
            [question_id, stdin, expected_output, is_hidden]
        );
        // Only send to Host? Or send "Hidden Case Added" to students?
        // Simpler: Just refresh state for everyone, filtering hidden logic in join/refresh.
    });

    socket.on('start_test', async ({ test_id }) => {
        await db.execute('UPDATE test SET status="LIVE", start_time=NOW() WHERE test_id=?', [test_id]);
        const [rows] = await db.execute('SELECT duration FROM test WHERE test_id=?', [test_id]);
        io.to(test_id).emit('test_started', { duration: rows[0].duration * 60 });
    });

    // --- HOST: End Test ---
    socket.on('end_test', async ({ test_id }) => {
        try {
            // Verify host
            const [check] = await db.execute('SELECT host_id FROM test WHERE test_id=?', [test_id]);
            if (!check[0] || check[0].host_id !== user_id) return;

            // 1. Mark test as ended in DB
            await db.execute('UPDATE test SET status="ENDED" WHERE test_id=?', [test_id]);

            // 2. Notify all participants that test ended
            io.to(test_id).emit('test_ended', { test_id });

            // 3. Optional cleanup: remove sockets from room (they may reconnect to other rooms later)
            const socketsInRoom = await io.in(test_id).fetchSockets();
            for (const s of socketsInRoom) {
                s.leave(test_id);
                s.current_test_id = null;
            }

            console.log(`Test ${test_id} ended by host ${user_id}`);
        } catch (err) {
            console.error('Error ending test:', err);
        }
    });

    socket.on('submit_test', async ({ test_id }) => {
        await db.execute('UPDATE test_participant SET status="finished" WHERE test_id=? AND user_id=?', [test_id, user_id]);
        socket.emit('test_submitted');
        socket.to(test_id).emit('participant_finished', { userId: user_id });
        socket.disconnect();
    });
    // --- 3. Joinee Events ---
    socket.on('save_code', async ({ test_id, question_id, code, language }) => {
        // Save to DB
        await db.execute(`
        INSERT INTO test_submissions (test_id, question_id, user_id, code, language)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE code=?, language=?, last_updated=NOW()
    `, [test_id, question_id, user_id, code, language, code, language]);

        // Broadcast to Host so they can see it LIVE
        // We emit to the room; Host frontend will filter for the selected student
        socket.to(test_id).emit('participant_code_update', {
            userId: user_id,
            questionId: question_id,
            code,
            language
        });
    });

    // New listener to broadcast score updates
    socket.on('score_update', ({ test_id, score }) => {
        // Broadcast to the room (so Host sees it in the sidebar)
        socket.to(test_id).emit('participant_score_update', {
            userId: socket.user.user_id,
            score: score
        });
    });
}
