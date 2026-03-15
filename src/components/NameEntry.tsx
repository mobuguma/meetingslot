"use client";

// 이름 입력 컴포넌트
// 참여자가 이름을 입력하면 시간 선택 그리드로 넘어갑니다.
// 이미 응답한 이름을 입력하면 기존 데이터를 불러와 수정 모드로 진입합니다.

interface Props {
  onSubmit: (name: string) => void;
}

import { useState } from "react";

export default function NameEntry({ onSubmit }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("이름을 입력해 주세요.");
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          참여자 이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          maxLength={50}
          placeholder="예: 홍길동"
          autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        시작하기
      </button>
    </form>
  );
}
