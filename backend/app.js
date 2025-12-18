import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"



const app = express()


// at top of file already: import cors from "cors"
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser tools (curl, server->server) when origin is undefined
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0) {
      // if no list provided, be permissive for dev only (optional)
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // otherwise reject
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


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
import { sessionRouter } from "./routes/session.routes.js"
app.use('/session',sessionRouter)
import { editorRoute } from "./routes/editor.routes.js"
app.use('/editor',editorRoute)
import { testRouter } from "./routes/test.routes.js"
app.use('/test',testRouter)
import { battleRouter } from "./routes/battle.routes.js";
app.use('/battle',battleRouter)

import { testApi } from "./Utils/kafka_connection.js";
app.use('/suhail',testApi)

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