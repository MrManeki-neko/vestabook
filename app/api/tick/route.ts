import { NextRequest, NextResponse } from "next/server";
import { getCurrentFrameIndex, getFrames } from "@/lib/paginate";
import { encodeLine } from "@/lib/vestaboardCodes";
import { getQuietHoursConfig, isQuietNow } from "@/lib/quietHours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-tick-secret");
  if (!secret || secret !== process.env.TICK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const quietCfg = getQuietHoursConfig();
  if (quietCfg && isQuietNow(new Date(), quietCfg)) {
    return NextResponse.json({ ok: true, skipped: "quiet_hours" });
  }

  const frames = getFrames();
  const frameIndex = getCurrentFrameIndex(frames.length);
  const frame = frames[frameIndex];
  const characters = frame.map(encodeLine);

  const vestaboardRes = await fetch("https://cloud.vestaboard.com/", {
    method: "POST",
    headers: {
      "X-Vestaboard-Token": process.env.VESTABOARD_TOKEN ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ characters }),
  });

  if (!vestaboardRes.ok) {
    const body = await vestaboardRes.text();
    return NextResponse.json(
      { error: "vestaboard_error", status: vestaboardRes.status, body },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, frameIndex, totalFrames: frames.length });
}
