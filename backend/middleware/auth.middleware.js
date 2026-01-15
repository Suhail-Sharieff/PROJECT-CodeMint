import jwt from "jsonwebtoken";
import { ApiError } from "../Utils/Api_Error.utils.js";

export const verifyJWT = (req, res, next) => {
  try {
    // Get token from cookie or header
    const token =
      req.cookies?.accessToken||
        req.header("authorization")?.replace(/Bearer\s*/i, "").trim();

    if (!token) {
      throw new ApiError(401, "Unauthorized, token missing!");
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // attaching decoded user details to req, if "decoded" has all details in it like user_id,email,name, if no, then obviouly below section will throw error, so JWT is not verified
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      name: decoded.name,
    };

    console.log(`✅ JWT verified 'user' can be now accesed using req.user `);
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    next(new ApiError(401, "Unauthorized, invalid or expired token!"));
  }
};