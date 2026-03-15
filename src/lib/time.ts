// 시간/날짜 관련 유틸리티 함수 모음

// 시작 시간과 종료 시간 사이의 30분 단위 슬롯 배열을 생성합니다.
// 타임존 변환 후 endTime이 다음날이 될 수 있으므로 wrap-around를 지원합니다.
// 예: ("09:00", "11:00") → ["09:00", "09:30", "10:00", "10:30"]
// 예: ("22:00", "02:00") → ["22:00", "22:30", ..., "23:30", "00:00", "00:30", "01:30"]
export function generateTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  let currentMinutes = timeToMin(startTime);
  const endMinutes = timeToMin(endTime);
  // endTime이 다음날인 경우(endMinutes <= startMinutes) 1440분(하루)을 더해 처리
  const adjustedEnd = endMinutes > currentMinutes ? endMinutes : endMinutes + 1440;

  while (currentMinutes < adjustedEnd) {
    // 1440분(자정)을 넘어가면 다음날 시간으로 정규화
    const normalizedMin = currentMinutes % 1440;
    const h = Math.floor(normalizedMin / 60).toString().padStart(2, "0");
    const m = (normalizedMin % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    currentMinutes += 30;
  }

  return slots;
}

// 타임존의 UTC 오프셋을 분 단위로 반환합니다.
// 서버(Node.js)와 클라이언트(브라우저) 모두 동일한 결과를 보장하기 위해
// shortOffset 문자열을 직접 파싱합니다.
// Intl.DateTimeFormat 생성 비용 절감을 위해 모듈 레벨 캐시를 사용합니다.
// 예: "Asia/Seoul" → 540, "America/New_York" → -300, "Africa/Abidjan" → 0
const _tzOffsetCache = new Map<string, number>();
export function getTimezoneOffsetMin(tz: string): number {
  if (_tzOffsetCache.has(tz)) return _tzOffsetCache.get(tz)!;
  try {
    const offsetStr =
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    // "GMT" 또는 "UTC"는 오프셋 0
    if (offsetStr === "GMT" || offsetStr === "UTC") {
      _tzOffsetCache.set(tz, 0);
      return 0;
    }
    const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    const result = match
      ? (match[1] === "+" ? 1 : -1) * (parseInt(match[2], 10) * 60 + parseInt(match[3] ?? "0", 10))
      : 0;
    _tzOffsetCache.set(tz, result);
    return result;
  } catch {
    return 0;
  }
}

// 날짜 문자열을 n일 만큼 이동합니다.
// 예: ("2026-03-20", 1) → "2026-03-21", ("2026-03-01", -1) → "2026-02-28"
export function shiftDate(dateStr: string, days: number): string {
  if (days === 0) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

// 슬롯 키("YYYY-MM-DDThh:mm")에 분 단위 오프셋을 적용합니다.
// 날짜 경계를 넘어가면 날짜도 함께 이동합니다.
// 예: ("2026-03-20T09:00", -840) → "2026-03-19T19:00"
export function shiftSlotKey(slotKey: string, diffMin: number): string {
  if (diffMin === 0) return slotKey;
  const [dateStr, timeStr] = slotKey.split("T");
  const totalMin = timeToMin(timeStr) + diffMin;
  const dayAdj = Math.floor(totalMin / 1440);
  const normalizedMin = ((totalMin % 1440) + 1440) % 1440;
  const newH = Math.floor(normalizedMin / 60).toString().padStart(2, "0");
  const newM = (normalizedMin % 60).toString().padStart(2, "0");
  return `${shiftDate(dateStr, dayAdj)}T${newH}:${newM}`;
}

// "HH:MM" 형식의 시간 문자열을 분 단위 정수로 변환합니다.
// 예: "09:30" → 570, "00:00" → 0
export function timeToMin(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// 날짜와 시간을 조합해 슬롯 키를 생성합니다.
// 예: ("2026-03-15", "09:00") → "2026-03-15T09:00"
export function buildSlotKey(date: string, time: string): string {
  return `${date}T${time}`;
}

// 슬롯 키에서 날짜 부분을 추출합니다.
// 예: "2026-03-15T09:00" → "2026-03-15"
export function extractDate(slotKey: string): string {
  return slotKey.split("T")[0];
}

// 슬롯 키에서 시간 부분을 추출합니다.
// 예: "2026-03-15T09:00" → "09:00"
export function extractTime(slotKey: string): string {
  return slotKey.split("T")[1];
}

// 30분 단위 드롭다운 옵션 생성 (이벤트 생성 폼용)
// 예: [{ value: "00:00", label: "00:00" }, { value: "00:30", label: "00:30" }, ...]
export function generateTimeOptions(): { value: string; label: string }[] {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

// IANA 타임존을 "Area/Location (GMT+N)" 형식으로 변환합니다.
// 전체 IANA 경로(Area/Location)를 사용해 중복 도시명 구분 및 검색 편의를 높입니다.
// getTimezoneOffsetMin으로 오프셋을 직접 계산해 서버/클라이언트 렌더링 결과를 통일합니다.
// 예: "Asia/Seoul" → "Asia/Seoul (GMT+9)", "Africa/Abidjan" → "Africa/Abidjan (GMT+0)"
export function formatTimezone(tz: string): string {
  try {
    const label = tz.replace(/_/g, " "); // 언더스코어를 공백으로 변환
    const offsetMin = getTimezoneOffsetMin(tz);
    const sign = offsetMin >= 0 ? "+" : "-";
    const absMin = Math.abs(offsetMin);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const offsetStr = m > 0 ? `${h}:${m.toString().padStart(2, "0")}` : `${h}`;
    return `${label} (GMT${sign}${offsetStr})`;
  } catch {
    return tz;
  }
}

// 브라우저의 현재 타임존을 감지합니다.
// 지원하지 않는 환경에서는 Asia/Seoul을 기본값으로 사용합니다.
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Seoul";
  }
}

// 슬롯 키를 "N월 N일 (요일) HH:MM" 형식의 레이블로 변환합니다.
// 예: "2026-03-20T09:00" → "3월 20일 (목) 09:00"
export function formatSlotLabel(slotKey: string): string {
  const dateStr = extractDate(slotKey);
  const time = extractTime(slotKey);
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  return `${month}월 ${day}일 (${dayNames[dateObj.getDay()]}) ${time}`;
}

// 날짜 문자열을 사람이 읽기 좋은 형식으로 변환합니다.
// 예: "2026-03-15" → "3/15 (일)"
export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = dayNames[date.getDay()];
  return `${month}/${day} (${dayName})`;
}

// 30분 단위 종료 시간 드롭다운 옵션 생성 (이벤트 생성 폼용)
// 범위: 00:30 ~ 24:00 (시작 시간보다 항상 늦어야 하므로 00:00 제외)
// generateTimeOptions()의 결과를 재사용해 중복 로직을 제거합니다.
export function generateEndTimeOptions(): { value: string; label: string }[] {
  return generateTimeOptions().slice(1).concat({ value: "24:00", label: "24:00" });
}
