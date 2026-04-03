const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let redisDisabled = false;
let redisAvailabilityLogged = false;

const isRedisEnabled = () => {
  const raw = process.env.REDIS_ENABLED;
  if (raw == null) return true;
  return !['false', '0', 'no', 'off'].includes(String(raw).toLowerCase());
};

const markRedisUnavailable = (reason) => {
  redisDisabled = true;

  if (!redisAvailabilityLogged) {
    logger.warn(`Redis unavailable, falling back to in-memory/no-cache mode${reason ? ` (${reason})` : ''}`);
    redisAvailabilityLogged = true;
  }

  if (redisClient) {
    redisClient.removeAllListeners();
    redisClient.disconnect();
    redisClient = null;
  }
};

const getRedisClient = () => {
  if (redisDisabled || !isRedisEnabled()) {
    return null;
  }

  if (!redisClient) {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    client.on('connect', () => {
      redisAvailabilityLogged = true;
      logger.info('Redis connected');
    });

    client.on('error', (err) => {
      markRedisUnavailable(err.code || err.message);
    });

    client.on('end', () => {
      if (!redisDisabled) {
        logger.warn('Redis connection closed');
      }
    });

    redisClient = client;
  }

  return redisClient;
};

const getReadyRedisClient = async () => {
  const client = getRedisClient();
  if (!client) return null;

  if (client.status === 'ready') {
    return client;
  }

  try {
    await client.connect();
    return client;
  } catch (err) {
    markRedisUnavailable(err.code || err.message);
    return null;
  }
};

// Cache helpers
const cache = {
  async get(key) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return null;
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Redis GET error:', err);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 3600) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      await client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (err) {
      logger.error('Redis SET error:', err);
      return false;
    }
  },

  async del(key) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      await client.del(key);
      return true;
    } catch (err) {
      logger.error('Redis DEL error:', err);
      return false;
    }
  },

  async delPattern(pattern) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      const keys = await client.keys(pattern);
      if (keys.length > 0) await client.del(...keys);
      return true;
    } catch (err) {
      logger.error('Redis DEL pattern error:', err);
      return false;
    }
  },

  // Driver location storage using GEO commands
  async setDriverLocation(driverId, lat, lng) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      await client.geoadd('driver_locations', lng, lat, driverId);
      await client.setex(`driver:online:${driverId}`, 60, '1');
      return true;
    } catch (err) {
      logger.error('Redis GEO SET error:', err);
      return false;
    }
  },

  async getNearbyDrivers(lat, lng, radiusKm = 10) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return [];
      const results = await client.georadius(
        'driver_locations',
        lng,
        lat,
        radiusKm,
        'km',
        'WITHCOORD',
        'WITHDIST',
        'ASC',
        'COUNT',
        20
      );

      return results.map(([id, dist, [driverLng, driverLat]]) => ({
        driverId: id,
        distance: parseFloat(dist),
        lat: parseFloat(driverLat),
        lng: parseFloat(driverLng),
      }));
    } catch (err) {
      logger.error('Redis GEO RADIUS error:', err);
      return [];
    }
  },

  async removeDriverLocation(driverId) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      await client.zrem('driver_locations', driverId);
      await client.del(`driver:online:${driverId}`);
      return true;
    } catch (err) {
      logger.error('Redis GEO REMOVE error:', err);
      return false;
    }
  },

  // Blacklist JWT tokens on logout
  async blacklistToken(token, ttlSeconds) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      await client.setex(`blacklist:${token}`, ttlSeconds, '1');
      return true;
    } catch (err) {
      logger.error('Redis blacklist error:', err);
      return false;
    }
  },

  async isTokenBlacklisted(token) {
    try {
      const client = await getReadyRedisClient();
      if (!client) return false;
      const result = await client.get(`blacklist:${token}`);
      return result === '1';
    } catch (err) {
      logger.error('Redis blacklist check error:', err);
      return false;
    }
  },
};

module.exports = { getRedisClient, cache };
