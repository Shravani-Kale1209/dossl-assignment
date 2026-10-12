const http = require("http");
const fs = require("fs");
const path = require("path");
const { register, httpRequestsTotal, httpRequestDurationSeconds } = require("./metrics");

const PORT = process.env.PORT || 3000;
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

function createServer() {
    return http.createServer((req, res) => {
        const pathname = new URL(req.url, "http://localhost").pathname;
        const isMetricsRequest = pathname === "/metrics";
        const route = pathname === "/"
            ? "home"
            : path.extname(pathname)
                ? "static_asset"
                : "not_found";
        const method = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
            .includes(req.method)
            ? req.method
            : "OTHER";
        const startTime = process.hrtime.bigint();

        if (!isMetricsRequest) {
            res.once("finish", () => {
                const labels = {
                    method,
                    route,
                    status_code: String(res.statusCode)
                };
                httpRequestsTotal.inc(labels);
                httpRequestDurationSeconds.observe(
                    labels,
                    Number(process.hrtime.bigint() - startTime) / 1e9
                );
            });
        }

        if (isMetricsRequest) {
            register.metrics()
                .then((metrics) => {
                    res.writeHead(200, {
                        "Content-Type": register.contentType
                    });
                    res.end(metrics);
                })
                .catch((error) => {
                    console.error("Failed to generate Prometheus metrics:", error);
                    res.writeHead(500, {
                        "Content-Type": "text/plain"
                    });
                    res.end("Failed to generate metrics");
                });
            return;
        }

        const requestedFile = pathname === "/"
            ? "index.html"
            : pathname.substring(1);
        const filePath = path.join(publicDirectory, requestedFile);

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
}

if (require.main === module) {
    createServer().listen(PORT, () => {
        console.log(`Student Task Manager running at http://localhost:${PORT}`);
    });
}

module.exports = { createServer };
