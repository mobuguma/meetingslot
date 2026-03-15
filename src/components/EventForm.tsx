"use client";

// SCR-001: 이벤트 생성 폼
// PC(600px+): 좌측(폼) + 우측(가용 시간 미리보기) 2컬럼
// Mobile: 단일 컬럼 (이름→시간범위→달력→타임존→미리보기→CTA 순)
// 생성 성공 시 완료 화면(URL 표시 + 복사)으로 전환

import { useEffect, useMemo, useRef, useState } from "react";
import { generateTimeOptions, generateEndTimeOptions, generateTimeSlots, formatDateLabel, formatTimezone, detectTimezone } from "@/lib/time";
import { apiUrl } from "@/lib/api";
import Toast from "@/components/Toast";

// 30분 단위 시간 옵션 (SPEC-001 변경: 1시간 → 30분 단위)
const START_OPTIONS = generateTimeOptions();       // 00:00 ~ 23:30
const END_OPTIONS = generateEndTimeOptions();      // 00:30 ~ 24:00

// 시작 시간에 1시간을 더한 종료 시간을 계산합니다.
// 상태/props에 의존하지 않는 순수 함수이므로 컴포넌트 외부에 정의합니다.
// 30분 단위를 유지하며 24:00을 최대값으로 제한합니다.
// 예: "09:30" → "10:30", "23:30" → "24:00"
function calcCorrectedEnd(fromTime: string): string {
  const [h, m] = fromTime.split(":").map(Number);
  const newH = h + 1;
  if (newH >= 24) return "24:00";
  return `${newH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

interface Props {
  onComplete: () => void;
  onReset: () => void;
}

export default function EventForm({ onComplete, onReset }: Props) {
  const [title, setTitle] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  // 서버/클라이언트 하이드레이션 일치를 위해 초기값 ""으로 설정
  // useEffect에서 브라우저 타임존 감지
  const [timezone, setTimezone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [toast, setToast] = useState("");

  // 이벤트 생성 완료 후 표시할 URL과 이벤트 이름
  const [createdUrl, setCreatedUrl] = useState("");
  const [createdTitle, setCreatedTitle] = useState("");
  const [copyLabel, setCopyLabel] = useState("링크 복사");

  // 타임존 검색 드롭다운 상태
  const [isTzOpen, setIsTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const tzDropdownRef = useRef<HTMLDivElement>(null);

  // 클라이언트 마운트 후 브라우저 타임존 감지
  useEffect(() => {
    setTimezone(detectTimezone());
  }, []);

  // 드롭다운 외부 클릭 시 자동 닫기
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setIsTzOpen(false);
        setTzSearch("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // 전체 IANA 타임존 목록 (클라이언트에서 한 번만 계산)
  const timezoneOptions = useMemo(() => {
    try {
      const tzList = (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
      return tzList.map((tz) => ({ value: tz, label: formatTimezone(tz) }));
    } catch {
      // 폴백: 주요 타임존
      return [
        "Asia/Seoul", "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore",
        "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "UTC",
      ].map((tz) => ({ value: tz, label: formatTimezone(tz) }));
    }
  }, []);

  // 검색어가 포함된 타임존만 필터링 (대소문자 무시)
  const filteredTimezones = useMemo(() => {
    if (!tzSearch) return timezoneOptions;
    const lower = tzSearch.toLowerCase();
    return timezoneOptions.filter((opt) =>
      opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)
    );
  }, [timezoneOptions, tzSearch]);

  // 토스트 메시지를 2.5초 동안 표시
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // 종료 시간 변경 시: 시작 시간보다 이전이면 토스트 + 자동 보정 (SPEC-001 4.2)
  function handleEndTimeChange(value: string) {
    if (value <= startTime) {
      showToast("종료 시간은 시작 시간보다 늦어야 합니다");
      // 자동 보정: 시작 시간 + 1시간 (30분 단위 유지)
      setEndTime(calcCorrectedEnd(startTime));
    } else {
      setEndTime(value);
    }
  }

  // 시작 시간 변경 시: 종료 시간이 시작 시간보다 이전이면 자동 보정
  function handleStartTimeChange(value: string) {
    setStartTime(value);
    if (endTime <= value) {
      showToast("종료 시간은 시작 시간보다 늦어야 합니다");
      setEndTime(calcCorrectedEnd(value));
    }
  }

  // 이벤트 생성 API 호출
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTitleError("");
    setDateError("");

    if (!title.trim()) { setTitleError("이벤트 이름을 입력해 주세요."); return; }
    if (selectedDates.length === 0) { setDateError("날짜를 하나 이상 선택해 주세요."); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/events"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dates: selectedDates, startTime, endTime, timezone }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "이벤트 생성에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      setCreatedUrl(data.url);
      setCreatedTitle(title);
      onComplete(); // 부모에게 완료 알림 (헤더 타이틀 숨김)
    } catch {
      showToast("이벤트 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // 클립보드 복사 (SPEC-001 4.4)
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(createdUrl);
    } catch {
      // clipboard API 실패 시 input 선택으로 fallback
      const input = document.getElementById("created-url-input") as HTMLInputElement;
      input?.select();
    }
    setCopyLabel("복사됨 ✓");
    setTimeout(() => setCopyLabel("링크 복사"), 2000);
  }

  // 이벤트 생성 완료 화면 (SPEC-001 4.5)
  if (createdUrl) {
    return (
      <>
        <Toast message={toast} />
        <div className="space-y-5">
          {/* 완료 타이틀 */}
          <div>
            <p className="text-lg font-semibold text-neutral-900 mb-1">이벤트가 생성되었습니다!</p>
            <p className="text-sm text-neutral-600">{createdTitle}</p>
          </div>

          {/* 공유 링크 */}
          <div>
            <p className="text-xs font-medium text-neutral-600 mb-1.5">공유 링크</p>
            <input
              id="created-url-input"
              type="text"
              readOnly
              value={createdUrl}
              className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-700 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 버튼 2개 가로 배치 (SPEC-001 4.5) */}
          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors
                ${copyLabel === "복사됨 ✓"
                  ? "bg-success text-white"
                  : "bg-primary text-white hover:bg-primary-dark"
                }`}
            >
              {copyLabel}
            </button>
            <button
              onClick={() => window.open(createdUrl, "_blank")}
              className="flex-1 border border-neutral-300 text-neutral-900 rounded-lg py-3 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              이벤트 참여 →
            </button>
          </div>

          {/* 새 이벤트 만들기 초기화 */}
          <button
            onClick={() => {
              setCreatedUrl("");
              setCreatedTitle("");
              setTitle("");
              setSelectedDates([]);
              setStartTime("09:00");
              setEndTime("18:00");
              setCopyLabel("링크 복사");
              onReset();
            }}
            className="w-full text-center text-sm text-neutral-400 hover:text-neutral-600 transition-colors pt-1"
          >
            + 새 이벤트 만들기
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast message={toast} />
      {/* PC(sm600+): 좌우 2컬럼, Mobile: 단일 컬럼 */}
      <form onSubmit={onSubmit}>
        <div className="flex flex-col sm600:flex-row gap-8">

          {/* 좌측: 폼 영역 */}
          <div className="flex-1 space-y-5">
            {/* 이벤트 이름 */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                이벤트 이름 <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                maxLength={50}
                placeholder="예) 팀 주간 회의"
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-neutral-400
                  ${titleError ? "border-error focus:ring-error/20" : "border-neutral-300 focus:ring-primary"}`}
              />
              {titleError && <p className="text-error text-xs mt-1">{titleError}</p>}
            </div>

            {/* 시간 범위: 30분 단위 (SPEC-001) */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">시간 범위</label>
              <div className="flex gap-2 items-center">
                {/* 커스텀 화살표: 오른쪽에서 12px(right-3) 안쪽에 위치 */}
                <div className="relative flex-1">
                  <select
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="appearance-none w-full border border-neutral-300 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {START_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-xs">▾</span>
                </div>
                <span className="text-neutral-400 text-sm">~</span>
                <div className="relative flex-1">
                  <select
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="appearance-none w-full border border-neutral-300 rounded-lg pl-3 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {END_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-xs">▾</span>
                </div>
              </div>
            </div>

            {/* 날짜 선택 달력 (클릭앤드래그 다중 선택, 모두 해제 버튼) */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                날짜 선택 <span className="text-primary">*</span>
                <span className="text-neutral-400 font-normal ml-1">(최대 14일)</span>
              </label>
              <DatePicker
                selectedDates={selectedDates}
                onChange={setSelectedDates}
                onToast={showToast}
              />
              {dateError && <p className="text-error text-xs mt-1">{dateError}</p>}
            </div>

            {/* 타임존: 검색 가능한 커스텀 드롭다운 (SPEC-001) */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">타임존</label>
              <div className="relative" ref={tzDropdownRef}>
                {/* 현재 선택된 타임존 표시 버튼 (timezoneOptions에서 조회해 재계산 방지) */}
                <button
                  type="button"
                  onClick={() => { setIsTzOpen((v) => !v); setTzSearch(""); }}
                  className="appearance-none w-full border border-neutral-300 rounded-lg pl-3 pr-10 py-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent truncate"
                >
                  {timezoneOptions.find((opt) => opt.value === timezone)?.label ?? timezone}
                </button>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-xs">▾</span>

                {/* 검색 드롭다운 패널 */}
                {isTzOpen && (
                  <div className="absolute z-10 w-full mt-1 border border-neutral-200 rounded-lg bg-white shadow-md">
                    {/* 검색 입력 */}
                    <div className="p-2 border-b border-neutral-100">
                      <input
                        type="text"
                        value={tzSearch}
                        onChange={(e) => setTzSearch(e.target.value)}
                        placeholder="타임존 검색... (예: Seoul, GMT+9)"
                        autoFocus
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-neutral-400"
                      />
                    </div>
                    {/* 필터링된 타임존 목록 */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredTimezones.length > 0 ? (
                        filteredTimezones.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setTimezone(opt.value); setIsTzOpen(false); setTzSearch(""); }}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors
                              ${opt.value === timezone
                                ? "bg-primary-light text-primary font-medium"
                                : "text-neutral-900 hover:bg-neutral-100"
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-4 text-sm text-neutral-400 text-center">
                          검색 결과가 없습니다
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 이벤트 만들기 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white rounded-lg py-3 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "생성 중..." : "이벤트 만들기"}
            </button>
          </div>

          {/* 우측: 가용 시간 미리보기 (PC에서만 표시) */}
          <div className="sm600:w-96 flex-shrink-0">
            <p className="text-xs font-medium text-neutral-600 mb-1.5">가용 시간 미리보기</p>
            <AvailabilityPreview
              dates={selectedDates}
              startTime={startTime}
              endTime={endTime}
            />
          </div>
        </div>
      </form>
    </>
  );
}

// 날짜 달력 컴포넌트: 클릭 또는 클릭앤드래그로 날짜 다중 선택/해제
// 오늘 이전 날짜는 비활성화, 최대 14일 선택 가능
function DatePicker({
  selectedDates,
  onChange,
  onToast,
}: {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  onToast: (msg: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // 드래그 상태: 드래그 중 여부, 드래그 모드(선택/해제)
  const isDragging = useRef(false);
  const dragMode = useRef<"select" | "deselect">("select");

  const today = new Date().toISOString().split("T")[0];
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewDate.year, viewDate.month, 1).getDay();
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  function formatDay(day: number): string {
    const m = (viewDate.month + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${viewDate.year}-${m}-${d}`;
  }

  function prevMonth() {
    setViewDate((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }
    );
  }

  function nextMonth() {
    setViewDate((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }
    );
  }

  // 드래그 시 날짜 선택/해제 적용
  function applyToDate(dateStr: string) {
    if (dateStr < today) return;
    if (dragMode.current === "select") {
      if (selectedDates.includes(dateStr)) return;
      if (selectedDates.length >= 14) {
        onToast("최대 14일까지 선택할 수 있습니다");
        return;
      }
      onChange([...selectedDates, dateStr].sort());
    } else {
      onChange(selectedDates.filter((d) => d !== dateStr));
    }
  }

  // 마우스 다운: 드래그 시작, 첫 날짜 상태 기준으로 선택/해제 모드 결정
  function handleMouseDown(dateStr: string) {
    if (dateStr < today) return;
    isDragging.current = true;
    dragMode.current = selectedDates.includes(dateStr) ? "deselect" : "select";
    applyToDate(dateStr);
  }

  function handleMouseEnter(dateStr: string) {
    if (!isDragging.current) return;
    applyToDate(dateStr);
  }

  function handleMouseUp() {
    isDragging.current = false;
  }

  return (
    <div
      className="border border-neutral-200 rounded-xl p-4 bg-white select-none"
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
        >‹</button>
        <span className="text-sm font-semibold text-neutral-900">
          {viewDate.year}년 {viewDate.month + 1}월
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
        >›</button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((label, i) => (
          <div
            key={label}
            className={`text-center text-xs py-1 font-medium
              ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-neutral-400"}`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDay(day);
          const isSelected = selectedDates.includes(dateStr);
          const isPast = dateStr < today;

          return (
            <button
              key={dateStr}
              type="button"
              onMouseDown={() => handleMouseDown(dateStr)}
              onMouseEnter={() => handleMouseEnter(dateStr)}
              disabled={isPast}
              className={`
                h-8 w-full text-xs rounded-lg transition-colors font-medium cursor-pointer
                ${isPast ? "text-neutral-300 cursor-not-allowed" : ""}
                ${isSelected ? "bg-primary text-white" : ""}
                ${!isSelected && !isPast ? "hover:bg-primary-light text-neutral-700" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* 선택 현황 + 모두 해제 버튼: 날짜 선택 여부와 무관하게 항상 노출 (SPEC-001 4.3) */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-primary">{selectedDates.length}일 선택됨</span>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          모두 해제
        </button>
      </div>
    </div>
  );
}

// 가용 시간 미리보기: 선택된 날짜/시간 범위를 즉시 테이블로 표시 (SPEC-001 5.3)
// SCR-002 스타일의 빈 그리드로 표시하며 인터랙션 없음
function AvailabilityPreview({
  dates,
  startTime,
  endTime,
}: {
  dates: string[];
  startTime: string;
  endTime: string;
}) {
  // 날짜 미선택 시 안내 텍스트
  if (dates.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-xl p-6 bg-white h-40 flex items-center justify-center">
        <p className="text-sm text-neutral-400 text-center">
          날짜와 시간을 선택하면<br />미리보기가 표시됩니다
        </p>
      </div>
    );
  }

  const timeSlots = generateTimeSlots(startTime, endTime);

  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-white overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-12 p-1" />
            {dates.map((date) => (
              <th key={date} className="p-1 text-center font-medium text-neutral-600 min-w-[2.5rem] whitespace-nowrap">
                {formatDateLabel(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time) => (
            <tr key={time}>
              <td className="pr-2 text-right text-neutral-400 whitespace-nowrap align-top pt-1">
                {time.endsWith(":00") ? time : ""}
              </td>
              {dates.map((date) => (
                <td
                  key={`${date}T${time}`}
                  className="h-8 min-w-[2.5rem] border border-neutral-200 bg-neutral-100"
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
