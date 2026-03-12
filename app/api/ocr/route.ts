import { auth } from "@clerk/nextjs/server";
import { extractTextFromFrame, QuotaExhaustedError, RateLimitedError } from "@/lib/gemini";

interface OCRRequestBody {
  image?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
    if (error instanceof RateLimitedError) {
      return Response.json(
        {
          error: "rate_limited",
          message: error.message,
          retryAfterSeconds: error.retryAfterSeconds ?? 10
        },
        {
          status: 429,
          headers: error.retryAfterSeconds ? { "Retry-After": String(error.retryAfterSeconds) } : undefined
        }
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.includes("Too Many Requests")) {
      return Response.json(
        { error: "rate_limited", message: "OCR service is busy. Please try again in a moment.", retryAfterSeconds: 10 },
        { status: 429 }
      );
    }
    if (msg.includes("quota")) {
      return Response.json(
        { error: "quota_exhausted", message: "API quota exhausted. Please wait for reset or use a new API key." },
        { status: 429 }
      );
    }
    
    // Handle invalid API key or bad request explicitly
    if (msg.includes("400") || msg.includes("API key not valid") || msg.includes("INVALID_ARGUMENT")) {
      return Response.json(
        { error: "configuration_error", message: "API Key invalid or permissions missing. Check Google AI Studio settings." },
        { status: 400 }
      );
    }

    console.error("OCR processing failed:", error);
    return Response.json({ 
      error: "ocr_failed", 
      message: "OCR processing failed", 
      details: msg 
    }, { status: 500 });
  }
}
