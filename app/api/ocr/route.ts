import { auth } from "@clerk/nextjs/server";
import { extractTextFromFrame } from "@/lib/gemini";

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
  } catch {
    return Response.json({ error: "OCR processing failed" }, { status: 500 });
  }
}
