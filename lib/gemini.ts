import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ImageInput, Message } from "@/types";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stripDataUrlPrefix(input: string): string {
  const commaIndex = input.indexOf(",");
  if (commaIndex === -1) {
    return input;
  }
  return input.slice(commaIndex + 1);
}

let cachedModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel(): ReturnType<GoogleGenerativeAI["getGenerativeModel"]> {
  if (cachedModel) {
    return cachedModel;
  }

  const rawKey = requiredEnv("GEMINI_API_KEY");
  const genAI = new GoogleGenerativeAI(rawKey.trim());
  cachedModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  return cachedModel;
}

export async function extractTextFromFrame(base64: string): Promise<string> {
  const model = getModel();
  const cleanBase64 = stripDataUrlPrefix(base64);
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64
      }
    },
    "Extract only visible text from this image. Return plain text only."
  ]);

  return result.response.text().trim();
}

function toGeminiRole(role: Message["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

export async function* streamChat(
  messages: Message[],
  systemPrompt: string,
  image?: ImageInput
): AsyncGenerator<string> {
  const model = getModel();
  if (messages.length === 0) {
    return;
  }

  const chat = model.startChat({
    systemInstruction: systemPrompt,
    history: messages.slice(0, -1).map((message) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: message.content }]
    }))
  });

  const latest = messages[messages.length - 1];
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (image) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: stripDataUrlPrefix(image.base64)
      }
    });
  }
  parts.push({ text: latest.content });

  const result = await chat.sendMessageStream(parts);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}
