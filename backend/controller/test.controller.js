import { db } from "../Utils/sql_connection.js";
import { ApiResponse } from "../Utils/Api_Response.utils.js";
import { ApiError } from "../Utils/Api_Error.utils.js";


const createTest = async (user_id, test_id,duration=10) => {
    try {
        if (!user_id) throw new ApiError(400, `No user_id provided by SocketManager to create test!`)
        if (!test_id) throw new ApiError(400, `No test_id provided by SocketManager to create test!`)

        const query = 'insert into test (test_id,host_id,duration) values(?,?,?)'
        const [rows] = await db.execute(query, [test_id,user_id,duration])
        if (rows.length === 0) throw new ApiError(400, "Unabe to create test!")





    } catch (e) {
        throw new ApiError(400, e.message);
    }
}
const joinTest=
    async(user_id,test_id)=>{
       try{
            if(!test_id) throw new ApiError(400,"Socket manager didnt provide test_id to join test!")
            if(!user_id) throw new ApiError(400,"Socket manager didnt provide user_id to join test!")

            const query='insert into test_participant(test_id,user_id) values (?,?)'
            const [rows]=await db.execute(query,[test_id,user_id])
            
            console.log(`User id = ${user_id} joined Test id = ${test_id}`);
            

       }catch(e){
           throw new ApiError(400, e.message);
       }
        
    }


export {createTest,joinTest}
