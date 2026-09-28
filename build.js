const fs = require("fs");
const path = require("path");

console.log("Starting application build validation...");

const requiredFiles = [
    "public/index.html",
    "public/style.css",
    "public/script.js",
    "app.js",
    "build.js",
    "package.json"
];

let buildFailed = false;

for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.error(`Build Failed: ${file} not found`);
        buildFailed = true;
    }
}

if (buildFailed) {
    console.error("Build validation failed.");
    process.exit(1);
}

console.log("Application files validated successfully.");
console.log("Build completed successfully.");

process.exit(0);
