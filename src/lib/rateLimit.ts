import "server-only";

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  status = 429;

  constructor(message = "请求过于频繁，请稍后再试。") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    throw new RateLimitError();
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
}
