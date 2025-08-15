
import { asyncHandler } from "../utils/asyncHandler.js";
import { io } from "../main.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { v4 as uuidv4 } from 'uuid';
import SERVER_LOG from "../utils/server_log.js";
import { ApiResponse } from "../utils/api_response.js";
import { ApiError } from "../utils/api_error.js";


const session_map=new Map()//map of sessionId->sessionObj
const participant=new Map()//map of socketId->{sessionId,...particiapnt}

const initSocketHandlers=(__initilaized_sock__)=>{
    io.use(verifyJWT)
    io.on('connection',(clientSocket)=>{
        console.log('Socket connected:', clientSocket.id, 'user:', clientSocket.user);
        //joining session

        clientSocket.on('joinSession',(req)=>{
            const {sessionId,email,role}=req;
            const session=session_map.get(sessionId);
            if(!session) throw new ApiError(400,"Invalid session id!")
            clientSocket.join(sessionId)
            const participant={
                id:clientSocket.id,
                email:email,
                role:role,
                jonedAt:new Date()
            }
        })
    })
}


const createSession=asyncHandler(
    (req,res)=>{
        const hostName=req.user.email;
        const sessionId=uuidv4()
        SERVER_LOG(`Creating session by ${hostName} with id:${sessionId}`)
        session_map.set(
            sessionId,
            {
                sessionId:sessionId,
                hostName:hostName,
                participantsList:[],
                code:`// Welcome students!`,
                language:'javascript',
                chat_list:[],
                createdAt:new Date(),
                joinLink:`${process.env.MAIN_URI}/session/join/${sessionId}`
            }
        )
        res.send(new ApiResponse(200,session_map.get(sessionId),"Session created successfully"))
    }
)



export {
    createSession,
    initSocketHandlers,
}