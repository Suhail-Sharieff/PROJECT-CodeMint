import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getLanguages, submitCode } from "../controller/editor.controller.js";

const editorRoute=Router()

editorRoute.use(verifyJWT)

editorRoute
.route('/getLanguages')
.get(getLanguages)


editorRoute
.route('/submitCode')
.post(submitCode)



export {editorRoute}