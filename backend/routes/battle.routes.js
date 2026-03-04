import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getBattleAnalysis, getBattlesAttendedByMe, getBattlesByMe } from "../controller/battle.controller.js";
import { rateLimmiter } from "../middleware/rateLimitter.middleware.js";


const battleRouter=Router()

battleRouter.use(verifyJWT,rateLimmiter)


battleRouter.get('/getBattleAnalysis',getBattleAnalysis)
battleRouter.get('/getBattlesByMe',getBattlesByMe)
battleRouter.get('/getBattlesAttendedByMe',getBattlesAttendedByMe)

export {battleRouter}