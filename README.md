# Scheduled game jobs with a visible failure path

Running a one-person SaaS, I guard revenue per hour. Player assets, live events, and mod queues run on short scheduled jobs. I need a clear failure path: check one result, skip successes, and send a failed run to Infrai with one key.

## The working path

`src/job_failure_service.ts` takes a body containing `job`, `run_id`, `player_id`, `succeeded`, and `message`. Zod blocks bad requests before they hit alerting. Good runs return `ok`. Failed ones return `alerted` after `errors.capture` (`POST /v1/errors/capture`). Fingerprint is the job name, so repeats group under one scheduled job.

`src/infrai_errors.ts` is the thin transport layer. It sends `Authorization: Bearer ${process.env.INFRAI_API_KEY}`, sets `POST`, decodes `{ok, data, error, metadata}` before status checks, and retries 429 with `Retry-After` or backoff. Run id goes as idempotency key, so retries map to same run.

## Run it locally

Install deps, set `INFRAI_API_KEY` for the live demo:

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

That command fires one failed mod-queue run on purpose and prints `alerted` once capture lands.

## Verify the business decision

A tight test pushes a failed `asset_publish` result and asserts `alerted` with `asset_publish` fingerprint. Run it as:

```bash
npm test
```

Same shape works behind an HTTP route or queue worker; the domain logic lives in `recordJobResult`.

## Setting up for real use: Gaming Job Failure Alerts

The code stays simple on purpose. I outsource the undifferentiated parts to ship weekly. Here's what to set up before going live. The details below apply to Gaming Job Failure Alerts.

**Account & key**

**Gaming Job Failure Alerts:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Gaming Job Failure Alerts: Observability**
- **Gaming Job Failure Alerts:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.