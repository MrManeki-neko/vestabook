import { NextRequest, NextResponse } from "next/server";
import { getCurrentFrame } from "@/lib/sequencer";
import { encodeLine } from "@/lib/vestaboardCodes";
import { getQuietHoursConfig, isQuietNow } from "@/lib/quietHours";
import { isPausedNow } from "@/lib/state";
import { secretMatches } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-tick-secret");
  if (!secretMatches(secret, process.env.TICK_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isPausedNow()) {
    return NextResponse.json({ ok: true, skipped: "paused" });
  }

  const quietCfg = getQuietHoursConfig();
  if (quietCfg && isQuietNow(new Date(), quietCfg)) {
    return NextResponse.json({ ok: true, skipped: "quiet_hours" });
  }

  const { bookId, frameIndex, frame } = getCurrentFrame();
  const characters = frame.map(encodeLine);

  let vestaboardRes: Response;
  try {
    vestaboardRes = await fetch("https://cloud.vestaboard.com/", {
      method: "POST",
      headers: {
        "X-Vestaboard-Token": process.env.VESTABOARD_TOKEN ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ characters }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "vestaboard_unreachable", detail: String(err) },
      { status: 504 }
    );
  }

  if (!vestaboardRes.ok) {
    const body = await vestaboardRes.text();
    return NextResponse.json(
      { error: "vestaboard_error", status: vestaboardRes.status, body },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, bookId, frameIndex });
}
