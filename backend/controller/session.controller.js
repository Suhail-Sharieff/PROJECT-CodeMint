import {asyncHandler} from "../Utils/AsyncHandler.utils.js"
import {ApiError} from "../Utils/Api_Error.utils.js"
import {ApiResponse} from "../Utils/Api_Response.utils.js"
import {db} from "../Utils/sql_connection.js"

const createSession=
    async(user_id,session_id)=>{

        try{
            if(!user_id) throw new ApiError(400,`No user_id provided by SocketManager to create session!`)
            if(!session_id) throw new ApiError(400,`No session_id provided by SocketManager to create session!`)

            const query='insert into session (session_id,host_id) values(?,?)'
            const [rows]=await db.execute(query,[session_id,user_id])
            if(rows.length===0) throw new ApiError(400,"Unabe to create session!")
                
            
            
            
            
        }catch(e){
            throw new ApiError(400,e.message);
        }

    }

const joinSession=
    async(user_id,session_id)=>{
       try{
            if(!session_id) throw new ApiError(400,"Socket manager didnt provide session id to join !")
            if(!user_id) throw new ApiError(400,"Socket manager didnt provide user id to join !")

            const query='insert into session_participant(session_id,user_id) values (?,?)'
            const [rows]=await db.execute(query,[session_id,user_id])
            
            console.log(`User id = ${user_id} joined Session id = ${session_id}`);
            

       }catch(e){
            console.log(e.message);
            
       }
        
    }


export {createSession,joinSession}