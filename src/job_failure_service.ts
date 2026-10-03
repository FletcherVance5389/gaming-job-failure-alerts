import { z } from "zod";
import { capture } from "./infrai_errors.ts";

export const jobResultSchema = z.object({
  job: z.enum(["asset_publish", "live_event_start", "moderation_drain"]),
  run_id: z.string().min(1),
  player_id: z.string().min(1),
  succeeded: z.boolean(),
  message: z.string().min(1)
});

export type JobResult = z.infer<typeof jobResultSchema>;

export async function recordJobResult(input: unknown, report = capture): Promise<"ok" | "alerted"> {
  const result = jobResultSchema.parse(input);
  if (result.succeeded) return "ok";
  await report({
    idempotency_key: result.run_id,
    title: `scheduled ${result.job} failed`,
    message: result.message,
    level: "error",
    fingerprint: [result.job],
    context: { player_id: result.player_id, job: result.job }
  });
  return "alerted";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = {
    job: "moderation_drain",
    run_id: `local-${Date.now()}`,
    player_id: "player-demo",
    succeeded: false,
    message: "queue item could not be classified"
  };
  recordJobResult(input).then((decision) => console.log(decision));
}
