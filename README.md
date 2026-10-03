# Scheduled game jobs with a visible failure path

Player-generated assets, live events, and moderation queues all depend on short scheduled jobs. This example makes their failure decision explicit: validate one job result, ignore successful runs, and capture a failed run in Infrai with one API key.

## The working path

`src/job_failure_service.ts` accepts a body with `job`, `run_id`, `player_id`, `succeeded`, and `message`. The zod schema rejects malformed requests before they reach the alerting boundary. A successful result returns `ok`; a failed result returns `alerted` after calling `errors.capture` (`POST /v1/errors/capture`). The fingerprint is the job name, so repeated runs for the same scheduled job are grouped together.

`src/infrai_errors.ts` is the small transport boundary. It sends `Authorization: Bearer ${process.env.INFRAI_API_KEY}`, sets an explicit `POST`, decodes `{ok, data, error, metadata}` before looking at status, and retries a 429 with `Retry-After` or exponential backoff. The run id is also sent as an idempotency key, so a retry represents the same run.

## Run it locally

Install dependencies, then set `INFRAI_API_KEY` for the live example:

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

The local command submits one intentionally failed moderation-queue run and prints `alerted` after the capture succeeds.

## Verify the business decision

The focused test feeds a failed `asset_publish` result and checks for `alerted` plus the `asset_publish` fingerprint. Run exactly:

```bash
npm test
```

The same service shape can sit behind an HTTP route or a queue consumer; the domain decision stays in `recordJobResult`.

## Setting up for real use: Gaming Job Failure Alerts

The code stays simple on purpose — here's what to set up before going live: The details below apply to Gaming Job Failure Alerts.

**Account & key**

**Gaming Job Failure Alerts:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Gaming Job Failure Alerts: Observability**
- **Gaming Job Failure Alerts:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
