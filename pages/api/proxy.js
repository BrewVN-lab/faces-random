export const runtime = 'edge';

const FALLBACK_IMAGE = "https://placehold.co/512x512?text=Retry+Later";

export default async function handler(req) {
  const origin = req.headers.get("origin");

  const allowedOrigins = [
    "https://*.toolkitmmo.com",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
  ];

  const corsHeaders = new Headers({
    "Cache-Control": "no-store",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Vary": "Origin",
  });

  if (allowedOrigins.includes(origin)) {
    corsHeaders.set("Access-Control-Allow-Origin", origin);
    corsHeaders.set("Access-Control-Allow-Credentials", "true");
  } else {
    corsHeaders.set("Access-Control-Allow-Origin", "*");
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch("https://thispersondoesnotexist.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);

    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        ...Object.fromEntries(corsHeaders),
        "Content-Type": "image/jpeg",
        "X-Cache": "NONE",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);

    const fallback = await fetch(FALLBACK_IMAGE);
    const fallbackBuffer = await fallback.arrayBuffer();

    return new Response(fallbackBuffer, {
      status: 200,
      headers: {
        ...Object.fromEntries(corsHeaders),
        "Content-Type": "image/png",
        "X-Cache": "FALLBACK",
      },
    });
  }
}