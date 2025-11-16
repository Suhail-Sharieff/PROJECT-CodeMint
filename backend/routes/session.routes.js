import { Router } from "express";
import {verifyJWT} from "../middleware/auth.middleware.js"
import { createSession } from "../controller/session.controller.js";


const sessionRouter=Router()
sessionRouter.use(verifyJWT)

sessionRouter
.route('/createSession')
.post(createSession)


export {sessionRouter}