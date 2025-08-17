import { Analytics } from "vercel/analytics/next";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />   {/* 👈 Bật tracking ở đây */}
      </body>
    </html>
  );
}
