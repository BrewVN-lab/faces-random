// pages/index.tsx

import { useEffect, useState } from "react";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchImage() {
      setLoading(true);
      setImage(null);
      try {
        const res = await fetch("/api/gen-student-photo");
        const data = await res.json();
        if (data.image) {
          setImage(`data:image/png;base64,${data.image}`);
        }
      } catch {
        setImage(null);
      }
      setLoading(false);
    }
    fetchImage();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1>Ảnh thẻ sinh viên AI tự động</h1>
      {loading && <p>Đang sinh ảnh...</p>}
      {image && (
        <img
          src={image}
          alt="Student ID"
          style={{
            border: "1px solid #ccc",
            borderRadius: 12,
            marginTop: 24,
            width: 240,
            height: 320,
            objectFit: "cover",
            background: "#f4f4f4",
          }}
        />
      )}
      {!loading && !image && (
        <p>Lỗi khi lấy ảnh. Kiểm tra lại API Key hoặc quota Google GenAI.</p>
      )}
    </div>
  );
}
