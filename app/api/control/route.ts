import { NextRequest, NextResponse } from "next/server";
import { listBookIds } from "@/lib/library";
import type { ControlState } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_PATH = "config/state.json";

interface GithubContentResponse {
  content: string;
  sha: string;
}

async function githubContents(method: "GET" | "PUT", body?: Record<string, unknown>) {
  const repo = process.env.GITHUB_REPO;
  return fetch(`https://api.github.com/repos/${repo}/contents/${STATE_PATH}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const dongle = searchParams.get("dongle");
  if (!dongle || dongle !== process.env.CONTROL_DONGLE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bookParam = searchParams.get("book");
  const randomParam = searchParams.get("random");
  const pauseParam = searchParams.get("pause");

  if (!bookParam && !randomParam && !pauseParam) {
    return NextResponse.json({ error: "no_flags_provided" }, { status: 400 });
  }

  const validIds = listBookIds();
  if (bookParam && !validIds.includes(bookParam)) {
    return NextResponse.json({ error: "unknown_book", validIds }, { status: 400 });
  }

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

  const nextState: ControlState = { ...currentState };

  if (bookParam) {
    nextState.mode = { type: "single", book: bookParam };
  } else if (randomParam === "true") {
    nextState.mode = { type: "random" };
  } else if (randomParam === "false") {
    nextState.mode = { type: "cycle" };
  }

  if (pauseParam === "true" && !nextState.pausedAt) {
    nextState.pausedAt = new Date().toISOString();
  } else if (pauseParam === "false" && nextState.pausedAt) {
    const elapsedMinutes = (Date.now() - new Date(nextState.pausedAt).getTime()) / 60_000;
    nextState.accumulatedPauseMinutes += elapsedMinutes;
    nextState.pausedAt = null;
  }

  const putRes = await githubContents("PUT", {
    message: "vestabook: update control state via /api/control",
    content: Buffer.from(JSON.stringify(nextState, null, 2) + "\n", "utf-8").toString("base64"),
    sha: current.sha,
    branch: "main",
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    return NextResponse.json(
      { error: "github_write_failed", status: putRes.status, body },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    newState: nextState,
    note: "Committed to main; Vercel will redeploy automatically (usually 15-30s) before this takes effect.",
  });
}
