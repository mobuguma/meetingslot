// 전체 레이아웃: 모든 페이지에 공통으로 적용되는 메타데이터와 기본 스타일을 정의합니다.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetSlot - 미팅 시간 조율",
  description: "여러 사람의 가능한 시간을 모아 최적의 미팅 시간을 찾아보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans bg-neutral-50 text-neutral-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
