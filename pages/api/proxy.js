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
    // Prefer GOOGLE_API_KEY; fallback to OPENAI_API_KEY if user put Google key there
    const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
    if (!GOOGLE_KEY) throw new Error("Missing GOOGLE_API_KEY in environment (.env.local)");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s

    // Prompt cho ảnh thẻ sinh viên
    const prompt = `Photorealistic student ID portrait, 512x512, centered face, neutral expression, plain white background, even lighting, high detail, no watermarks, no text. Should look like a typical university ID photo.`;

    // Google GenAI Images endpoint (uses API key query param)
    const url = `https://generativeai.googleapis.com/v1/images:generate?key=${encodeURIComponent(GOOGLE_KEY)}`;

    const body = {
      model: "image-bison-001",
      prompt: {
        // plain text prompt
        text: prompt
      },
      // Try requesting PNG 512x512; exact params depend on API version
      image_format: "PNG",
      // some API variants accept size or width/height — include a hint
      size: "512x512"
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Google GenAI error ${resp.status} ${txt}`);
    }

    const data = await resp.json();

    // Log returned JSON for debugging (check terminal)
    console.log("Google GenAI images result:", JSON.stringify(data));

    // Generic finder for base64 image data or URL in response
    function findImageCandidate(obj) {
      if (!obj || typeof obj !== "object") return null;
      if (typeof obj.image === "string" && obj.image.length > 100) return { type: "b64", data: obj.image };
      if (typeof obj.b64 === "string") return { type: "b64", data: obj.b64 };
      if (typeof obj.b64_json === "string") return { type: "b64", data: obj.b64_json };
      if (obj.images && Array.isArray(obj.images) && obj.images[0]) {
        const it = obj.images[0];
        if (typeof it.image === "string") return { type: "b64", data: it.image };
        if (typeof it.b64 === "string") return { type: "b64", data: it.b64 };
        if (typeof it.url === "string") return { type: "url", data: it.url };
      }
      if (obj.result && typeof obj.result === "object") {
        return findImageCandidate(obj.result);
      }
      // recursively search
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (Array.isArray(v)) {
          for (const it of v) {
            const found = findImageCandidate(it);
            if (found) return found;
          }
        } else if (typeof v === "object" && v !== null) {
          const found = findImageCandidate(v);
          if (found) return found;
        }
      }
      return null;
    }

    const candidate = findImageCandidate(data);
    if (!candidate) throw new Error("No image data returned from Google GenAI");

    if (candidate.type === "url") {
      const fetched = await fetch(candidate.data);
      if (!fetched.ok) throw new Error(`Failed to fetch image URL: ${fetched.status}`);
      const buffer = await fetched.arrayBuffer();
      return new Response(buffer, {
        status: 200,
        headers: {
          ...Object.fromEntries(corsHeaders),
          "Content-Type": fetched.headers.get("Content-Type") || "image/png",
          "X-Cache": "GOOGLE_IMAGE_URL",
        },
      });
    }

    // candidate.type === 'b64'
    const b64 = candidate.data.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = globalThis.atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    return new Response(bytes.buffer, {
      status: 200,
      headers: {
        ...Object.fromEntries(corsHeaders),
        "Content-Type": "image/png",
        "X-Cache": "GOOGLE_IMAGE_B64",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);

    // Fallback to placeholder image
    try {
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
    } catch (e) {
      return new Response("Error", { status: 500, headers: corsHeaders });
    }
  }
}