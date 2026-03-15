// POST /api/responses: 참여자의 가용 시간 슬롯을 저장하거나 갱신합니다.
// 같은 이벤트에 동일 이름으로 재접속하면 비밀번호 검증 후 기존 응답을 덮어씁니다.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SaveResponseBody } from "@/types";

export async function POST(req: NextRequest) {
  const body: SaveResponseBody = await req.json();

  // 필수 필드 검증
  if (!body.eventId) {
    return NextResponse.json({ error: "이벤트 ID가 필요합니다." }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }

  // 이벤트 존재 여부 확인
  const event = await db.event.findUnique({ where: { id: body.eventId } });
  if (!event) {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  }

  const password = body.password ?? "";
  const trimmedName = body.name.trim().slice(0, 50);

  // 기존 응답 존재 여부 확인 (비밀번호 검증용)
  const existing = await db.response.findUnique({
    where: { eventId_name: { eventId: body.eventId, name: trimmedName } },
  });

  // 기존 응답이 있고 비밀번호가 다르면 401 반환
  if (existing && existing.password !== password) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  // 중복 이름이면 기존 응답 수정, 없으면 새로 생성 (비밀번호 포함)
  await db.response.upsert({
    where: { eventId_name: { eventId: body.eventId, name: trimmedName } },
    update: { slots: JSON.stringify(body.slots ?? []) },
    create: {
      eventId: body.eventId,
      name: trimmedName,
      password,
      slots: JSON.stringify(body.slots ?? []),
    },
  });

  return NextResponse.json({ success: true });
}
