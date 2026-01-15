import bcrypt from "bcryptjs";
import { ApiError } from "../Utils/Api_Error.utils.js";
import { ApiResponse } from "../Utils/Api_Response.utils.js";
import { asyncHandler } from "../Utils/AsyncHandler.utils.js";
import { db } from "../Utils/sql_connection.js";
import { get_refresh_access_token } from "../Utils/token_generator.utils.js";

const login=asyncHandler(
    async(req,res)=>{
        const {email,password}=req.body;
        if(!email || !password) throw new ApiError(400,"Email or password is empty");
        const query=`select * from user where email=? limit 1`
        const [rows] = await db.execute(query,[email]);
        if(!rows || rows.length===0) throw new ApiError(400,"Register before logging in!")

        const user=rows[0];
        const hashedPassword=user.password;
        if(!hashedPassword) throw new ApiError(400,"User password not found!");
        const crt=await bcrypt.compare(password, hashedPassword)
        if(!crt) throw new ApiError(400,"Invalid crendentials!")

        delete user.password;
        console.log("User login success! Generating refresh token session...");
        const {accessToken,refreshToken}=await get_refresh_access_token(user.user_id)
        console.log(`Sent these tokens as cookies for logged session....`);
        return res
        .status(200)
        .cookie("accessToken", accessToken, {
            httpOnly: true,   
            secure: process.env.NODE_ENV === "production"//ensures the cookie is only sent over encrypted HTTPS connections,other wise anyone can access it using Javascript's document.cookie
        })
        .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        })
        .json(
            new ApiResponse(
                200,
                { user: { ...user, refreshToken }, accessToken, refreshToken },
                "Login session created!"
            )
        );
        
    }
);

const registeredAlready=
    async(email)=>{
        const [rows]=await db.execute('select * from user where email=?',[email])
        return rows.length>0
    };

const register=asyncHandler(async(req,res)=>{
   try{
        const {email,password,name,phone}=req.body;
        if(!email || !password || !name || !phone) throw new ApiError(400,"Missing fields");
        const registered=await registeredAlready(email);
        if(registered) throw new ApiError(400,"User registered already!")
        const query='insert into user(name,phone,email,password) values (?,?,?,?)'
        const hashedPassword=await bcrypt.hash(password,10)
        const [rows]=await db.execute(query,[name,phone,email,hashedPassword])
        if(rows.affectedRows===0) throw new ApiError(400,"Unable to register user !")
        return res.status(200).json(new ApiResponse(200,rows))
   }catch(e){
        throw new ApiError(400,e.message);
    }
})

//  current user i can get from token (for session restoration)
const getCurrentUser = asyncHandler(async(req,res)=>{
    // req.user is set by verifyJWT middleware
    const user = req.user;
    if(!user) throw new ApiError(401,"User not authenticated");
    
    const query = `SELECT user_id, name, email, phone FROM user WHERE user_id = ? LIMIT 1`;
    const [rows] = await db.execute(query, [user.user_id]);
    
    if(!rows || rows.length === 0) throw new ApiError(404,"User not found");
    
    return res.status(200).json(
        new ApiResponse(200, { user: rows[0] }, "User retrieved successfully")
    );
});

const logout = asyncHandler(async (req, res) => {

    if (!req.user) {
      throw new ApiError(
        400,
        "JWT failed to append user field to request while logging out..."
      );
    }
  
    console.log("Clearing refresh token before logout...");
  
    
    const [result] = await db.execute(
      `UPDATE user SET refreshToken = NULL WHERE user_id = ?`,
      [req.user.user_id]
    );
  
    if (result.affectedRows === 0) {
      console.error("Failed to update user refresh token.");
      throw new ApiError(500, "Failed to update user refresh token.");
    }
  
    console.log("Refresh token cleared, logout success..");
  
    return res
      .status(200)
      .clearCookie("accessToken", { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production" 
      })
      .clearCookie("refreshToken", { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production" 
      })
      .json(
        new ApiResponse(
          200,
          { user_id: req.user.user_id },
          "Logout success"
        )
      );
  });
  


export {login,register,getCurrentUser,logout}