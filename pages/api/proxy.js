import { pipeline } from "node:stream";
import { promisify } from "node:util";
const streamPipeline = promisify(pipeline);

const allowedOrigins = new Set([
  "https://studentidcard.me",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
]);

function setCors(res, origin, { isPreflight = false } = {}) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "*";
  // Nếu cần credentials, KHÔNG dùng *
  if (allowOrigin !== "*") {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, Accept, Content-Type, Authorization, X-Requested-With"
  );
  // Cho phép client đọc các header này
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Type, Content-Length, Cache-Control"
  );

  if (isPreflight) {
    // Cache preflight 10 phút
    res.setHeader("Access-Control-Max-Age", "600");
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    setCors(res, origin, { isPreflight: true });
    return res.status(204).end();
  }

  if (method !== "GET") {
    setCors(res, origin);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Cho phép override timeout qua query (?timeout=2000)
  const timeoutMs = Math.max(
    200, // sàn an toàn
    Math.min(10_000, Number(req.query.timeout) || 1500) // mặc định 1.5s
  );

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  // Hủy fetch nếu client đóng kết nối
  req.on("aborted", () => controller.abort());

  try {
    const upstream = "https://thispersondoesnotexist.com";
    const response = await fetch(upstream, {
      headers: {
        // Một số upstream chặn UA “trống”
        "User-Agent": "Mozilla/5.0 Proxy/1.0",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      throw new Error(`Upstream ${response.status} ${response.statusText}`);
    }

    // CORS trước
    setCors(res, origin);

    // Forward header quan trọng nếu có
    const ct = response.headers.get("content-type") || "application/octet-stream";
    const cl = response.headers.get("content-length");
    res.setHeader("Content-Type", ct);
    if (cl) res.setHeader("Content-Length", cl);

    // Cache strategy: luôn mới (giống code của bạn)
    res.setHeader("Cache-Control", "no-store");
    // Tuỳ chọn: hỗ trợ nhúng cross-origin
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    res.status(200);
    // Stream để tiết kiệm RAM/latency
    await streamPipeline(response.body, res);
  } catch (error) {
    console.error("Proxy error:", error);
    setCors(res, origin);
    if (error.name === "AbortError") {
      return res.status(504).json({ error: `Request timeout sau ${timeoutMs}ms` });
    }
    res.status(502).json({ error: "Không lấy được ảnh từ upstream", detail: String(error.message || error) });
  } finally {
    clearTimeout(t);
  }
}
