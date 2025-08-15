import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/api_error.js";
import jwt from "jsonwebtoken"
/*API headers are present in both requests and responses, offering a way to pass information between the client and server that isn't directly related to the body content of the API call. For instance, headers can indicate the format of the request body, specify the desired format for the response, handle authentication, and control cache behavior.
*/
export const verifyJWT = asyncHandler(async (req, res, next) => {
    console.log("Matching JWT tokens...");
    console.log("Fetching current token...");
    const currJwtToken = req.cookies?.refreshToken || 
        req.header("authorization")?.replace(/Bearer\s*/i, "").trim();//for mb apps
    //  console.log(`Cookies received: ${JSON.stringify(req.cookies)}, headers received: ${JSON.stringify(req.headers)}`);

    if (!currJwtToken) {
        console.error("No token found in cookies or headers.");
        throw new ApiError(400, "Unauthorized access! Token is missing.");
    }
    console.log("Access is authorized...");
    console.log("JWT is verifying tokens...");

    let decodedToken;
    try {
        decodedToken = jwt.verify(currJwtToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        console.error("Error verifying token:", error.message);
        throw new ApiError(401, "Invalid or expired token.");
    }

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if (!user) {
        throw new ApiError(401, "Invalid access token. User not found.");
    }

    console.log("Tokens matched successfully...");
    console.log("Adding user field to request...");
    req.user = user;

    next();
});