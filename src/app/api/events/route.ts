// POST /api/events: 새 이벤트를 생성하고 eventId와 공유 URL을 반환합니다.
// eventId는 8자 hex 문자열 (crypto.randomBytes 기반) — 짧고 URL 친화적

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { CreateEventBody } from "@/types";

export async function POST(req: NextRequest) {
  const body: CreateEventBody = await req.json();

  // 필수 필드 검증
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "이벤트 이름을 입력해 주세요." }, { status: 400 });
  }
  if (!body.dates || body.dates.length === 0) {
    return NextResponse.json({ error: "날짜를 선택해 주세요." }, { status: 400 });
  }
  if (!body.startTime || !body.endTime) {
    return NextResponse.json({ error: "시간 범위를 설정해 주세요." }, { status: 400 });
  }

  // 8자 hex ID 생성 (4바이트 랜덤 → 16진수 8자리)
  // cuid 대신 짧은 ID를 사용해 URL을 간결하게 유지
  const shortId = randomBytes(4).toString("hex");

  const event = await db.event.create({
    data: {
      id: shortId,
      title: body.title.trim().slice(0, 100),
      dates: JSON.stringify(body.dates),
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone ?? "Asia/Seoul",
    },
  });

  // SPEC: eventId와 공유 URL을 함께 반환
  // NEXT_PUBLIC_BASE_PATH가 설정된 프록시 환경에서는 basePath를 URL에 포함해야 합니다.
  // (예: /proxy/3000/cmmrkhtp90000bg3eoehlqwka)
  const baseUrl = req.headers.get("origin") ?? "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return NextResponse.json(
    { eventId: event.id, url: `${baseUrl}${basePath}/${event.id}` },
    { status: 201 }
  );
}
