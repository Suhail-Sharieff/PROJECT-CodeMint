import { Router } from "express";
import {verifyJWT} from "../middleware/auth.middleware.js"
import { createSession, getHostIdOf } from "../controller/session.controller.js";
import { rateLimmiter } from "../middleware/rateLimitter.middleware.js";


const sessionRouter=Router()
sessionRouter.use(verifyJWT,rateLimmiter)

sessionRouter
.route('/createSession')
.post(createSession)

sessionRouter
.route('/getHostIdOf/:session_id')
.get(getHostIdOf)


export {sessionRouter}