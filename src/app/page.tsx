"use client";

// SCR-001: 홈 / 이벤트 생성 페이지
// 주최자가 이벤트 이름, 날짜, 시간 범위를 설정하고 공유 링크를 생성합니다.
// 이벤트 생성 완료 시 헤더 타이틀("새 이벤트 만들기")을 숨깁니다 (SPEC-001 4.5).

import { useState } from "react";
import EventForm from "@/components/EventForm";

export default function HomePage() {
  // 이벤트 생성 완료 여부: 완료 시 "새 이벤트 만들기" 헤더 숨김
  const [isCompleted, setIsCompleted] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-neutral-50">
      <div className="w-full max-w-5xl">
        {/* 서비스 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-1">MeetSlot</h1>
          <p className="text-sm text-neutral-600">
            링크 하나로 모두의 가능한 시간을 모아보세요.
          </p>
        </div>

        {/* 이벤트 생성 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-8">
          {/* 생성 완료 시 헤더 타이틀 숨김 (SPEC-001 4.5) */}
          {!isCompleted && (
            <h2 className="text-lg font-semibold text-neutral-900 mb-6">새 이벤트 만들기</h2>
          )}
          <EventForm onComplete={() => setIsCompleted(true)} onReset={() => setIsCompleted(false)} />
        </div>
      </div>
    </main>
  );
}
