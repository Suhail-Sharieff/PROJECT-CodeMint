import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getLanguages, submitCode } from "../controller/editor.controller.js";
import { rateLimmiter } from "../middleware/rateLimitter.middleware.js";

const editorRoute=Router()

editorRoute.use(verifyJWT,rateLimmiter)

editorRoute
.route('/getLanguages')
.get(getLanguages)


editorRoute
.route('/submitCode')
.post(submitCode)



export {editorRoute}