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
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) throw new Error("Missing OPENAI_API_KEY");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Prompt cho ảnh thẻ sinh viên chân thực
    const prompt = `Photorealistic student ID portrait, 512x512, centered face, neutral expression, plain white background, even lighting, high detail, no watermarks, no text. Should look like a typical university ID photo.`;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "imagen-4.0-generate-001",
        input: [
          {
            role: "user",
            content: [
              { type: "output_text", text: prompt },
              // Request image output metadata; exact schema may vary by API version.
              { type: "input_image", image: { mime_type: "image/png", size: "512x512", background: "white" } }
            ]
          }
        ],
        // optional safety / params can be added here
      }),
    });

    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`Upstream error: ${resp.status}`);

    const data = await resp.json();

    // Tìm phần output chứa ảnh (thử nhiều cấu trúc vì API có thể khác nhau)
    let b64 = null;
    try {
      // common shapes: data.output[0].content includes an object with type 'image' and image.data (base64)
      const output = data.output || data.outputs || data;
      if (Array.isArray(output)) {
        for (const o of output) {
          if (o?.content) {
            for (const c of o.content) {
              if (c?.type === "image" && c?.image?.data) {
                b64 = c.image.data;
                break;
              }
              if (c?.type === "input_image" && c?.image?.b64_json) {
                b64 = c.image.b64_json;
                break;
              }
            }
          }
          if (b64) break;
        }
      }
      // fallback paths
      if (!b64 && data?.output?.[0]?.content?.[0]?.image?.data) {
        b64 = data.output[0].content[0].image.data;
      }
      if (!b64 && data?.output?.[0]?.content?.[0]?.b64_json) {
        b64 = data.output[0].content[0].b64_json;
      }
    } catch (e) {
      // ignore and let b64 be null
    }

    if (!b64) throw new Error("No image data returned from model");

    // Decode base64 -> Uint8Array
    const binaryString = globalThis.atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    return new Response(bytes.buffer, {
      status: 200,
      headers: {
        ...Object.fromEntries(corsHeaders),
        "Content-Type": "image/png",
        "X-Cache": "MODEL_IMAGEN",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);

    // Fallback to placeholder image
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