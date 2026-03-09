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

/** Max conversation turns (user+assistant pairs) sent as history to save tokens. */
const MAX_HISTORY_TURNS = 6;

function getModel(
  systemInstruction?: string,
  maxOutputTokens = 1024
): ReturnType<GoogleGenerativeAI["getGenerativeModel"]> {
  const rawKey = requiredEnv("GEMINI_API_KEY");
  const genAI = new GoogleGenerativeAI(rawKey.trim());
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens,
      temperature: 0.4
    },
    ...(systemInstruction && {
      systemInstruction: {
        role: "user" as const,
        parts: [{ text: systemInstruction }]
      }
    })
  });
}

/** Keep only the last N user+assistant turns to cap input tokens. */
function trimHistory(messages: Message[], maxTurns: number): Message[] {
  if (messages.length <= maxTurns * 2) {
    return messages;
  }
  return messages.slice(-maxTurns * 2);
}

export async function extractTextFromFrame(base64: string): Promise<string> {
  const model = getModel(undefined, 512);
  const cleanBase64 = stripDataUrlPrefix(base64);
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64
      }
    },
    "Extract all visible text from this image. Reproduce math expressions in LaTeX (e.g. $x^2 + 3x = 0$). Return nothing else."
  ]);

  return result.response.text().trim();
}

function toGeminiRole(role: Message["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

export async function* streamChat(
  messages: Message[],
  systemPrompt: string,
  image?: ImageInput,
  maxOutputTokens = 1024
): AsyncGenerator<string> {
  const model = getModel(systemPrompt, maxOutputTokens);
  if (messages.length === 0) {
    return;
  }

  const trimmed = trimHistory(messages, MAX_HISTORY_TURNS);

  const chat = model.startChat({
    history: trimmed.slice(0, -1).map((message) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: message.content }]
    }))
  });

  const latest = trimmed[trimmed.length - 1];
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
    try {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    } catch {
      // Skip chunks without text (e.g. thinking/reasoning chunks)
      continue;
    }
  }
}
