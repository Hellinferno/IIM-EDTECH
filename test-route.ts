import fs from "fs";

async function test() {
    const fileData = fs.readFileSync("test.png"); // We'll create a 1x1 test.png first
    const file = new File([fileData], "test.png", { type: "image/png" });

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("http://localhost:3000/api/image", {
        method: "POST",
        body: formData
    });

    console.log("Status:", res.status);

    if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            console.log(decoder.decode(value));
        }
    } else {
        console.log("No body");
    }
}

test();
