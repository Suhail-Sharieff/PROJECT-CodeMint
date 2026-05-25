import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ApiError } from "../Utils/Api_Error.utils.js";
import { redis } from "../Utils/redis_connection.utils.js";

export const verifyJWT = async (req, res, next) => {
  try {
    // Get token from cookie or header
    const token =
      req.cookies?.accessToken ||
      req.header("authorization")?.replace(/Bearer\s*/i, "").trim();

    if (!token) {
      throw new ApiError(401, "Unauthorized, token missing!");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const redisKey = `jwt:auth:${tokenHash}`;

    // Try to get cached user from Redis
    const cachedUser = await redis.get(redisKey);
    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      await redis.setEx(`${req.user.user_id}:${req.user.email}`, 60, req.ip);
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // attaching decoded user details to req, if "decoded" has all details in it like user_id,email,name, if no, then obviously below section will throw error, so JWT is not verified
    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      name: decoded.name,
    };

    console.log(`✅ JWT verified 'user' can be now accessed using req.user (Cache Miss)`);

    // Cache the verified user details in Redis
    const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
    if (remainingTime > 0) {
      await redis.setEx(redisKey, remainingTime, JSON.stringify(req.user));
    }

    await redis.setEx(`${decoded.user_id}:${decoded.email}`, 60, req.ip);
    // console.log(JSON.stringify(req.user));

    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message);
    next(new ApiError(401, "Unauthorized, invalid or expired token!"));
  }
};