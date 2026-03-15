// SCR-002 + SCR-003: 이벤트 참여 페이지
// 참여자 이름 입력 → 시간 그리드 선택 → 그룹 오버레이 확인

import EventPageClient from "@/components/EventPageClient";

interface Props {
  params: Promise<{ eventId: string }>;
}

export default async function EventPage({ params }: Props) {
  const { eventId } = await params;
  return <EventPageClient eventId={eventId} />;
}
