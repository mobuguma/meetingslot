"use client";

// SCR-002: 시간 선택 그리드 컴포넌트
// 열 = 날짜, 행 = 시간대(30분 단위)
// PC: 마우스 드래그, Mobile: 터치 드래그로 다중 선택/해제
// 슬롯 변경 시 onChange로 부모에 알리며, 실제 저장은 저장 버튼 클릭 시 부모에서 처리합니다.

import { useCallback, useMemo, useRef, useState } from "react";
import { generateTimeSlots, buildSlotKey, formatDateLabel, shiftDate, timeToMin } from "@/lib/time";

interface Props {
  dates: string[];
  startTime: string;
  endTime: string;
  selectedSlots: string[];
  onChange: (slots: string[]) => void;
}

export default function TimeGrid({
  dates,
  startTime,
  endTime,
  selectedSlots,
  onChange,
}: Props) {
  const timeSlots = useMemo(() => generateTimeSlots(startTime, endTime), [startTime, endTime]);

  // 타임존 변환 후 startTime > endTime인 경우(자정 경계 넘음) 감지
  // 이 경우 자정(00:00) 이후 시간은 다음 날짜의 슬롯으로 처리합니다
  const startMinOfDay = timeToMin(startTime);
  const hasWrapAround = timeToMin(endTime) < startMinOfDay;

  const isDragging = useRef(false);
  const dragAction = useRef<"select" | "deselect">("select");
  const [localSlots, setLocalSlots] = useState<Set<string>>(new Set(selectedSlots));

  // 외부 selectedSlots 변경 시 로컬 상태 동기화 (기존 응답 불러오기)
  const prevSlotsRef = useRef(selectedSlots);
  if (prevSlotsRef.current !== selectedSlots) {
    prevSlotsRef.current = selectedSlots;
    setLocalSlots(new Set(selectedSlots));
  }

  // 슬롯 선택/해제 공통 함수
  const applyDrag = useCallback((slotKey: string) => {
    setLocalSlots((prev) => {
      const next = new Set(prev);
      if (dragAction.current === "select") next.add(slotKey);
      else next.delete(slotKey);
      return next;
    });
  }, []);

  // 드래그 시작: 첫 슬롯 상태 기준으로 선택/해제 모드 결정
  function onMouseDown(slotKey: string) {
    isDragging.current = true;
    dragAction.current = localSlots.has(slotKey) ? "deselect" : "select";
    applyDrag(slotKey);
  }

  function onMouseEnter(slotKey: string) {
    if (!isDragging.current) return;
    applyDrag(slotKey);
  }

  // 드래그 종료: 변경된 슬롯 배열을 부모에 알림 (API 저장은 부모의 저장 버튼에서 처리)
  function endDrag(currentSlots: Set<string>) {
    if (!isDragging.current) return;
    isDragging.current = false;
    onChange(Array.from(currentSlots));
  }

  function onMouseUp() {
    endDrag(localSlots);
  }

  // 터치 드래그: 터치 위치에서 슬롯 요소를 찾아 같은 로직 적용
  function onTouchStart(e: React.TouchEvent, slotKey: string) {
    isDragging.current = true;
    dragAction.current = localSlots.has(slotKey) ? "deselect" : "select";
    applyDrag(slotKey);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotKey = el?.getAttribute("data-slot");
    if (slotKey) applyDrag(slotKey);
  }

  function onTouchEnd() {
    endDrag(localSlots);
  }

  return (
    <div
      className="overflow-x-auto select-none touch-none"
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
            // wrap-around: 자정 이후 시간은 다음 날짜에 속함 (time당 한 번만 계산)
            const isNextDay = hasWrapAround && timeToMin(time) < startMinOfDay;
            return (
            <tr key={time}>
              {/* 정각만 시간 레이블 표시 */}
              <td className="pr-2 text-right text-neutral-400 whitespace-nowrap align-top pt-1">
                {time.endsWith(":00") ? time : ""}
              </td>
              {dates.map((date) => {
                const actualDate = isNextDay ? shiftDate(date, 1) : date;
                const slotKey = buildSlotKey(actualDate, time);
                const isSelected = localSlots.has(slotKey);
                return (
                  <td
                    key={slotKey}
                    data-slot={slotKey}
                    onMouseDown={() => onMouseDown(slotKey)}
                    onMouseEnter={() => onMouseEnter(slotKey)}
                    onMouseUp={onMouseUp}
                    onTouchStart={(e) => onTouchStart(e, slotKey)}
                    className={`
                      h-8 min-w-[2.5rem] border border-neutral-200 cursor-pointer transition-colors
                      ${isSelected
                        ? "bg-primary hover:bg-primary-dark"
                        : "bg-neutral-100 hover:bg-primary-light"
                      }
                    `}
                  />
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
