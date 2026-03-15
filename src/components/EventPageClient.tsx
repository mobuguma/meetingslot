"use client";

// SCR-002 + SCR-003 클라이언트 컴포넌트
// SCR-002: 이름+비밀번호 확인 후 가용 시간 선택 (PC: 좌=그리드, 우=확인폼)
// SCR-003: 그룹 오버레이 (좌=그리드, 우=항상 노출 응답자 목록)
// 폴링 없이 필요한 순간에만 API 요청 (화면 진입, 확인, 저장, 탭 전환)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import TimeGrid from "@/components/TimeGrid";
import GroupOverlay from "@/components/GroupOverlay";
import Toast from "@/components/Toast";
import { Event } from "@/types";
import { formatTimezone, getTimezoneOffsetMin, shiftSlotKey, shiftDate, timeToMin, detectTimezone } from "@/lib/time";

type Tab = "my" | "group";

interface Props {
  eventId: string;
}

export default function EventPageClient({ eventId }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // 최초 로드 성공 여부 추적 (catch에서 stale closure로 event=null이 되는 문제 방지)
  const hasLoadedRef = useRef(false);

  // 이름+비밀번호 확인 상태
  const [participantName, setParticipantName] = useState("");
  const [participantPassword, setParticipantPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // 가용 시간 슬롯 (event.timezone 기준)
  const [mySlots, setMySlots] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<Tab>("my");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  // 타임존 검색 드롭다운 상태
  const [isTzOpen, setIsTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState("");
  const tzDropdownRef = useRef<HTMLDivElement>(null);

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

  // 토스트 메시지 2.5초 표시
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // 이벤트 + 응답 데이터 조회 (필요한 순간에만 호출)
  const fetchEventData = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/events/${eventId}`));
      if (res.status === 404) {
        setHasError(true);
        return;
      }
      const data = await res.json();
      setEvent(data);
      hasLoadedRef.current = true;
    } catch {
      // 최초 로드 전 실패 시에만 에러 화면 표시 (재시도 중 실패는 무시)
      if (!hasLoadedRef.current) setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // 화면 진입 시 1회 조회
  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // event.responses를 파생값으로 사용 (별도 responses 상태 불필요)
  // useMemo로 참조 안정화 → displayResponses 등의 deps 변경 억제
  const responses = useMemo(() => event?.responses ?? [], [event?.responses]);

  // 전체 IANA 타임존 목록
  const timezoneOptions = useMemo(() => {
    try {
      const tzList = (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
      return tzList.map((tz) => ({ value: tz, label: formatTimezone(tz) }));
    } catch {
      return ["Asia/Seoul", "Asia/Tokyo", "America/New_York", "Europe/London", "UTC"]
        .map((tz) => ({ value: tz, label: formatTimezone(tz) }));
    }
  }, []);

  // 검색어 필터링
  const filteredTimezones = useMemo(() => {
    if (!tzSearch) return timezoneOptions;
    const lower = tzSearch.toLowerCase();
    return timezoneOptions.filter((opt) =>
      opt.label.toLowerCase().includes(lower) || opt.value.toLowerCase().includes(lower)
    );
  }, [timezoneOptions, tzSearch]);

  // 표시 타임존 (서버/클라이언트 하이드레이션 일치를 위해 초기값 ""으로 설정)
  // useEffect에서 브라우저 타임존 감지 → 이후 event.timezone 로드 시 덮어씀
  const [displayTimezone, setDisplayTimezone] = useState("");
  useEffect(() => {
    setDisplayTimezone(detectTimezone());
  }, []);
  useEffect(() => {
    if (event?.timezone) setDisplayTimezone(event.timezone);
  }, [event?.timezone]);

  // 타임존 오프셋 차이 (분)
  const tzDiffMin = useMemo(() => {
    if (!event?.timezone || !displayTimezone || displayTimezone === event.timezone) return 0;
    return getTimezoneOffsetMin(displayTimezone) - getTimezoneOffsetMin(event.timezone);
  }, [event?.timezone, displayTimezone]);

  // displayTimezone 기준 변환된 dates/startTime/endTime
  const { displayDates, displayStartTime, displayEndTime } = useMemo(() => {
    if (!event || tzDiffMin === 0) {
      return {
        displayDates: event?.dates ?? [],
        displayStartTime: event?.startTime ?? "09:00",
        displayEndTime: event?.endTime ?? "18:00",
      };
    }

    const startTotalMin = timeToMin(event.startTime) + tzDiffMin;
    const startDayAdj = Math.floor(startTotalMin / 1440);
    const startNormalized = ((startTotalMin % 1440) + 1440) % 1440;
    const originalDuration = timeToMin(event.endTime) - timeToMin(event.startTime);
    const endTotal = startNormalized + originalDuration;
    const endNormalized = endTotal >= 1440 ? endTotal - 1440 : endTotal;

    const newStartH = Math.floor(startNormalized / 60).toString().padStart(2, "0");
    const newStartM = (startNormalized % 60).toString().padStart(2, "0");
    const newEndH = Math.floor(endNormalized / 60).toString().padStart(2, "0");
    const newEndM = (endNormalized % 60).toString().padStart(2, "0");
    const newDates = event.dates.map((date) => shiftDate(date, startDayAdj));

    return {
      displayDates: newDates,
      displayStartTime: `${newStartH}:${newStartM}`,
      displayEndTime: `${newEndH}:${newEndM}`,
    };
  }, [event, tzDiffMin]);

  // displayTimezone 기준 내 슬롯
  const displayMySlots = useMemo(
    () => tzDiffMin === 0 ? mySlots : mySlots.map((slot) => shiftSlotKey(slot, tzDiffMin)),
    [mySlots, tzDiffMin]
  );

  // 응답들의 슬롯도 displayTimezone 기준으로 변환
  const displayResponses = useMemo(
    () =>
      tzDiffMin === 0
        ? responses
        : responses.map((r) => ({
            ...r,
            slots: r.slots.map((slot) => shiftSlotKey(slot, tzDiffMin)),
          })),
    [responses, tzDiffMin]
  );

  // TimeGrid onChange: display → event.timezone 역변환 후 저장
  function handleSlotsChange(displaySlots: string[]) {
    setMySlots(displaySlots.map((slot) => shiftSlotKey(slot, -tzDiffMin)));
  }

  // 이름+비밀번호 확인: 기존 응답 있으면 슬롯 로드
  async function handleConfirm() {
    if (!participantName.trim()) {
      setNameError("이름을 입력해 주세요.");
      return;
    }

    setIsConfirming(true);
    setNameError("");
    setPasswordError("");

    try {
      const res = await fetch(apiUrl("/api/responses/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: participantName.trim(),
          password: participantPassword,
        }),
      });

      if (res.status === 401) {
        setPasswordError("비밀번호가 일치하지 않습니다.");
        return;
      }

      if (!res.ok) {
        showToast("확인에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      const data = await res.json();
      // 기존 응답의 슬롯을 event.timezone 기준으로 로드
      setMySlots(data.slots ?? []);
      setIsConfirmed(true);

      // 확인 시점에 최신 데이터 갱신
      fetchEventData();
    } catch {
      showToast("확인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsConfirming(false);
    }
  }

  // Enter 키로 확인 동작
  function handleConfirmKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleConfirm();
  }

  // 저장 버튼 클릭
  async function handleSave() {
    if (mySlots.length === 0) {
      showToast("가능한 시간을 하나 이상 선택해 주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(apiUrl("/api/responses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name: participantName.trim(),
          password: participantPassword,
          slots: mySlots,
        }),
      });
      if (res.status === 401) {
        showToast("비밀번호가 일치하지 않습니다.");
        return;
      }
      if (!res.ok) throw new Error();
      showToast("저장되었습니다 ✓");
      // 저장 후 최신 데이터 갱신
      fetchEventData();
    } catch {
      showToast("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  // 탭 전환 시 그룹 데이터 갱신
  function handleTabSwitch(tab: Tab) {
    setActiveTab(tab);
    if (tab === "group") fetchEventData();
  }

  // 이벤트 페이지 링크 복사
  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    showToast("링크가 복사되었습니다");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-400 text-sm">불러오는 중...</p>
      </main>
    );
  }

  if (hasError || !event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-neutral-50">
        <div className="text-4xl text-neutral-300 mb-4">🔍</div>
        <h1 className="text-xl font-semibold text-neutral-700 mb-2">이벤트를 찾을 수 없어요.</h1>
        <p className="text-neutral-600 text-sm mb-6">링크가 잘못되었거나 이미 삭제된 이벤트입니다.</p>
        <a
          href="/"
          className="bg-primary text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          새 이벤트 만들기
        </a>
      </main>
    );
  }

  return (
    <>
      <Toast message={toast} />
      <main className="min-h-screen bg-neutral-50 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs text-primary font-medium mb-0.5">MeetSlot</p>
              <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
            </div>
            <button
              onClick={copyLink}
              className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors mt-1"
            >
              링크 복사
            </button>
          </div>

          {/* 타임존 검색 드롭다운 (SCR-001과 동일한 UX) */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-neutral-600">타임존</span>
            <div className="relative" ref={tzDropdownRef}>
              <button
                type="button"
                onClick={() => { setIsTzOpen((v) => !v); setTzSearch(""); }}
                className="appearance-none border border-neutral-300 rounded-lg pl-2 pr-8 py-1 text-xs text-left focus:outline-none focus:ring-1 focus:ring-primary truncate max-w-[220px]"
              >
                {timezoneOptions.find((opt) => opt.value === displayTimezone)?.label ?? displayTimezone}
              </button>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-xs">▾</span>

              {isTzOpen && (
                <div className="absolute z-10 w-64 mt-1 border border-neutral-200 rounded-lg bg-white shadow-md">
                  <div className="p-2 border-b border-neutral-100">
                    <input
                      type="text"
                      value={tzSearch}
                      onChange={(e) => setTzSearch(e.target.value)}
                      placeholder="타임존 검색... (예: Seoul, GMT+9)"
                      autoFocus
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-neutral-400"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredTimezones.length > 0 ? (
                      filteredTimezones.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setDisplayTimezone(opt.value); setIsTzOpen(false); setTzSearch(""); }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors
                            ${opt.value === displayTimezone
                              ? "bg-primary-light text-primary font-medium"
                              : "text-neutral-900 hover:bg-neutral-100"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-xs text-neutral-400 text-center">검색 결과가 없습니다</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 탭 전환 */}
          <div className="flex gap-1 mb-4 bg-neutral-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => handleTabSwitch("my")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "my"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              내 가용 시간
            </button>
            <button
              onClick={() => handleTabSwitch("group")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "group"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              전체 현황 ({responses.length}명)
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
            {activeTab === "my" ? (
              // SCR-002: PC 2컬럼(좌=확인폼, 우=그리드), 모바일 단일컬럼(확인폼→그리드 순)
              <div className="flex flex-col sm600:flex-row gap-6">
                {/* 좌측: 이름 + 비밀번호 + 확인/다시입력 (항상 노출) */}
                <div className="sm600:w-72 flex-shrink-0 space-y-3">
                  {isConfirmed && (
                    <p className="text-xs text-primary font-medium">
                      {participantName} 님으로 참여 중
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">이름</label>
                    <input
                      type="text"
                      value={participantName}
                      onChange={(e) => { setParticipantName(e.target.value); setNameError(""); }}
                      onKeyDown={handleConfirmKeyDown}
                      maxLength={50}
                      placeholder="예: 홍길동"
                      disabled={isConfirmed}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-500
                        ${nameError ? "border-error focus:ring-error/20" : "border-neutral-300 focus:ring-primary"}`}
                    />
                    {nameError && <p className="text-error text-xs mt-1">{nameError}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">비밀번호</label>
                    <input
                      type="password"
                      value={participantPassword}
                      onChange={(e) => { setParticipantPassword(e.target.value); setPasswordError(""); }}
                      onKeyDown={handleConfirmKeyDown}
                      placeholder="응답 수정 시 사용"
                      disabled={isConfirmed}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-500
                        ${passwordError ? "border-error focus:ring-error/20" : "border-neutral-300 focus:ring-primary"}`}
                    />
                    {passwordError && <p className="text-error text-xs mt-1">{passwordError}</p>}
                  </div>

                  {!isConfirmed ? (
                    <button
                      onClick={handleConfirm}
                      disabled={isConfirming}
                      className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isConfirming ? "확인 중..." : "확인"}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setIsConfirmed(false); setMySlots([]); }}
                      className="w-full border border-neutral-300 text-neutral-600 rounded-lg py-2.5 text-sm font-medium hover:bg-neutral-50 transition-colors"
                    >
                      다시 입력
                    </button>
                  )}
                </div>

                {/* 우측: 타임 그리드 + 저장 버튼 (확인 후 노출) */}
                {isConfirmed && (
                  <div className="flex-1 space-y-4">
                    <p className="text-xs text-neutral-400">
                      가능한 시간을 클릭하거나 드래그하여 선택하세요.
                      <span className="ml-2 inline-flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> 선택됨
                      </span>
                    </p>
                    <TimeGrid
                      dates={displayDates}
                      startTime={displayStartTime}
                      endTime={displayEndTime}
                      selectedSlots={displayMySlots}
                      onChange={handleSlotsChange}
                    />
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-primary text-white rounded-lg py-3 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <GroupOverlay
                dates={displayDates}
                startTime={displayStartTime}
                endTime={displayEndTime}
                responses={displayResponses}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
