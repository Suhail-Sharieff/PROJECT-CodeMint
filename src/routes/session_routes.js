import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createSession } from "../controllers/session.controller.js";



const sessionRouter=Router()

sessionRouter.use(verifyJWT);//verify jswt before routing everywhere


sessionRouter.route('/createSession').post(createSession)


export{
    sessionRouter
}

