export default function Home() {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>Ảnh từ Proxy Vercel</h1>
      <img src="/api/proxy" alt="Fake Person" style={{ borderRadius: "10px" }} />
      <p>Reload trang để đổi ảnh mới.</p>
    </div>
  );
}
