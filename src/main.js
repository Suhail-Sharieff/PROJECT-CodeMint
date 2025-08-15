

import express, { json, urlencoded} from 'express'
import cors from "cors"
import cookieParser from "cookie-parser"
import { Server } from 'socket.io'
import { createServer } from 'http'

const app=express()
app.use(
    cors(
        {
            origin:process.env.CORS_ORIGIN
        }
    )
)
app.use(
    json()
)

//to make constant routs like some take %20, some take +, we ensure constant
app.use(
    urlencoded(
        {
            extended:true,
        }
    )
)


app.use(
    cookieParser(

    )
)




const server=createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN
    }
})
import { initSocketHandlers } from './controllers/session.controller.js'
initSocketHandlers(io);



import { userRouter } from './routes/user_routes.js'
app.use('/api/users',userRouter)


import { sessionRouter } from './routes/session_routes.js'
app.use('/api/session',sessionRouter)



import { ApiError } from './utils/api_error.js'

app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }

    // Default handler for unhandled errors
    res.status(500).json({
        status:500,
        success: false,
        message: err.message || "Internal Server Error"
    });
    throw err;
});

export {app,io}