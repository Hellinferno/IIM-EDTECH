import { auth } from "@clerk/nextjs/server";
import { SEND_IMAGE_SYSTEM_PROMPT } from "@/lib/prompts/send-image";
import { sseResponse } from "@/lib/api";
import { streamChat } from "@/lib/gemini";
import { uploadTemporaryImage } from "@/lib/supabase";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import type { Message } from "@/types";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic"
]);

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(rateLimitKey(userId, "image"), { maxRequests: 10, windowMs: 60_000 });
  if (!rl.success) {
    return rateLimitResponse(rl.resetMs);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e: any) {
    console.error("FormData Error:", e);
    return Response.json({ error: "Invalid form data", msg: e?.message || String(e) }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing image file" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: "Unsupported file format. Use JPG, PNG, WEBP, or HEIC." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "File size must be under 10MB." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = toBase64(buffer);
  const image = { base64, mimeType: file.type };

  // Best-effort temporary upload for prototype traceability.
  console.log("Saving image...");
  await uploadTemporaryImage(base64, file.type, userId);
  console.log("Image saved!");

  const messages: Message[] = [
    {
      id: "",
      role: "user",
      content: "Solve this step by step.",
      createdAt: 0
    }
  ];

  console.log("Starting streamChat!");
  return sseResponse(async (controller) => {
    const encoder = new TextEncoder();
    for await (const token of streamChat(messages, SEND_IMAGE_SYSTEM_PROMPT, image)) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`));
    }
  });
}
