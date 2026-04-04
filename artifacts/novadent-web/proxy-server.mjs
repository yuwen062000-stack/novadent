import http from "http";

const PORT = parseInt(process.env.PORT || "25596");
const TARGET = "http://localhost:3001";
const BASE_PATH = process.env.BASE_PATH || "/novadent-web/";

const server = http.createServer((req, res) => {
  let targetPath = req.url || "/";
  if (targetPath.startsWith(BASE_PATH)) {
    targetPath = targetPath.slice(BASE_PATH.length - 1);
  }

  const options = {
    hostname: "localhost",
    port: 3001,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: "localhost:3001" },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let body = proxyRes.headers["content-type"] || "";
    if (body.includes("text/html")) {
      let chunks = [];
      proxyRes.on("data", (c) => chunks.push(c));
      proxyRes.on("end", () => {
        let html = Buffer.concat(chunks).toString();
        html = html.replace(/(href|src|action)="\//g, `$1="${BASE_PATH}`);
        const headers = { ...proxyRes.headers };
        delete headers["content-length"];
        headers["transfer-encoding"] = "chunked";
        res.writeHead(proxyRes.statusCode || 200, headers);
        res.end(html);
      });
    } else {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502);
    res.end("Bad Gateway - NestJS backend not available");
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Novadent proxy server listening on port ${PORT}, forwarding to ${TARGET}`);
});
