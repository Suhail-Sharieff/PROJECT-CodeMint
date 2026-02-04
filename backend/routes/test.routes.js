import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { rateLimmiter } from "../middleware/rateLimitter.middleware.js";
import { getTestAnalysis, getTestHostID, getTestsAttendedByMe, getTestsByMe } from "../controller/test.controller.js";

const testRouter=Router()

testRouter.use(verifyJWT,rateLimmiter)

testRouter
.route('/getTestsByMe')
.get(getTestsByMe)

testRouter.route('/getTestsAttendedByMe').get(getTestsAttendedByMe)

testRouter
.route('/getTestDetails')
.get(getTestAnalysis)

testRouter
.route('/getTestHostID/:test_id')
.get(getTestHostID)


export {testRouter}