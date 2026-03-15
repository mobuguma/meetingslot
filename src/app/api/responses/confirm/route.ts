// POST /api/responses/confirm: 이름+비밀번호로 기존 응답 확인
// found: true + slots → 기존 응답 존재, 수정 모드
// found: false → 신규 응답, 빈 슬롯으로 시작
// 401 → 이름은 있지만 비밀번호 불일치

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { eventId, name, password } = await req.json();

  // 필수 값 누락 검증
  if (!eventId || !name?.trim()) {
    return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  // 이름으로 기존 응답 조회
  const existing = await db.response.findUnique({
    where: { eventId_name: { eventId, name: name.trim() } },
  });

  // 기존 응답이 없으면 신규 참여자로 처리
  if (!existing) {
    return NextResponse.json({ found: false, slots: [] });
  }

  // 비밀번호 불일치 시 401 반환
  if (existing.password !== (password ?? "")) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  // 기존 슬롯 반환 (event.timezone 기준)
  return NextResponse.json({ found: true, slots: JSON.parse(existing.slots) });
}
