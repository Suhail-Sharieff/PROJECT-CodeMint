import { ApiError } from "../Utils/Api_Error.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";
import axios from "axios";
import { db } from "../Utils/sql_connection.js"; // Import DB
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
    const { language_id, source_code, stdin, expected_output, question_id } = req.body;

    // NOTE: Ensure your route middleware adds user info (verifyJWT)
    // If this endpoint is public, you'll need to pass user_id in body (less secure)
    const user_id = req.user.user_id;

    if (!language_id || !source_code) throw new ApiError(400, "language_id/source_code missing!");

    try {
        let results = [];

        // --- SCENARIO 1: Custom Run (Not part of scoring) ---
        if (!question_id) {
            const response = await axios.post(`${JUDGE0}/submissions`,
                { language_id, source_code, stdin, expected_output, ...constants_body },
                { params: { base64_encoded: false, wait: true } }
            );
            return res.status(200).json(response.data);
        }

        // --- SCENARIO 2: Test Submission (Scoring) ---
        // 1. Fetch Test Cases
        const [dbCases] = await db.execute('SELECT * FROM testcase WHERE question_id = ?', [question_id]);

        if (dbCases.length === 0) return res.status(200).json({ message: "No test cases found." });

        // 2. Run All Cases
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

                // Count Passes (Status ID 3 = Accepted)
                if (result.status.id === 3) {
                    passedCount++;
                }



                // Sanitize Hidden Cases
                if (testCase.is_hidden) {
                    return {
                        testCaseId: testCase.case_id,
                        status: result.status,
                        time: result.time,
                        memory: result.memory,
                        isHidden: true,
                        input: "Hidden Input",
                        expected: "Hidden Expected",
                        stdout: "Hidden Output",
                        stderr: null
                    };
                } else {
                    return {
                        testCaseId: testCase.case_id,
                        status: result.status,
                        time: result.time,
                        memory: result.memory,
                        isHidden: false,
                        input: testCase.stdin,
                        expected: testCase.expected_output,
                        stdout: result.stdout,
                        stderr: result.stderr,
                        compile_output: result.compile_output
                    };
                }
            } catch (err) {
                return { status: { id: 0, description: "Runtime Error" }, stderr: err.message };
            }
        });

        results = await Promise.all(promises);

        // 3. Update Score in DB (Logic: Keep Highest Score)
        // ... (inside submitCode, after results = await Promise.all(promises)) ...

        let finalTotalScore = 0; // This will return the TOTAL test score

        // 3. Update Score Logic
        if (user_id) {
            const [qRows] = await db.execute('SELECT test_id FROM question WHERE question_id=?', [question_id]);

            if (qRows.length > 0) {
                const test_id = qRows[0].test_id;
                const totalCases = dbCases.length;

                // A. Calculate Score for THIS Question
                let questionScore = 0;
                if (totalCases > 0) {
                    questionScore = Math.round((passedCount / totalCases) * 100);
                }

                // B. Save this Question's Score to 'test_submissions'
                // We use GREATEST here to ensure we don't overwrite a high score with a low one 
                // if they retry the same question and fail.

                // Note: We also save the code here to ensure persistence
                await db.execute(`
                    INSERT INTO test_submissions (test_id, question_id, user_id, code, language, score)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        code = VALUES(code),
                        language = VALUES(language),
                        score = GREATEST(score, VALUES(score)), 
                        last_updated = NOW()
                `, [test_id, question_id, user_id, source_code, language_id, questionScore]);

                // C. Calculate TOTAL Score (Sum of all questions for this test)
                const [sumRows] = await db.execute(`
                    SELECT SUM(score) as total_score 
                    FROM test_submissions 
                    WHERE test_id = ? AND user_id = ?
                `, [test_id, user_id]);

                finalTotalScore = parseInt(sumRows[0].total_score) || 0;

                // D. Update the Main Participant Table with the SUM
                // await db.execute(`
                //     UPDATE test_participant 
                //     SET score = ? 
                //     WHERE test_id = ? AND user_id = ?
                // `, [finalTotalScore, test_id, user_id]);
                await produceEvent(Topics.DB_TOPIC, {
                    type: Events.DB_QUERY.type,
                    payload: {
                        desc: `updating test_participant's score user_id=${user_id} test_id=${test_id}`,
                        query: `
                        UPDATE test_participant 
                        SET score = ? 
                        WHERE test_id = ? AND user_id = ?`,
                        params:[finalTotalScore, test_id, user_id]
                    }
                })
            }

            console.log(`User ${user_id} - Question Score: ${Math.round((passedCount / dbCases.length) * 100)}, Total Test Score: ${finalTotalScore}`);
        }

        // Return results AND the new Total Score
        return res.status(200).json({
            results: results,
            score: finalTotalScore // Frontend can now update the total score display
        });

    } catch (error) {
        console.log(error);

        return res.status(400).json(new ApiError(400, error));
    }
});
export { getLanguages, submitCode };