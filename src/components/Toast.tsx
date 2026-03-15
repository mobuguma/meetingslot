"use client";

// 토스트 알림 컴포넌트: 화면 상단 중앙에 메시지를 일시적으로 표시합니다.
// 스펙에서 에러/성공 피드백을 "중앙 정렬 토스트"로 표시하도록 명시되어 있습니다.

interface Props {
  message: string;
}

export default function Toast({ message }: Props) {
  // 메시지가 없으면 렌더링하지 않음
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-sm px-5 py-3 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
      {message}
    </div>
  );
}
