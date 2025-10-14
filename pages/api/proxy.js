export const runtime = 'edge';

export default async function handler(req) {
  const allowedOrigins = [
    "https://*.toolkitmmo.com",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501"
  ];

  const origin = req.headers.get("origin");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // tăng lên 3s để tránh timeout sớm

    const response = await fetch("https://thispersondoesnotexist.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();

    // CORS headers
    const headers = new Headers({
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Vary": "Origin",
    });

    if (allowedOrigins.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");
    } else {
      headers.set("Access-Control-Allow-Origin", "*");
    }

    return new Response(imageBuffer, { status: 200, headers });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Không lấy được ảnh", detail: error.message }),
      {
        status: error.name === "AbortError" ? 504 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
