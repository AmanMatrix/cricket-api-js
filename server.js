const http = require("http");
const url = require("url");
const { processUrl } = require("./api/process");

const server = http.createServer(async (req, res) => {
  const queryObject = url.parse(req.url, true).query;

  if (req.url.startsWith("/process")) {
    const targetUrl = queryObject.url;

    if (!targetUrl) {
      res.writeHead(400);
      return res.end("URL is required");
    }

    try {
      const result = await processUrl(targetUrl);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (err) {
      res.writeHead(500);
      res.end(err.message);
    }
  } else {
    res.writeHead(200);
    res.end("Server Running");
  }
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});