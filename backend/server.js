import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // API endpoint
  if (parsedUrl.pathname === "/api/images") {
        const imagesDir = path.join(__dirname, "images");


    fs.readdir(imagesDir, (err, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unable to fetch images" }));
        return;
      }

      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(imageFiles.map(f => `/images/${f}`)));
    });
    return;
  }

  // Serve images
  if (parsedUrl.pathname.startsWith("/images/")) {
    const filePath = path.join(__dirname, "backend", parsedUrl.pathname);
    return serveFile(filePath, res);
  }

  // Serve frontend files (default to index.html)
  let filePath = path.join(__dirname, "frontend", parsedUrl.pathname);
  if (parsedUrl.pathname === "/") {
    filePath = path.join(__dirname, "frontend", "index.html");
  }
  serveFile(filePath, res);
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
