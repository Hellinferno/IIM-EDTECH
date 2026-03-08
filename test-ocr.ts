import { extractTextFromFrame } from "./lib/gemini";

async function test() {
    try {
        const result = await extractTextFromFrame(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        );
        console.log("Success:", result);
    } catch (e) {
        console.error("Crash:", e);
    }
}

test();
