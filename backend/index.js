import { configDotenv } from "dotenv"
configDotenv()

import express from "express"
const app=express()

import cors from "cors"
app.use(cors({origin:"*"}))

app.get("/",(req,res)=>{res.status(200).json("Backend running..")})


import {createServer} from "http"
const server=createServer(app)
import { Server } from "socket.io"
const io = new Server(server);

server.listen(process.env.PORT,()=>{
    console.log(`Server running @ http://localhost:${process.env.PORT}`);
});

io.on('connection',(sock)=>{
    console.log(sock.id);
})