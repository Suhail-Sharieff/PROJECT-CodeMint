import { ApiError } from "../Utils/Api_Error.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";
import axios from "axios";
import { db } from "../Utils/sql_connection.js"; // Import DB

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

    if (!language_id || !source_code) throw new ApiError(400, "language_id/source_code missing!");

    try {
        let results = [];

        // SCENARIO 1: Running specific input (e.g., Custom input in Editor)
        if (!question_id) {
            const response = await axios.post(`${JUDGE0}/submissions`, 
                { language_id, source_code, stdin, expected_output, ...constants_body },
                { params: { base64_encoded: false, wait: true } }
            );
            return res.status(200).json(response.data);
        }

       const [dbCases] = await db.execute('SELECT * FROM testcase WHERE question_id = ?', [question_id]);
        
        if (dbCases.length === 0) return res.status(200).json({ message: "No test cases found." });

        // Run all cases
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

                // === SECURITY FIX: MASK HIDDEN RESULTS ===
                if (testCase.is_hidden) {
                    return {
                        testCaseId: testCase.case_id,
                        status: result.status, // Only Pass/Fail status allowed
                        time: result.time,
                        memory: result.memory,
                        isHidden: true, // Flag for frontend UI
                        input: "Hidden Input", 
                        expected: "Hidden Expected",
                        stdout: "Hidden Output",
                        stderr: null // Hide errors too
                    };
                } else {
                    // Return normal data for visible cases
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
        return res.status(200).json(results);

    } catch (error) {
        return res.status(400).json(new ApiError(400, error.message));
    }
});

export { getLanguages, submitCode };