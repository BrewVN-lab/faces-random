export default async function handler(req, res) {
  try {
    const response = await fetch("https://thispersondoesnotexist.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ✅ Thêm CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*"); // hoặc thay * bằng domain của bạn
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Không lấy được ảnh", detail: error.message });
  }
}
