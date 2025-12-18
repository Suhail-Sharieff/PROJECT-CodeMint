import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getBattleAnalysis, getBattlesAttendedByMe, getBattlesByMe } from "../controller/battle.controller.js";


const battleRouter=Router()

battleRouter.use(verifyJWT)


battleRouter.get('/getBattleAnalysis',getBattleAnalysis)
battleRouter.get('/getBattlesByMe',getBattlesByMe)
battleRouter.get('/getBattlesAttendedByMe',getBattlesAttendedByMe)

export {battleRouter}