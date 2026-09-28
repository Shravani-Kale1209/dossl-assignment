const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const publicDirectory = path.join(__dirname, "public");

const mimeTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg"
};

const server = http.createServer((req, res) => {
    let requestedFile = req.url === "/"
        ? "index.html"
        : req.url.substring(1);

    const filePath = path.join(publicDirectory, requestedFile);

    // Prevent access outside the public directory
    if (!filePath.startsWith(publicDirectory)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, {
                "Content-Type": "text/plain"
            });

            res.end("File not found");
            return;
        }

        const extension = path.extname(filePath);
        const contentType = mimeTypes[extension] || "application/octet-stream";

        res.writeHead(200, {
            "Content-Type": contentType
        });

        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`Student Task Manager running at http://localhost:${PORT}`);
});
