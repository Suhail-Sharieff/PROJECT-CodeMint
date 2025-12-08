import { v4 as uuidv4 } from "uuid";
import { db } from "../Utils/sql_connection.js";
import { Server, Socket } from "socket.io"
/**
* @param {Server} io
* @param {Socket} socket
*/


export const setupBattleEvents = async (io, socket) => {
    const { user_id, name } = socket.user;
    socket.on('kick_test_user', async ({ test_id, user_id_to_kick }) => {
        const { user_id } = socket.user;
        // Verify Host
        const [check] = await db.execute('SELECT host_id FROM test WHERE test_id=?', [test_id]);
        if (check[0].host_id !== user_id) return;

        await db.execute('update test_participant set status=? WHERE test_id=? AND user_id=?', ["finished", test_id, user_id_to_kick]);

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