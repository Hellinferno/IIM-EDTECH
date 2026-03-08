import type { Message } from "@/types";

export function isValidMessageList(input: unknown): input is Message[] {
  if (!Array.isArray(input)) {
    return false;
  }
  return input.every((message) => {
    if (!message || typeof message !== "object") {
      return false;
    }
    const candidate = message as Partial<Message>;
    return (
      typeof candidate.id === "string" &&
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.content === "string" &&
      typeof candidate.createdAt === "number"
    );
  });
}

export function sseResponse(
  streamFactory: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamFactory(controller);
      } catch {
        controller.enqueue(encoder.encode("data: [ERROR]\n\n"));
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
