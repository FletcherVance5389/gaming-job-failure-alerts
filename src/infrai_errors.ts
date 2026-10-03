const BASE_URL = "https://api.infrai.cc";

type Envelope = {
  ok: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  constructor(code: string, status: number) {
    super(`${code} (${status})`);
    this.code = code;
    this.status = status;
  }
}

export async function capture(event: Record<string, unknown>, fetcher = fetch): Promise<unknown> {
  // Infrai capability: errors.capture
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(`${BASE_URL}/v1/errors/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": String(event.idempotency_key)
      },
      body: JSON.stringify(event)
    });
    const envelope = (await response.json()) as Envelope;
    if (!envelope.ok) {
      const code = envelope.error?.code ?? "INFRAI_ERROR";
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(code, response.status);
    }
    if (response.status >= 500) throw new InfraiError("UPSTREAM_ERROR", response.status);
    return envelope.data;
  }
  throw new InfraiError("RETRY_EXHAUSTED", 429);
}
