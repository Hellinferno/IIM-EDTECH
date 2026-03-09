import { auth } from "@clerk/nextjs/server";
import { extractTextFromFrame, QuotaExhaustedError } from "@/lib/gemini";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

interface OCRRequestBody {
  image?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(rateLimitKey(userId, "ocr"), { maxRequests: 30, windowMs: 60_000 });
  if (!rl.success) {
    return rateLimitResponse(rl.resetMs);
  }

  let payload: OCRRequestBody;
  try {
    payload = (await request.json()) as OCRRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof payload.image !== "string" || payload.image.trim().length === 0) {
    return Response.json({ error: "Field 'image' must be a non-empty string" }, { status: 400 });
  }

  try {
    const text = await extractTextFromFrame(payload.image);
    return Response.json({ text: text.trim() });
  } catch (error) {
    if (error instanceof QuotaExhaustedError) {
      return Response.json(
        { error: "quota_exhausted", message: "API quota exhausted. Please wait for reset or use a new API key." },
        { status: 429 }
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.includes("quota")) {
      return Response.json(
        { error: "quota_exhausted", message: "API rate limit reached. Please try again in a moment." },
        { status: 429 }
      );
    }
    console.error("OCR processing failed:", error);
    return Response.json({ error: "OCR processing failed" }, { status: 500 });
  }
}
