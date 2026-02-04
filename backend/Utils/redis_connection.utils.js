import { createClient } from 'redis';

/** @type {import("redis").RedisClientType} */
let redis;

const init_redis = async () => {
  try {
    if (!redis) {
      redis = createClient({
        url: `${process.env.REDIS_ORIGIN}`,
      });

      redis.on("error", (err) => {
        console.error("Redis Client Error", err);
      });

      await redis.connect();
      console.log("✅ Connected to Redis");
    }
  } catch (err) {
    console.error("Redis init error:", err);
    await close_redis()
  }
};

const close_redis = async () => {
  if (redis) {
    await redis.quit();
    console.log("🚪 Redis connection closed");
  }
};

export { init_redis,redis };