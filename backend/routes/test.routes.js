import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getTestAnalysis, getTestHostID, getTestsByMe } from "../controller/test.controller.js";

const testRouter=Router()

testRouter.use(verifyJWT)

testRouter
.route('/getMyTests')
.get(getTestsByMe)

testRouter
.route('/getTestDetails')
.get(getTestAnalysis)

testRouter
.route('/getTestHostID/:test_id')
.get(getTestHostID)


export {testRouter}