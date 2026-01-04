import { v4 as uuidv4 } from "uuid";
import { db } from "../Utils/sql_connection.js";
import { Server, Socket } from "socket.io"
import { ApiError } from "../Utils/Api_Error.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";
import { ApiResponse } from "../Utils/Api_Response.utils.js";


export const getBattlesByMe = asyncHandler(
    async (req, res) => {
        try {
            const { user_id } = req.user;
            if (!user_id) throw new ApiError(400, 'Unauthorized acess!')
            const [rows] = await db.execute('select * from battle where host_id=?', [user_id])
            return res.status(200).json(rows)
        } catch (err) {
            return res.status(400).json(new ApiError(400, err.message))
        }
    }
);

export const getBattlesAttendedByMe=asyncHandler(
    async(req,res)=>{
        try{
            const {user_id}=req.user
            const query=`WITH cte AS (
                SELECT 
                    x.battle_id, x.user_id, z.name,z.email,x.role, x.status AS user_status, x.joined_at, x.score,
                    y.host_id, y.title, y.status AS battle_status, y.created_at, y.duration, y.start_time
                FROM battle_participant x 
                LEFT JOIN battle y ON x.battle_id = y.battle_id 
                LEFT JOIN user z ON x.user_id=z.user_id
                WHERE  x.user_id =? and x.user_id!=y.host_id
            )
            SELECT 
                cte.battle_id, cte.user_id, cte.name,cte.email,cte.role, cte.user_status, cte.joined_at, cte.score, 
                cte.title, cte.duration, cte.start_time,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'battle_question_id', x.battle_question_id,
                        'battle_question_title',m.title,
                        'battle_question_description',m.description,
                        'battle_question_example',m.example,
                        'code', x.code,
                        'language', x.language,
                        'last_updated', x.last_updated,
                        'time_taken_to_solve', TIMEDIFF(TIME(x.last_updated), TIME(cte.start_time)),
						'score_for_this_question',x.score
                    )
                ) as submissions
            FROM cte LEFT JOIN battle_submissions x ON cte.battle_id = x.battle_id AND cte.user_id = x.user_id LEFT JOIN battle_question m ON x.battle_question_id = m.battle_question_id
            GROUP BY cte.battle_id, cte.user_id, cte.role, cte.user_status, cte.joined_at, cte.score, cte.title, cte.duration, cte.start_time
            ORDER BY cte.score DESC;`
            const [rows]=await db.execute(query,[user_id])
            return res.status(200).json(new ApiResponse(200,rows,`Fetched battles user_id=${user_id} attended !`))
        }catch(err){
            return res.status(400).json(new ApiError(400,err.message))
        }
    }
)

export const getBattleAnalysis = asyncHandler(
    async (req, res) => {
        try {
            const { battle_id } = req.query
            if (!battle_id) throw new ApiError(400, `battle_id not provided in params for its analysis!`)
            const query = `WITH cte AS (
                SELECT 
                    x.battle_id, x.user_id, z.name,z.email,x.role, x.status AS user_status, x.joined_at, x.score,
                    y.host_id, y.title, y.status AS battle_status, y.created_at, y.duration, y.start_time
                FROM battle_participant x 
                LEFT JOIN battle y ON x.battle_id = y.battle_id 
                LEFT JOIN user z ON x.user_id=z.user_id
                WHERE x.battle_id = ? AND x.user_id != y.host_id
            )
            SELECT 
                cte.battle_id, cte.user_id, cte.name,cte.email,cte.role, cte.user_status, cte.joined_at, cte.score, 
                cte.title, cte.duration, cte.start_time,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'battle_question_id', x.battle_question_id,
                        'code', x.code,
                        'language', x.language,
                        'last_updated', x.last_updated,
                        'time_taken_to_solve', TIMEDIFF(TIME(x.last_updated), TIME(cte.start_time))
                    )
                ) as submissions
            FROM cte 
            LEFT JOIN battle_submissions x ON cte.battle_id = x.battle_id AND cte.user_id = x.user_id
            GROUP BY cte.battle_id, cte.user_id, cte.role, cte.user_status, cte.joined_at, cte.score, cte.title, cte.duration, cte.start_time
            ORDER BY cte.score DESC;`
            const [rows] = await db.execute(query, [battle_id])
            return res.status(200).json(new ApiResponse(200, rows, `Fetched battle anaysis of battle_id=${battle_id}`))
        } catch (error) {
            return res.status(400).json(new ApiError(400, error.message))
        }
    }
)


const createbattle = async (user_id, battle_id, duration = 10, title) => {
    try {
        if (!user_id) throw new ApiError(400, `No user_id provided by SocketManager to create battle!`)
        if (!battle_id) throw new ApiError(400, `No battle_id provided by SocketManager to create battle!`)

        const query = 'insert into battle (battle_id,host_id,duration,title) values(?,?,?,?)'
        const [rows] = await db.execute(query, [battle_id, user_id, duration, title])
        if (rows.length === 0) throw new ApiError(400, "Unabe to create battle!")





    } catch (e) {
        throw new ApiError(400, e.message);
    }
}
const joinbattle =
    async (user_id, battle_id) => {
        try {
            if (!battle_id) throw new ApiError(400, "Socket manager didnt provide battle_id to join battle!")
            if (!user_id) throw new ApiError(400, "Socket manager didnt provide user_id to join battle!")

            const query = 'insert into battle_participant(battle_id,user_id) values (?,?)'
            const [rows] = await db.execute(query, [battle_id, user_id])

            console.log(`User id = ${user_id} joined battle_id = ${battle_id}`);


        } catch (e) {
            throw new ApiError(400, e.message);
        }

    }

/**
* @param {Server} io
* @param {Socket} socket
*/


export const setupBattleEvents = async (io, socket) => {
    const { user_id, name } = socket.user;
    socket.on('kick_battle_user', async ({ battle_id, user_id_to_kick }) => {
        const { user_id } = socket.user;
        // Verify Host
        const [check] = await db.execute('SELECT host_id FROM battle WHERE battle_id=?', [battle_id]);
        if (check[0].host_id !== user_id) return;

        await db.execute('update battle_participant set status=? WHERE battle_id=? AND user_id=?', ["finished", battle_id, user_id_to_kick]);

        // Find socket and force kick
        const [u] = await db.execute('SELECT socket_id FROM user WHERE user_id=?', [user_id_to_kick]);
        if (u.length > 0 && u[0].socket_id) {
            io.to(u[0].socket_id).emit('kicked');
        }
        io.to(battle_id).emit('joinee_left', user_id_to_kick);
    });
    // --- 1. Create & Join Logic ---
    socket.on('create_battle', async ({ duration, title }) => {
        const battle_id = uuidv4();
        // Default to 60 if not provided, ensure it is INT
        console.log('battle creation');

        const finalDuration = parseInt(duration) || 60;

        await createbattle(user_id, battle_id, finalDuration, title);
        await joinbattle(user_id, battle_id);

        socket.emit('battle_created', battle_id);
    });

    socket.on('join_battle', async ({ battle_id }) => {
        try {
            socket.join(battle_id);
            socket.current_battle_id = battle_id;
            const { user_id, name } = socket.user;

            // 1. Metadata & Role
            const [battleRows] = await db.execute('SELECT host_id, status, start_time, duration FROM battle WHERE battle_id = ?', [battle_id]);
            if (battleRows.length === 0) return socket.emit('error', { message: "battle not found" });

            const battleMeta = battleRows[0];
            const role = (battleMeta.host_id === user_id) ? 'host' : 'joinee';

            if (battleMeta.status === 'ENDED') {
                socket.emit('error', { message: "This battle has ended already" });
                return;
            }

            // 2. Check if Finished (Joinee only)
            if (role === 'joinee') {
                const [pCheck] = await db.execute('SELECT status FROM battle_participant WHERE battle_id=? AND user_id=?', [battle_id, user_id]);
                if (pCheck.length > 0 && pCheck[0].status === 'finished') {
                    socket.emit('error', { message: "You have already submitted this battle." });
                    return;
                }
            }

            // 3. Add Participant
            await db.execute(
                `INSERT INTO battle_participant (battle_id, user_id, role) VALUES (?, ?, ?) 
                          ON DUPLICATE KEY UPDATE joined_at=NOW()`,
                [battle_id, user_id, role]
            );

            // 4. Questions
            const [questions] = await db.execute('SELECT * FROM battle_question WHERE battle_id = ?', [battle_id]);

            // 5. battle Cases (FIXED: Send Hidden cases, but MASKED for Joinees)
            let battleCases = [];
            if (questions.length > 0) {
                const qIds = questions.map(q => q.battle_question_id);

                // Fetch ALL cases for these questions
                const query = `SELECT * FROM battlecase WHERE battle_question_id IN (${qIds.join(',')})`;
                const [cases] = await db.execute(query);

                // Sanitize Logic
                battleCases = cases.map(tc => {
                    return tc;
                });
            }

            // 6. Saved Code
            let savedCode = [];
            if (role === 'host') {
                const [allCodes] = await db.execute('SELECT user_id, battle_question_id, code, language FROM battle_submissions WHERE battle_id=?', [battle_id]);
                savedCode = allCodes;
            } else {
                const [myCodes] = await db.execute('SELECT battle_question_id, code, language FROM battle_submissions WHERE battle_id=? AND user_id=?', [battle_id, user_id]);
                savedCode = myCodes;
            }

            // 7. Users & 8. Time
            const [users] = await db.execute('SELECT u.user_id as id, u.name, tp.role, tp.status, COALESCE(SUM(bs.score), 0) as total_score FROM battle_participant tp JOIN user u ON tp.user_id = u.user_id LEFT JOIN battle_submissions bs ON bs.battle_id = tp.battle_id AND bs.user_id = tp.user_id WHERE tp.battle_id = ? GROUP BY u.user_id, u.name, tp.role, tp.status', [battle_id]);

            let timeLeft = null;
            if (battleMeta.status === 'LIVE' && battleMeta.start_time) {
                const now = new Date();
                const endTime = new Date(new Date(battleMeta.start_time).getTime() + battleMeta.duration * 60000);
                timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
            }

            // Emit State
            socket.emit('battle_state', {
                battleId: battle_id,
                status: battleMeta.status,
                role,
                questions,
                battleCases, // Now includes masked hidden cases for joinees
                savedCode,
                users,
                timeLeft,
                duration: battleMeta.duration,
            });

            if (role === 'joinee') {
                socket.to(battle_id).emit('battle_participant_joined', { id: user_id, name, role, status: 'active' });
            }

        } catch (err) {
            console.error("Error in join_battle:", err);
            socket.emit('error', { message: err.message });
        }
    });
    // --- 2. Host Management Events ---
    socket.on('add_battle_question', async ({ battle_id, title, description, example }) => {
        const [res] = await db.execute(
            'INSERT INTO battle_question (battle_id, title, description, example) VALUES (?,?,?,?)',
            [battle_id, title, description, example]
        );
        const battle_question_id = res.insertId;
        // Broadcast Update
        io.to(battle_id).emit('battle_question_added', { battle_question_id, battle_id, title, description, example });
    });

    socket.on('add_battlecase', async ({ battle_question_id, stdin, expected_output, is_hidden }) => {
        await db.execute(
            'INSERT INTO battlecase (battle_question_id, stdin, expected_output, is_hidden) VALUES (?,?,?,?)',
            [battle_question_id, stdin, expected_output, is_hidden]
        );
        // Only send to Host? Or send "Hidden Case Added" to students?
        // Simpler: Just refresh state for everyone, filtering hidden logic in join/refresh.
    });

    socket.on('start_battle', async ({ battle_id }) => {
        await db.execute('UPDATE battle SET status="LIVE", start_time=NOW() WHERE battle_id=?', [battle_id]);
        const [rows] = await db.execute('SELECT duration FROM battle WHERE battle_id=?', [battle_id]);
        io.to(battle_id).emit('battle_started', { duration: rows[0].duration * 60 });
    });

    // --- HOST: End battle ---
    socket.on('end_battle', async ({ battle_id }) => {
        try {
            // Verify host
            const [check] = await db.execute('SELECT host_id FROM battle WHERE battle_id=?', [battle_id]);
            if (!check[0] || check[0].host_id !== user_id) return;

            // 1. Mark battle as ended in DB
            await db.execute('UPDATE battle SET status="ENDED" WHERE battle_id=?', [battle_id]);

            // 2. Notify all participants that battle ended
            io.to(battle_id).emit('battle_ended', { battle_id });

            // 3. Optional cleanup: remove sockets from room (they may reconnect to other rooms later)
            const socketsInRoom = await io.in(battle_id).fetchSockets();
            for (const s of socketsInRoom) {
                s.leave(battle_id);
                s.current_battle_id = null;
            }

            console.log(`battle ${battle_id} ended by host ${user_id}`);
        } catch (err) {
            console.error('Error ending battle:', err);
        }
    });

    socket.on('submit_battle', async ({ battle_id }) => {
        await db.execute('UPDATE battle_participant SET status="finished" WHERE battle_id=? AND user_id=?', [battle_id, user_id]);
        socket.emit('battle_submitted');
        socket.to(battle_id).emit('participant_finished', { userId: user_id });
        socket.disconnect();
    });
    // --- 3. Joinee Events ---
    socket.on('save_battle_code', async (data) => {
        // Save to DB
        const { battle_id, battle_question_id, code, language } = data
        console.log(data);

        await db.execute(`
             INSERT INTO battle_submissions (battle_id, battle_question_id, user_id, code, language)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE code=?, language=?, last_updated=NOW()
         `, [battle_id, battle_question_id, user_id, code, language, code, language]);

        // Broadcast to Host so they can see it LIVE
        // We emit to the room; Host frontend will filter for the selected student
        socket.to(battle_id).emit('battle_participant_code_update', {
            userId: user_id,
            questionId: battle_question_id,
            code,
            language
        });
    });

    // New listener to broadcast score updates
    socket.on('battle_score_update', async ({ battle_id, battle_question_id, score }) => {
        // Update score for the specific question
        await db.execute('UPDATE battle_submissions SET score = ? WHERE battle_id = ? AND battle_question_id = ? AND user_id = ?', [score, battle_id, battle_question_id, socket.user.user_id]);
        
        // Calculate total score from DB
        const [sumRows] = await db.execute('SELECT SUM(score) as total_score FROM battle_submissions WHERE battle_id = ? AND user_id = ?', [battle_id, socket.user.user_id]);
        const totalScore = parseInt(sumRows[0].total_score) || 0;
        // Broadcast to the room (so Host sees it in the sidebar)
        io.to(battle_id).emit('battle_participant_score_update', {
            userId: socket.user.user_id,
            score: totalScore
        });
    });


    socket.on('solved_question_first', ({ battle_id, user_id, battle_question_id }) => {
        socket.to(battle_id).emit('move_to_next_question')
    })
}