import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics />       {/* 👈 Theo dõi lượt truy cập */}
        <SpeedInsights />   {/* 👈 Theo dõi hiệu năng */}
      </body>
    </html>
  )
}
