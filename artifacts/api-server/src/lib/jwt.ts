import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env["JWT_SECRET"] ?? "futrsec-access-secret-change-in-prod";
const REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"] ?? "futrsec-refresh-secret-change-in-prod";

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_DAYS = 30;

export interface AccessTokenPayload {
  userId: number;
  role: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: { userId: number; role: string }): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: { userId: number }): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: number } {
  return jwt.verify(token, REFRESH_SECRET) as { userId: number };
}
