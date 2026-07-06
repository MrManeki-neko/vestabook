# vestabook

Runs a whole book on a physical [Vestaboard](https://www.vestaboard.com/), advancing to the
next chunk of text on a timer. Deployed on Vercel, no database, no admin UI, no scheduler of
its own — a third-party cron service (cron-job.org) is what drives it forward.

Live: https://vestabook-6oz4.vercel.app

## Design: no database, no stored position

The current frame is computed purely from elapsed time:

```
frameIndex = floor((now - startTime) / (INTERVAL_MINUTES * 60_000)) % totalFrames
```

There's no row in a database saying "we're on frame 42." That means:

- Every instance (and every cold start) agrees on the current frame without coordination.
- Restarting the app, redeploying, or scaling to multiple instances doesn't lose your place.
- The tradeoff: if ticks are missed or suppressed for a while (see **Quiet hours** below),
  the board doesn't "catch up" through the skipped frames — it jumps to whatever frame the
  clock says is current the next time a tick succeeds.

## How it works

1. **Pagination** (`lib/paginate.ts`, runs once per server instance and is cached):
   - `content/book.txt` is read, smart quotes/dashes are normalized to ASCII, whitespace is
     collapsed, and the whole thing is uppercased (the physical board is uppercase-only).
   - Text is word-wrapped to 22 characters per line (Vestaboard's column count), never
     splitting a word.
   - Lines are grouped 6 at a time (Vestaboard's row count) into "frames," each line centered
     with blank padding.
2. **`GET /api/tick`** — the only endpoint that writes to the board:
   - Requires header `X-Tick-Secret` matching the `TICK_SECRET` env var; returns `401` if
     missing/wrong.
   - Computes the current frame index from elapsed time and encodes each line into
     Vestaboard's character-code table (`lib/vestaboardCodes.ts`).
   - POSTs `{"characters": [...]}` to the Vestaboard Cloud API. Returns `502` with the
     upstream error body if Vestaboard rejects the request (e.g. bad `VESTABOARD_TOKEN`).
3. **`GET /api/preview`** — no auth, returns the current frame as 6 lines of plain text.
   Use this to sanity-check pagination or debug timing without touching the real board.

## Changing the book

Replace `content/book.txt` with any other plain-text file and redeploy. No code changes
needed. Very long or short books both work — frame count is just `ceil(wrapped lines / 6)`.

## Env vars (set in Vercel dashboard — changes require a redeploy to take effect)

| Var | Required | Notes |
| --- | --- | --- |
| `VESTABOARD_TOKEN` | yes | Vestaboard Cloud API token (Read/Write scope) |
| `TICK_SECRET` | yes | Shared secret; cron-job.org must send it as `X-Tick-Secret` |
| `INTERVAL_MINUTES` | no | Defaults to `5`. Must match the cron-job.org schedule |
| `START_TIME` | no | ISO timestamp; defaults to build time (`BUILD_TIME`, stamped into `next.config.mjs` at build) if unset |

## cron-job.org setup

Create a job:
- **URL**: `https://<your-deployment>/api/tick` — use the real production domain, not a
  deleted/renamed project's old `*.vercel.app` alias (see Troubleshooting).
- **Method**: `GET`
- **Schedule**: every `INTERVAL_MINUTES` minutes
- **Headers**: `X-Tick-Secret: <TICK_SECRET>`

## Quiet hours / do-not-disturb

Vestaboard's Cloud API supports a `forced` field: "when `forced` is set to `true`, the
message will be sent even during configured quiet hours." This app does not set `forced`,
so if quiet hours are configured on the board, ticks during that window are accepted by the
API but won't display.

Because the frame clock is pure elapsed-time (see above), this means the board doesn't pause
and resume in sequence overnight — it skips ahead to whatever frame is "current" once quiet
hours end and the next tick succeeds.

## Troubleshooting

- **`401` from `/api/tick`**: `X-Tick-Secret` header doesn't match `TICK_SECRET`. Check for
  trailing whitespace from copy-paste, and confirm you redeployed after setting/changing the
  env var (Vercel only applies env var changes on the next deploy).
- **`502` from `/api/tick`**: Vestaboard rejected the POST — usually a bad or expired
  `VESTABOARD_TOKEN`. The response body includes Vestaboard's error text.
- **`200` from `/api/tick` but the board doesn't update**: check quiet hours (above), and
  double check the cron job's URL actually points at the current production domain — a
  renamed or deleted Vercel project can leave a stale `*.vercel.app` alias that still
  resolves and returns `200` without reaching this app at all.
- **Vercel build fails with `No Output Directory named "public" found"`**: the project's
  Framework Preset isn't set to Next.js. Settings → General → Build & Development Settings →
  Framework Preset → Next.js, then redeploy.
