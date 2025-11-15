import {Router} from "express"
import { login, register, getCurrentUser, logout } from "../controller/auth.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"


const authRouter=Router()


authRouter
.route('/login')
.post(login)

authRouter
.route('/register')
.post(register)

authRouter
.route('/me')
.get(verifyJWT, getCurrentUser)

authRouter
.route('/logout')
.post(verifyJWT, logout)




export {authRouter}