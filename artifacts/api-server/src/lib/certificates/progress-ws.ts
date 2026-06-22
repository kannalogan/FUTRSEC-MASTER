import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "../logger";
import { getRedisClient } from "../redis";
import { verifyAccessToken } from "../jwt";

const WS_PATH = "/api/certificates/jobs/stream";
const PROGRESS_CHANNEL_PATTERN = "cert:job:*:progress";

let wss: WebSocketServer | null = null;

/**
 * Attach a WebSocket server that streams bulk certificate generation progress
 * to authenticated admins. Auth uses the JWT access token passed as the
 * `token` query param (browsers can't set headers on WebSocket handshakes).
 * Progress is sourced from the Redis pub/sub channel the worker publishes to,
 * so a single subscriber fans out to all connected admin sockets.
 */
export function attachCertificateProgressWs(server: HttpServer): void {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    let pathname: string;
    try {
      pathname = new URL(req.url ?? "", "http://localhost").pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== WS_PATH) return; // let other upgrade handlers run

    // Authenticate the handshake.
    let token: string | null = null;
    try {
      token = new URL(req.url ?? "", "http://localhost").searchParams.get(
        "token",
      );
    } catch {
      token = null;
    }
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    let payload: { role?: string } | null = null;
    try {
      payload = verifyAccessToken(token) as { role?: string };
    } catch {
      payload = null;
    }
    if (!payload || payload.role !== "admin") {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss!.handleUpgrade(req, socket, head, (client) => {
      wss!.emit("connection", client, req);
    });
  });

  wss.on("connection", (client: WebSocket) => {
    client.send(JSON.stringify({ type: "connected" }));
  });

  // Bridge Redis pub/sub → all connected sockets via a single dedicated
  // subscriber connection. We do NOT gate on isRedisAvailable() here: the main
  // client connects asynchronously a moment after boot, so a snapshot check at
  // attach time races and would permanently skip the bridge. A dedicated
  // connection (lazyConnect disabled) connects on its own and ioredis
  // re-subscribes automatically on reconnect.
  try {
    const sub = getRedisClient().duplicate({
      lazyConnect: false,
      enableOfflineQueue: true,
    });
    sub.on("error", (err: Error) => {
      logger.warn({ err: err.message }, "cert progress redis subscriber error");
    });
    // Subscribe only once the connection is ready; this handler also re-fires on
    // every reconnect, so the subscription is automatically re-established.
    sub.on("ready", () => {
      sub.psubscribe(PROGRESS_CHANNEL_PATTERN, (err) => {
        if (err) logger.warn({ err }, "cert progress psubscribe failed");
        else logger.info("cert progress redis bridge subscribed");
      });
    });
    sub.on("pmessage", (_pattern, _channel, message) => {
      if (!wss) return;
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    });
  } catch (err) {
    logger.warn(
      { err: (err as Error).message },
      "cert progress redis bridge unavailable",
    );
  }

  logger.info({ path: WS_PATH }, "certificate progress WebSocket attached");
}
