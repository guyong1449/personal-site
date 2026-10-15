import { createHmac, timingSafeEqual } from "node:crypto";

type PageViewsStore = { total: number; byPath: Record<string, number>; updatedAt: string };

// Limit and increment together, so concurrent requests never overwrite counts.
const INCREMENT_SCRIPT = `
local requests = redis.call('INCR', KEYS[2])
if requests == 1 then redis.call('EXPIRE', KEYS[2], 60) end
if requests > 30 then return 0 end
redis.call('HINCRBY', KEYS[1], 'total', 1)
redis.call('HINCRBY', KEYS[1], ARGV[1], 1)
redis.call('HSET', KEYS[1], 'updatedAt', ARGV[2])
return 1
`;

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token || !url.startsWith("https://")) throw new Error("Page-view storage is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Page-view storage is unavailable");
  const payload = await response.json() as { result?: unknown; error?: string };
  if (payload.error) throw new Error("Page-view storage command failed");
  return payload.result;
}

export function hasPageViewAdminAccess(token: string | null): boolean {
  const expected = process.env.PAGE_VIEWS_ADMIN_TOKEN;
  if (!token || !expected) return false;
  const receivedBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export async function incrementPageView(pathname: string, clientAddress: string): Promise<boolean> {
  const secret = process.env.PAGE_VIEWS_ADMIN_TOKEN;
  if (!secret) throw new Error("Page-view authentication is not configured");
  const minute = Math.floor(Date.now() / 60000);
  // A short-lived keyed digest is stored for limits; raw IP addresses are never stored.
  const digest = createHmac("sha256", secret).update(`${minute}:${clientAddress}`).digest("hex");
  const result = await redisCommand([
    "EVAL", INCREMENT_SCRIPT, 2, "guyong:page-views:v1", `guyong:page-views:limit:${digest}`,
    `path:${pathname}`, new Date().toISOString(),
  ]);
  return result === 1;
}

export async function getPageViewStats(): Promise<PageViewsStore> {
  const result = await redisCommand(["HGETALL", "guyong:page-views:v1"]);
  if (!Array.isArray(result) || result.length % 2 !== 0) throw new Error("Invalid page-view response");
  const store: PageViewsStore = { total: 0, byPath: {}, updatedAt: "" };
  for (let index = 0; index < result.length; index += 2) {
    const key = String(result[index]);
    const value = String(result[index + 1]);
    if (key === "updatedAt") store.updatedAt = value;
    else if (key === "total") store.total = Number(value);
    else if (key.startsWith("path:/")) store.byPath[key.slice(5)] = Number(value);
  }
  return store;
}
