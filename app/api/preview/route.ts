import { NextResponse } from "next/server";
import { getCurrentFrameIndex, getFrames } from "@/lib/paginate";
import { getQuietHoursConfig, isQuietNow } from "@/lib/quietHours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const frames = getFrames();
  const frameIndex = getCurrentFrameIndex(frames.length);
  const frame = frames[frameIndex];

  const quietCfg = getQuietHoursConfig();
  const quietNow = quietCfg ? isQuietNow(new Date(), quietCfg) : false;

  return new NextResponse(frame.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Frame-Index": String(frameIndex),
      "X-Total-Frames": String(frames.length),
      "X-Quiet-Hours": String(quietNow),
    },
  });
}
