"use client";

// SCR-003: 그룹 오버레이 컴포넌트
// PC(600px+): 좌=시간 그리드, 우=응답자 목록(항상 노출, 슬롯 클릭 시 하이라이트)
// Mobile: 그리드만 표시 + 슬롯 클릭 시 모달, "N명 응답" 클릭 시 전체 응답자 모달

import { useMemo, useState } from "react";
import { generateTimeSlots, buildSlotKey, formatDateLabel, shiftDate, timeToMin, formatSlotLabel } from "@/lib/time";
import { Response } from "@/types";

interface Props {
  dates: string[];
  startTime: string;
  endTime: string;
  responses: Response[];
}

// 인원 비율에 따른 Tailwind 색상 클래스 반환 (SPEC-003 3.1)
function getSlotColorClass(count: number, total: number): { bg: string; textColor: string } {
  if (total === 0 || count === 0) return { bg: "bg-white", textColor: "text-transparent" };
  if (count === total) return { bg: "bg-primary-700", textColor: "text-white" };
  const ratio = count / total;
  if (ratio <= 0.25) return { bg: "bg-primary-light", textColor: "text-primary-dark" };
  if (ratio <= 0.5) return { bg: "bg-primary-300", textColor: "text-white" };
  return { bg: "bg-primary-500", textColor: "text-white" };
}

// 모바일 하단 시트 공통 컨테이너 (슬롯 모달, 전체 응답자 모달에서 재사용)
function MobileBottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="sm600:hidden fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-5 max-h-[50vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function GroupOverlay({ dates, startTime, endTime, responses }: Props) {
  const timeSlots = useMemo(() => generateTimeSlots(startTime, endTime), [startTime, endTime]);
  const totalParticipants = responses.length;

  // 선택된 슬롯 키 (그리드 클릭)
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  // 모바일: 슬롯 클릭 모달
  const [showSlotModal, setShowSlotModal] = useState(false);
  // 모바일: 전체 응답자 모달 (N명 응답 클릭)
  const [showAllModal, setShowAllModal] = useState(false);

  const startMinOfDay = timeToMin(startTime);
  const hasWrapAround = timeToMin(endTime) < startMinOfDay;

  // 슬롯별 가능 인원 수 맵
  const slotCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const response of responses) {
      for (const slot of response.slots) {
        map.set(slot, (map.get(slot) ?? 0) + 1);
      }
    }
    return map;
  }, [responses]);

  // 선택된 슬롯의 가능 참여자 목록 (eslint-disable 없이 deps 명확히 선언)
  const selectedSlotParticipants = useMemo(
    () => selectedSlotKey
      ? responses.filter((r) => r.slots.includes(selectedSlotKey)).map((r) => r.name)
      : [],
    [selectedSlotKey, responses]
  );

  // 슬롯 클릭 핸들러: PC/모바일 UI 분리는 CSS로 처리 (window.innerWidth 읽기 불필요)
  // PC에서는 sm600:hidden으로 모달이 숨겨지고, 모바일에서는 hidden sm600:block으로 패널이 숨겨짐
  function handleSlotClick(slotKey: string) {
    if (selectedSlotKey === slotKey) {
      setSelectedSlotKey(null);
      setShowSlotModal(false);
    } else {
      setSelectedSlotKey(slotKey);
      setShowSlotModal(true);
    }
  }

  return (
    <div>
      {/* 총 응답자 수 - 모바일에서는 클릭 가능 (PC에서는 커서 기본값 유지) */}
      <p
        className={`text-xs text-neutral-600 mb-3 ${totalParticipants > 0 ? "cursor-pointer sm600:cursor-default underline decoration-dotted sm600:no-underline" : ""}`}
        onClick={() => { if (totalParticipants > 0) setShowAllModal(true); }}
      >
        {totalParticipants === 0
          ? "아직 응답한 참여자가 없습니다."
          : `총 ${totalParticipants}명 응답`}
      </p>

      <div className="flex gap-4">
        {/* 그룹 오버레이 그리드 */}
        <div className="overflow-x-auto flex-1">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-14 p-1" />
                {dates.map((date) => (
                  <th key={date} className="p-1 text-center font-medium text-neutral-600 min-w-[2.5rem] whitespace-nowrap">
                    {formatDateLabel(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => {
                const isNextDay = hasWrapAround && timeToMin(time) < startMinOfDay;
                return (
                  <tr key={time}>
                    <td className="pr-2 text-right text-neutral-400 whitespace-nowrap align-top pt-1">
                      {time.endsWith(":00") ? time : ""}
                    </td>
                    {dates.map((date) => {
                      const actualDate = isNextDay ? shiftDate(date, 1) : date;
                      const slotKey = buildSlotKey(actualDate, time);
                      const count = slotCountMap.get(slotKey) ?? 0;
                      const { bg, textColor } = getSlotColorClass(count, totalParticipants);
                      const isActive = selectedSlotKey === slotKey;
                      return (
                        <td
                          key={slotKey}
                          onClick={() => handleSlotClick(slotKey)}
                          className={`
                            h-8 min-w-[2.5rem] border cursor-pointer transition-all
                            ${bg}
                            ${isActive ? "border-primary-dark border-2" : "border-neutral-200"}
                          `}
                        >
                          {count > 0 && (
                            <div className={`h-full flex items-center justify-center text-xs font-semibold ${textColor}`}>
                              {count}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PC(sm600+): 우측 응답자 목록 패널 (항상 노출) */}
        {totalParticipants > 0 && (
          <div className="hidden sm600:block w-48 flex-shrink-0">
            <div className="border border-neutral-200 rounded-xl p-4 bg-white">
              <p className="text-xs font-semibold text-neutral-700 mb-2">응답자 목록</p>
              {selectedSlotKey && (
                <p className="text-xs text-neutral-400 mb-2">{formatSlotLabel(selectedSlotKey)}</p>
              )}
              <ul className="space-y-1.5">
                {responses.map((r) => {
                  const isHighlighted = selectedSlotKey ? r.slots.includes(selectedSlotKey) : false;
                  return (
                    <li
                      key={r.id}
                      className={`flex items-center gap-1.5 text-xs rounded px-1 py-0.5 transition-colors
                        ${selectedSlotKey
                          ? isHighlighted
                            ? "bg-primary-light text-primary font-medium"
                            : "text-neutral-300"
                          : "text-neutral-700"
                        }`}
                    >
                      {isHighlighted && <span className="text-success font-bold">✓</span>}
                      {r.name}
                    </li>
                  );
                })}
              </ul>
              {selectedSlotKey && (
                <>
                  <hr className="border-neutral-200 my-2" />
                  <p className="text-xs text-neutral-500">
                    {totalParticipants}명 중 {selectedSlotParticipants.length}명 가능
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: 슬롯 클릭 모달 (전체 응답자 + 하이라이트) */}
      {showSlotModal && selectedSlotKey && (
        <MobileBottomSheet onClose={() => { setShowSlotModal(false); setSelectedSlotKey(null); }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-neutral-900">
              {formatSlotLabel(selectedSlotKey)}
            </h4>
            <button
              onClick={() => { setShowSlotModal(false); setSelectedSlotKey(null); }}
              className="text-neutral-400 hover:text-neutral-600 text-xs px-2 py-1 rounded hover:bg-neutral-100"
            >
              닫기
            </button>
          </div>
          <hr className="border-neutral-200 mb-3" />
          <p className="text-xs text-neutral-500 mb-2">응답자 목록 ({totalParticipants}명)</p>
          <ul className="space-y-1.5 mb-3">
            {responses.map((r) => {
              const isHighlighted = r.slots.includes(selectedSlotKey);
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-1.5 text-xs rounded px-1 py-0.5
                    ${isHighlighted
                      ? "bg-primary-light text-primary font-medium"
                      : "text-neutral-300"
                    }`}
                >
                  {isHighlighted && <span className="text-success font-bold">✓</span>}
                  {r.name}
                </li>
              );
            })}
          </ul>
          <hr className="border-neutral-200 mb-2" />
          <p className="text-xs text-neutral-500">
            {totalParticipants}명 중 {selectedSlotParticipants.length}명 가능
          </p>
        </MobileBottomSheet>
      )}

      {/* Mobile: "N명 응답" 클릭 시 전체 응답자 모달 */}
      {showAllModal && (
        <MobileBottomSheet onClose={() => setShowAllModal(false)}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-neutral-900">전체 응답자 ({totalParticipants}명)</h4>
            <button
              onClick={() => setShowAllModal(false)}
              className="text-neutral-400 hover:text-neutral-600 text-xs px-2 py-1 rounded hover:bg-neutral-100"
            >
              닫기
            </button>
          </div>
          <hr className="border-neutral-200 mb-3" />
          <ul className="space-y-1.5">
            {responses.map((r) => (
              <li key={r.id} className="text-xs text-neutral-700 px-1 py-0.5">
                {r.name}
              </li>
            ))}
          </ul>
        </MobileBottomSheet>
      )}
    </div>
  );
}
