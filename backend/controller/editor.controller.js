import { ApiError } from "../Utils/Api_Error.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";
import axios from "axios";
import { db } from "../Utils/sql_connection.js"; 
import { produceEvent } from "../Utils/kafka_connection.js";
import { Events, Topics } from "../Utils/kafka_events.js";

const JUDGE0 = process.env.JUDGE0_ORIGIN;

const getLanguages = asyncHandler(async (req, res) => {
    try {
        const response = await axios.get(`${JUDGE0}/languages`);
        return res.status(200).json(response.data);
    } catch (err) {
        return res.status(400).json(new ApiError(400, err.message));
    }
});

const constants_body = {
    "number_of_runs": 1,
    "cpu_time_limit": 5,
    "cpu_extra_time": 1,
    "wall_time_limit": 10,
    "memory_limit": 128000,
    "stack_limit": 64000,
    "max_processes_and_or_threads": 60,
    "enable_per_process_and_thread_time_limit": true,
    "enable_per_process_and_thread_memory_limit": false,
    "max_file_size": 1024,
    "enable_network": false
};

const submitCode = asyncHandler(async (req, res) => {
    const { language_id, source_code, stdin, expected_output, question_id,isBattle=false } = req.body;
    const user_id = req.user.user_id;

    if (!language_id || !source_code) throw new ApiError(400, "language_id/source_code missing!");

    try {
        //if ruuning in coding env, ie neither a ballte nor a test, then obvuiosly queston id doent exists for it, so no need to deal with score for it
        if (!question_id) {
            const response = await axios.post(`${JUDGE0}/submissions`,
                { language_id, source_code, stdin, expected_output, ...constants_body },
                { params: { base64_encoded: false, wait: true } }
            );
            return res.status(200).json(response.data);
        }

        //----------now its a submission made in battle or a test


        let dbCases;
        if (isBattle) {
            [dbCases] = await db.execute('SELECT * FROM battlecase WHERE battle_question_id = ?', [question_id]);
        } else {
            [dbCases] = await db.execute('SELECT * FROM testcase WHERE question_id = ?', [question_id]);
        }

        if (dbCases.length === 0) return res.status(200).json({ message: "No test cases found for this question." });

        // --main execution
        let passedCount = 0;
        const promises = dbCases.map(async (testCase) => {
            try {
                const judgeRes = await axios.post(`${JUDGE0}/submissions`,
                    {
                        language_id,
                        source_code,
                        stdin: testCase.stdin,
                        expected_output: testCase.expected_output,
                        ...constants_body
                    },
                    { params: { base64_encoded: false, wait: true } }
                );

                const result = judgeRes.data;
                if (result.status.id === 3) passedCount++;

                return {
                    testCaseId: testCase.case_id,
                    status: result.status,
                    time: result.time,
                    memory: result.memory,
                    isHidden: !!testCase.is_hidden,
                    input: testCase.is_hidden ? "Hidden" : testCase.stdin,
                    expected: testCase.is_hidden ? "Hidden" : testCase.expected_output,
                    stdout: testCase.is_hidden ? "Hidden" : result.stdout,
                    stderr: result.stderr,
                    compile_output: result.compile_output
                };
            } catch (err) {
                return { status: { id: 0, description: "Runtime Error" }, stderr: err.message };
            }
        });

        const results = await Promise.all(promises);
        const questionScore = Math.round((passedCount / dbCases.length) * 100);

        // console.log(results);
        
        // console.log(`IS BATTLE: ${isBattle}`);
        

        // update scores
        if (isBattle) {
             const [battleQ] = await db.execute('SELECT battle_id FROM battle_question WHERE battle_question_id = ?', [question_id]);
            const battle_id = battleQ[0].battle_id;
           
            
            await db.execute(`
                INSERT INTO battle_submissions (battle_id, battle_question_id, user_id, code, language, score)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    code = VALUES(code),
                    language = VALUES(language),
                    score = GREATEST(score, VALUES(score)),
                    last_updated = NOW()
            `, [battle_id, question_id, user_id, source_code, language_id,questionScore]);

            const [sumRows] = await db.execute('SELECT SUM(score) as total_score FROM battle_submissions WHERE battle_id = ? AND user_id = ?', [battle_id, user_id]);
            const finalTotalScore = parseInt(sumRows[0].total_score) || 0;
            // console.log(`final total battle score=${finalTotalScore}`,sumRows);
            await produceEvent(Topics.DB_TOPIC, {
                type: Events.DB_QUERY.type,
                payload: {
                    desc: `updating battle_participant score user=${user_id}`,
                    query: `UPDATE battle_participant SET score = ? WHERE battle_id = ? AND user_id = ?`,
                    params: [finalTotalScore, battle_id, user_id]
                }
            });
            return res.status(200).json({ results, score: questionScore, type: 'battle' });

        } else {
            const [qRows] = await db.execute('SELECT test_id FROM question WHERE question_id=?', [question_id]);
            const test_id = qRows[0].test_id;

            await db.execute(`
                INSERT INTO test_submissions (test_id, question_id, user_id, code, language, score)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    code = VALUES(code),
                    language = VALUES(language),
                    score = GREATEST(score, VALUES(score)), 
                    last_updated = NOW()
            `, [test_id, question_id, user_id, source_code, language_id, questionScore]);

            const [sumRows] = await db.execute('SELECT SUM(score) as total_score FROM test_submissions WHERE test_id = ? AND user_id = ?', [test_id, user_id]);
            const finalTotalScore = parseInt(sumRows[0].total_score) || 0;
            console.log(`final total test score=${finalTotalScore}`,sumRows);
            await produceEvent(Topics.DB_TOPIC, {
                type: Events.DB_QUERY.type,
                payload: {
                    desc: `updating test_participant score user=${user_id}`,
                    query: `UPDATE test_participant SET score = ? WHERE test_id = ? AND user_id = ?`,
                    params: [finalTotalScore, test_id, user_id]
                }
            });

            return res.status(200).json({ results, score: finalTotalScore, type: 'test' });
        }

    } catch (error) {
        console.error(error);
        return res.status(400).json(new ApiError(400, "Execution failed"));
    }
});
export { getLanguages, submitCode };