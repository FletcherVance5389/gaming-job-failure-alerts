import test from "node:test";
import assert from "node:assert/strict";
import { recordJobResult } from "./job_failure_service.ts";
import { capture } from "./infrai_errors.ts";

test("a failed scheduled job becomes one alert with its job fingerprint", async () => {
  const reports: Record<string, unknown>[] = [];
  const decision = await recordJobResult({
    job: "asset_publish",
    run_id: "run-42",
    player_id: "player-7",
    succeeded: false,
    message: "asset validation rejected"
  }, async (event) => { reports.push(event); return undefined; });
  assert.equal(decision, "alerted");
  assert.deepEqual(reports[0]?.fingerprint, ["asset_publish"]);
  assert.equal(reports[0]?.idempotency_key, "run-42");
});

test("capture sends contract fields at the top level", async () => {
  const previousKey = process.env.INFRAI_API_KEY;
  process.env.INFRAI_API_KEY = "test-key";
  try {
    let request: RequestInit | undefined;
    await recordJobResult({
      job: "asset_publish",
      run_id: "run-42",
      player_id: "player-7",
      succeeded: false,
      message: "asset validation rejected"
    }, (event) => capture(event, async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
    }));
    assert.equal(JSON.parse(String(request?.body)).idempotency_key, "run-42");
    assert.equal(JSON.parse(String(request?.body)).title, "scheduled asset_publish failed");
    assert.equal(JSON.parse(String(request?.body)).exception, undefined);
  } finally {
    if (previousKey === undefined) delete process.env.INFRAI_API_KEY;
    else process.env.INFRAI_API_KEY = previousKey;
  }
});
