// 이벤트 관련 비즈니스 로직 유틸리티

import { SlotAggregation } from "@/types";
import { Response } from "@/types";

// 모든 참여자의 응답을 슬롯별로 집계합니다.
// 슬롯마다 가능/불가능 인원을 정리하여 그룹 오버레이에 사용합니다.
export function aggregateResponses(
  responses: Response[],
  allSlots: string[]
): SlotAggregation[] {
  const participantNames = responses.map((r) => r.name);

  return allSlots.map((slot) => {
    // 해당 슬롯을 선택한 참여자(가능) / 선택하지 않은 참여자(불가능) 분류
    const available = responses
      .filter((r) => r.slots.includes(slot))
      .map((r) => r.name);
    const unavailable = participantNames.filter(
      (name) => !available.includes(name)
    );

    return {
      slot,
      available,
      unavailable,
      count: available.length,
    };
  });
}

// 전체 참여자 수 대비 가능 인원 비율로 색상 농도를 계산합니다.
// 0 = 투명(아무도 불가), 1 = 가장 진함(전원 가능)
export function calcIntensity(count: number, total: number): number {
  if (total === 0) return 0;
  return count / total;
}
