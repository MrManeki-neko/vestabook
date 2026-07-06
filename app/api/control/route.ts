import { NextRequest, NextResponse } from "next/server";
import { listBookIds } from "@/lib/library";
import type { ControlState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_PATH = "config/state.json";
const MAX_ATTEMPTS = 3;

interface GithubContentResponse {
  content: string;
  sha: string;
}

async function githubContents(method: "GET" | "PUT", body?: Record<string, unknown>) {
  const repo = process.env.GITHUB_REPO;
  return fetch(`https://api.github.com/repos/${repo}/contents/${STATE_PATH}?ref=main`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function applyFlags(
  current: ControlState,
  flags: { book: string | null; random: string | null; pause: string | null }
): ControlState {
  const next: ControlState = { ...current };

  if (flags.book) {
    next.mode = { type: "single", book: flags.book };
  } else if (flags.random === "true") {
    next.mode = { type: "random" };
  } else if (flags.random === "false") {
    next.mode = { type: "cycle" };
  }

  if (flags.pause === "true" && !next.pausedAt) {
    next.pausedAt = new Date().toISOString();
  } else if (flags.pause === "false" && next.pausedAt) {
    const elapsedMinutes = (Date.now() - new Date(next.pausedAt).getTime()) / 60_000;
    next.accumulatedPauseMinutes += elapsedMinutes;
    next.pausedAt = null;
  }

  return next;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const dongle = searchParams.get("dongle");
  if (!dongle || dongle !== process.env.CONTROL_DONGLE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const flags = {
    book: searchParams.get("book"),
    random: searchParams.get("random"),
    pause: searchParams.get("pause"),
  };

  if (!flags.book && !flags.random && !flags.pause) {
    return NextResponse.json({ error: "no_flags_provided" }, { status: 400 });
  }

  const validIds = listBookIds();
  if (flags.book && !validIds.includes(flags.book)) {
    return NextResponse.json({ error: "unknown_book", validIds }, { status: 400 });
  }

  // Optimistic-concurrency loop: the GitHub Contents API can reject a PUT with 409 if the
  // sha moved between our GET and PUT (another write landed, or a cache served a stale sha).
  // Re-reading and retrying is the standard fix rather than trusting a single sha round-trip.
  let lastFailure: NextResponse | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const getRes = await githubContents("GET");
    if (!getRes.ok) {
      const body = await getRes.text();
      return NextResponse.json(
        { error: "github_read_failed", status: getRes.status, body },
        { status: 502 }
      );
    }
    const current = (await getRes.json()) as GithubContentResponse;
    const currentState = JSON.parse(
      Buffer.from(current.content, "base64").toString("utf-8")
    ) as ControlState;

    const nextState = applyFlags(currentState, flags);

    const putRes = await githubContents("PUT", {
      message: "vestabook: update control state via /api/control",
      content: Buffer.from(JSON.stringify(nextState, null, 2) + "\n", "utf-8").toString(
        "base64"
      ),
      sha: current.sha,
      branch: "main",
    });

    if (putRes.ok) {
      return NextResponse.json({
        ok: true,
        newState: nextState,
        note: "Committed to main; Vercel will redeploy automatically (usually 15-30s) before this takes effect.",
      });
    }

    const body = await putRes.text();
    lastFailure = NextResponse.json(
      { error: "github_write_failed", status: putRes.status, body },
      { status: 502 }
    );
    if (putRes.status !== 409) break;
  }

  return lastFailure!;
}
