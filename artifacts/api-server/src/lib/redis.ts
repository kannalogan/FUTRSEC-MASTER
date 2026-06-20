import Redis, { type RedisOptions } from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env["REDIS_URL"];
const REDIS_HOST = process.env["REDIS_HOST"] ?? "localhost";
const REDIS_PORT = parseInt(process.env["REDIS_PORT"] ?? "6379", 10);
const REDIS_PASSWORD = process.env["REDIS_PASSWORD"];
const REDIS_DB = parseInt(process.env["REDIS_DB"] ?? "0", 10);

function buildConnectionOptions(): RedisOptions {
  if (REDIS_URL) {
    try {
      const parsed = new URL(REDIS_URL);
      const isTls = parsed.protocol === "rediss:";
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || "6379", 10),
        ...(parsed.username ? { username: parsed.username } : {}),
        ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
        db: parseInt(parsed.pathname.replace(/^\//, "") || "0", 10),
        ...(isTls ? { tls: {} } : {}),
      };
    } catch {
      logger.warn({ url: REDIS_URL }, "Failed to parse REDIS_URL — falling back to REDIS_HOST/PORT");
    }
  }
  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
  };
}

let _client: Redis | null = null;
let _available = false;
let _connectAttempted = false;

export const redisConnectionOptions = buildConnectionOptions();

export function getRedisClient(): Redis {
  if (!_client) {
    _client = new Redis({
      ...redisConnectionOptions,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn("Redis retry limit reached — running in degraded mode");
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    _client.on("connect", () => {
      _available = true;
      logger.info({ host: REDIS_HOST, port: REDIS_PORT }, "Redis connected");
    });

    _client.on("ready", () => {
      _available = true;
    });

    _client.on("error", (err: Error) => {
      _available = false;
      if (!_connectAttempted) {
        logger.warn(
          { err: err.message },
          "Redis unavailable — BullMQ queues and caching disabled"
        );
      }
    });

    _client.on("close", () => {
      _available = false;
    });

    _client.on("end", () => {
      _available = false;
    });
  }
  return _client;
}

export async function connectRedis(): Promise<boolean> {
  _connectAttempted = true;
  try {
    const client = getRedisClient();
    await client.connect();
    return true;
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "Redis initial connection failed — running without cache/queues"
    );
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return _available;
}

export async function redisHealthCheck(): Promise<{ ok: boolean; latencyMs?: number }> {
  if (!_available || !_client) return { ok: false };
  try {
    const start = Date.now();
    await _client.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false };
  }
}

export async function disconnectRedis(): Promise<void> {
  if (_client) {
    await _client.quit().catch(() => _client?.disconnect());
    _client = null;
    _available = false;
  }
}
