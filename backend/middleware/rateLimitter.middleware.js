import { ApiError } from "../Utils/Api_Error.utils.js";
import { redis } from "../Utils/redis_connection.utils.js";

const rateLimmiter=async(req,res,next)=>{
    try{

        if(!req.user){
            next();
            console.log("NO USER");
            return;
        }

        const key = `rl:${req.user.user_id}`;

        const count = await redis.incr(key);

        if (count === 1) {
            // first request → set TTL window
            await redis.expire(key, process.env.API_TTL_WINDOW);
        }
        if (count > process.env.API_RATE_LIMIT) {
            throw new ApiError(429, "Too many requests. Try again later.");
        }
        // console.log(count);
        console.log(`📉 No of Requests made by ${req.user.email} = ${count}`);
         next()
    
    }catch(err){
        console.error("❌ API Rate Exceeded ! :", err.message);
        next(new ApiError(401, "Toomany requests, try later!"));
    }
}
export {rateLimmiter}