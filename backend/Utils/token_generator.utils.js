import { ApiError } from "./Api_Error.utils";
import { db } from "./sql_connection.js";
import jwt from "jsonwebtoken"

const generateAccessToken = (user)=>{
    return jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            name: user.name,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
const generateRefreshToken = (user)=>{
    return jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            name: user.name,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
/**Access Token: This is a short-lived token that allows a user or application to access protected resources (like an API). Once it expires, the user needs a new one.

Refresh Token: This is a longer-lived token used to obtain a new access token without requiring the user to log in again. It's more secure because it's not sent with every request. */
const get_refresh_access_token=async(user_id)=>{
    try {
        console.log("Generating toekns for user.......");
        const curr_user=await getuserById(user_id)
        const refreshToken=generateRefreshToken(curr_user);
        const accessToken=generateAccessToken(curr_user);
        console.log(`Refresh and accss tokens are generated.....`);

        console.log("Saving refresh token into DB.....");
        await db.execute(
      `UPDATE user SET refreshToken = ? WHERE user_id = ?`,
      [refreshToken, user_id]
    );

    console.log("Updated refresh token of user successfully.");
    return {accessToken,refreshToken};
        
    } catch (error) {
        throw new ApiError(400,"Error while generating refresh token!")
    }
}


export {get_refresh_access_token}