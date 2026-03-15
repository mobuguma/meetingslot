// SCR-004: 이벤트 없음 (404) 페이지
// Next.js App Router의 not-found.tsx로 자동 렌더링됩니다.
// 존재하지 않는 이벤트 ID 또는 잘못된 URL 접근 시 표시됩니다.

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-neutral-50">
      {/* 아이콘 */}
      <div className="text-5xl text-neutral-300 mb-5">🔍</div>

      {/* 제목 */}
      <h1 className="text-xl font-semibold text-neutral-900 mb-2">
        이벤트를 찾을 수 없어요.
      </h1>

      {/* 설명 */}
      <p className="text-sm text-neutral-600 text-center mb-8">
        링크가 잘못되었거나<br />이미 삭제된 이벤트입니다.
      </p>

      {/* CTA 버튼 */}
      <Link
        href="/"
        className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
      >
        새 이벤트 만들기
      </Link>
    </main>
  );
}
