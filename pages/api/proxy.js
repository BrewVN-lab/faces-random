export default async function handler(req, res) {
  try {
    const response = await fetch("https://thispersondoesnotexist.com", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: "Không lấy được ảnh" });
  }
}
