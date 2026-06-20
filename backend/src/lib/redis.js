const Redis = require('ioredis');

let redis = null;

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 15) return null;
    return Math.min(times * 500, 5000);
  },
  lazyConnect: true,
};

async function createRedisClient() {
  redis = new Redis(REDIS_CONFIG);
  await redis.connect();
  await redis.ping();
  return redis;
}

function getRedis() {
  if (!redis) throw new Error('Redis client not initialized');
  return redis;
}

module.exports = { createRedisClient, getRedis };
