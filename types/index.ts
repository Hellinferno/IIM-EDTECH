export type ChatRole = "user" | "assistant";
export type AppMode = "live_ocr" | "live_ocr_agent" | "send_image" | "voice_agent";

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface ImageInput {
  base64: string;
  mimeType: string;
}

