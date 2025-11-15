import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"



const app = express()


app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Default to frontend port for development
        credentials: true, // THIS IS CRITICAL for cookies to work
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        preflightContinue: false,
        optionsSuccessStatus: 204
    })
)


//Allow json data transfer within app

app.use(
    express.json(
        
    )
)

//to make constant routs like some take %20, some take +, we ensure constant
app.use(
    express.urlencoded(
        {
            extended:true,
        }
    )
)


//direct fetchable files
app.use(
    express.static(
        "public"
    )
)

app.use(
    cookieParser(

    )
)
export const inspector = (req, res, next) => {
    console.log(`🔎 Route [${req.method}] ${req.originalUrl}`);
        console.log(`📦 Body:`, req.body);
    next();
};

app.use(inspector)



//configuring routes
import {authRouter} from "./routes/auth.routes.js"
app.use('/auth',authRouter)


import { ApiError } from "./Utils/Api_Error.utils.js"
app.use((err, req, res, next) => {
    console.log(`ERROR: ${err.message}`);
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }

    // Default handler for unhandled errors
    console.log(`ERROR: ${err}`);
    res.status(500).json({
        status:500,
        success: false,
        message: err.message || "Internal Server Error"
    });
    throw err;
});

import path from "path";
app.use('/', (req, res) => {
    res.status(200).sendFile(path.join(process.cwd(), 'index.html'));
});

export {app}