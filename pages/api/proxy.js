export default async function handler(req, res) {
  // Danh sách domain được phép
  const allowedOrigins = [
    "https://studentidcard.me",
    "http://127.0.0.1:5500/index.html"
  ];
  const origin = req.headers.origin;

  // Xử lý preflight CORS
  if (req.method === "OPTIONS") {
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    return res.status(200).end();
  }

  try {
    // Timeout để tránh treo request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 giây
    const response = await fetch("https://thispersondoesnotexist.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Upstream error", {
        status: response.status,
        headers: Object.fromEntries(response.headers),
      });
      throw new Error(`Upstream returned ${response.status}`);
    }

    // Gắn CORS vào response chính
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");

    // Pipe stream trực tiếp để tiết kiệm RAM
    response.body.pipe(res);

  } catch (error) {
    console.error("Proxy error:", error);
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout sau 3s" });
    }
    res.status(500).json({ error: "Không lấy được ảnh", detail: error.message });
  }
}
