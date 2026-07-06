# vestabook

An application to run an entire book on a Vestaboard, changing the text every 5 minutes.

Runs a book on a physical Vestaboard, advancing to the next frame on a timer. No database —
the current frame is derived purely from elapsed time, so any instance answers the same way.

## How it works

- `content/book.txt` is paginated once per server instance into 6-line x 22-char frames
  (word-wrapped, centered, never split mid-word). Swap the book by replacing this file —
  no code changes needed.
- `GET /api/tick` computes the current frame from `(now - START_TIME) / INTERVAL_MINUTES`
  and pushes it to the Vestaboard Cloud API. Call it on a schedule from cron-job.org.
- `GET /api/preview` returns the current frame as plain text, no auth, for debugging.

## Env vars (set in Vercel dashboard)

| Var | Required | Notes |
| --- | --- | --- |
| `VESTABOARD_TOKEN` | yes | Vestaboard Cloud API token |
| `TICK_SECRET` | yes | Shared secret cron-job.org must send as `X-Tick-Secret` |
| `START_TIME` | no | ISO timestamp; defaults to build time if unset |
| `INTERVAL_MINUTES` | no | Defaults to `5` |

## cron-job.org setup

Create a job that sends `GET https://<your-deployment>/api/tick` every `INTERVAL_MINUTES`
minutes with header `X-Tick-Secret: <TICK_SECRET>`.
