import { NextResponse } from "next/server";
import { getCurrentFrame } from "@/lib/sequencer";
import { getQuietHoursConfig, isQuietNow } from "@/lib/quietHours";
import { isPausedNow } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { bookId, frameIndex, frame } = getCurrentFrame();

  const quietCfg = getQuietHoursConfig();
  const quietNow = quietCfg ? isQuietNow(new Date(), quietCfg) : false;

  return new NextResponse(frame.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Book-Id": bookId,
      "X-Frame-Index": String(frameIndex),
      "X-Quiet-Hours": String(quietNow),
      "X-Paused": String(isPausedNow()),
    },
  });
}
