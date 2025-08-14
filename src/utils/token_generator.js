import { User } from "../models/user.model.js";
import { ApiError } from "./api_error.js";
/**Access Token: This is a short-lived token that allows a user or application to access protected resources (like an API). Once it expires, the user needs a new one.

Refresh Token: This is a longer-lived token used to obtain a new access token without requiring the user to log in again. It's more secure because it's not sent with every request. */
const get_refresh_access_token=async(user_id)=>{
    try {
        console.log("Generating toekns for user.......");
        const curr_user=await User.findById(user_id)
        const refreshToken=curr_user.generateRefreshToken();
        const accessToken=curr_user.generateAccessToken();
        console.log(`Refresh and accss tokens are generated.....`);
        console.log("Saving refresh token into DB.....");
        curr_user.refreshToken=refreshToken;
        await curr_user.save(
            {
                validateBeforeSave:false,//otherwise user will have to login to verify password again
            }
        )
        console.log("Updated refresh token of user sucessfully....");
        return {accessToken,refreshToken};
        
    } catch (error) {
        throw new ApiError(400,"Error while generating refresh token!")
    }
}


export {get_refresh_access_token}