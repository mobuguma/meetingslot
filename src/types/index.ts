// MeetSlot 프로젝트에서 사용하는 TypeScript 타입 정의

// 이벤트: 주최자가 생성한 미팅 일정 조율 단위
export interface Event {
  id: string;
  title: string;
  dates: string[];       // 선택된 날짜 배열 (예: ["2026-03-15", "2026-03-16"])
  startTime: string;     // 시작 시간 (예: "09:00")
  endTime: string;       // 종료 시간 (예: "18:00")
  timezone: string;
  createdAt: string;
  responses: Response[]; // GET /api/events/[eventId] 응답에 포함되는 참여자 응답 목록
}

// 참여자 응답: 개인의 가용 시간 슬롯 정보
export interface Response {
  id: string;
  eventId: string;
  name: string;
  password?: string;     // 응답 수정 시 본인 확인용 비밀번호 (클라이언트에는 미전달)
  slots: string[];       // 선택한 시간 슬롯 (예: ["2026-03-15T09:00", "2026-03-15T09:30"])
  createdAt: string;
  updatedAt: string;
}

// 이벤트 생성 요청 바디
export interface CreateEventBody {
  title: string;
  dates: string[];
  startTime: string;
  endTime: string;
  timezone?: string;
}

// 응답 저장 요청 바디
export interface SaveResponseBody {
  eventId: string;
  name: string;
  password: string;      // 응답 수정 시 본인 확인용 비밀번호 (필수, 빈 문자열 허용)
  slots: string[];
}

// 그룹 오버레이에서 슬롯별 참여자 집계 정보
export interface SlotAggregation {
  slot: string;
  available: string[];   // 가능한 참여자 이름 목록
  unavailable: string[]; // 불가능한 참여자 이름 목록
  count: number;         // 가능 인원 수
}
