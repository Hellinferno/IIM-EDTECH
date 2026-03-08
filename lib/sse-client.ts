export type SSEDataHandler = (value: string) => void;

export async function consumeSSE(
  response: Response,
  onData: SSEDataHandler
): Promise<void> {
  if (!response.ok || !response.body) {
    throw new Error("Streaming response failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventText of events) {
      const dataLines = eventText
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6));

      for (const data of dataLines) {
        onData(data);
      }
    }
  }
}
