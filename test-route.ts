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

    const text = await res.text();
    fs.writeFileSync('500-error.html', text);
    console.log("Wrote HTML to 500-error.html");
}

test();
