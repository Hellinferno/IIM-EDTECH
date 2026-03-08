import { auth } from "@clerk/nextjs/server";
import { LIVE_OCR_SYSTEM_PROMPT } from "@/lib/prompts/live-ocr";
import { SEND_IMAGE_SYSTEM_PROMPT } from "@/lib/prompts/send-image";
import { isValidMessageList, sseResponse } from "@/lib/api";
import { streamChat } from "@/lib/gemini";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import type { AppMode, ImageInput, Message } from "@/types";

interface ChatRequestBody {
  messages?: unknown;
  mode?: unknown;
  ocrText?: unknown;
  image?: unknown;
}

function resolveMode(mode: unknown): AppMode | null {
  if (mode === "live_ocr" || mode === "send_image") {
    return mode;
  }
  return null;
}

function normalizeImage(input: unknown): ImageInput | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const candidate = input as Partial<ImageInput>;
  if (typeof candidate.base64 !== "string" || typeof candidate.mimeType !== "string") {
    return undefined;
  }
  return {
    base64: candidate.base64,
    mimeType: candidate.mimeType
  };
}

function enrichLiveOCR(messages: Message[], ocrText: string): Message[] {
  if (messages.length === 0) {
    return messages;
  }
  const latest = messages[messages.length - 1];
  if (latest.role !== "user") {
    return messages;
  }

  const enrichedLastMessage: Message = {
    ...latest,
    content: `[OCR] ${ocrText}\n${latest.content}`
  };
  return [...messages.slice(0, -1), enrichedLastMessage];
}

/** Strip metadata (id, createdAt) — Gemini only needs role + content. */
function stripMetadata(messages: Message[]): Message[] {
  return messages.map(({ role, content }) => ({
    id: "",
    role,
    content,
    createdAt: 0
  }));
}

export async function POST(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(rateLimitKey(userId, "chat"), { maxRequests: 20, windowMs: 60_000 });
  if (!rl.success) {
    return rateLimitResponse(rl.resetMs);
  }

  let payload: ChatRequestBody;
  try {
    payload = (await request.json()) as ChatRequestBody;
  } catch (e: any) {
    console.error("Chat API JSON Error:", e);
    return Response.json({ error: "Invalid JSON body", details: String(e) }, { status: 400 });
  }

  if (!isValidMessageList(payload.messages)) {
    return Response.json({ error: "Invalid messages payload" }, { status: 400 });
  }

  const mode = resolveMode(payload.mode);
  if (!mode) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (payload.messages.length === 0) {
    return Response.json({ error: "At least one message is required" }, { status: 400 });
  }

  const ocrText = typeof payload.ocrText === "string" ? payload.ocrText.trim() : "";
  const image = normalizeImage(payload.image);
  const enriched =
    mode === "live_ocr" && ocrText ? enrichLiveOCR(payload.messages, ocrText) : payload.messages;
  const baseMessages = stripMetadata(enriched);
  const systemPrompt = mode === "live_ocr" ? LIVE_OCR_SYSTEM_PROMPT : SEND_IMAGE_SYSTEM_PROMPT;
  const maxTokens = mode === "live_ocr" ? 512 : 1024;

  return sseResponse(async (controller) => {
    const encoder = new TextEncoder();
    let hasTokens = false;
    for await (const token of streamChat(baseMessages, systemPrompt, image, maxTokens)) {
      hasTokens = true;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`));
    }
    if (!hasTokens) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify("I couldn't generate a response. Please try again.")}\n\n`)
      );
    }
  });
}
