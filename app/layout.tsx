import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RE-REPORT | 가맹점 리뷰 분석',
  description: 'AI 기반 가맹점 리뷰 분석 및 리포트 생성 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

