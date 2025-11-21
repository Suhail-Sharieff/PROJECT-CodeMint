import { ApiError } from "../Utils/Api_Error.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";
import axios from "axios";


const JUDGE0=process.env.JUDGE0_ORIGIN//http:localhost:2358

const getLanguages=asyncHandler(
    async(req,res)=>{
        try{
            const response=await axios.get(`${JUDGE0}/languages`)
            return res.status(200).json(response.data)
        }catch(err){
            return res.status(400).json(
                new ApiError(400,err.message)
            )
        }
    }
)


const constants_body={
    "number_of_runs": 1,
    "cpu_time_limit": 5,
    "cpu_extra_time": 1,
    "wall_time_limit": 10,
    "memory_limit": 512000,
    "stack_limit": 64000,
    "max_processes_and_or_threads": 60,
    "enable_per_process_and_thread_time_limit": true,
    "enable_per_process_and_thread_memory_limit": false,
    "max_file_size": 1024,
    "enable_network": false
};

const submitCode = asyncHandler(async (req, res) => {
    const { language_id, source_code="", stdin=null,expected_output=null } = req.body;
    if(!language_id || !source_code) throw new ApiError(400,"language_id/source_code missing!")
    try {
        const response = await axios.post(`${JUDGE0}/submissions`, 
        //body
        {
            language_id,
            source_code,
            stdin,
            expected_output,
            ...constants_body
        }, 
        {
            params: { 
                base64_encoded: false, 
                wait: true 
            }
        });

        return res.status(200).json(response.data);

    } catch (error) {
        return res.status(400).json(new ApiError(400,error.message));
    }
});



export {getLanguages,submitCode}