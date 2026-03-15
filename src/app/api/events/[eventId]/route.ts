// GET /api/events/[eventId]: 특정 이벤트와 전체 참여자 응답을 조회합니다.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { responses: true },
  });

  if (!event) {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  }

  // DB에 JSON 문자열로 저장된 dates와 slots를 배열로 파싱하여 반환
  // 보안: 비밀번호는 클라이언트에 노출하지 않음
  return NextResponse.json({
    ...event,
    dates: JSON.parse(event.dates),
    responses: event.responses.map((r) => ({
      ...r,
      password: undefined, // 비밀번호는 클라이언트에 노출하지 않음
      slots: JSON.parse(r.slots),
    })),
  });
}
