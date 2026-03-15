# MeetSlot Design Guide

> 코드 작업 전 이 문서를 참조하세요. 정의된 토큰 외의 색상/폰트 크기를 임의로 사용하지 마세요.

---

## 컬러 팔레트

| 토큰 | HEX | Tailwind 클래스 | 용도 |
|------|-----|----------------|------|
| `primary` | `#2563EB` | `bg-primary`, `text-primary` | CTA 버튼, 선택된 슬롯, 링크 |
| `primary-light` | `#DBEAFE` | `bg-primary-light` | 그룹 오버레이 낮은 밀도 (1명) |
| `primary-300` | `#93C5FD` | `bg-primary-300` | 그룹 오버레이 중간 밀도 (낮음) |
| `primary-500` | `#3B82F6` | `bg-primary-500` | 그룹 오버레이 중간 밀도 (높음) |
| `primary-700` | `#1D4ED8` | `bg-primary-700` | 그룹 오버레이 전원 가능 슬롯 |
| `primary-dark` | `#1E40AF` | `bg-primary-dark` | 버튼 hover |
| `neutral-50` | `#F8FAFC` | `bg-neutral-50` | 페이지 배경 |
| `neutral-100` | `#F1F5F9` | `bg-neutral-100` | 카드 배경, 미선택 슬롯 |
| `neutral-300` | `#CBD5E1` | `border-neutral-300` | 테두리, 구분선 |
| `neutral-600` | `#475569` | `text-neutral-600` | 부제목, 보조 텍스트 |
| `neutral-900` | `#0F172A` | `text-neutral-900` | 본문 텍스트, 제목 |
| `error` | `#EF4444` | `text-error` | 오류 메시지 |
| `success` | `#22C55E` | `text-success` | 저장 완료 피드백 |

### 그룹 오버레이 그라디언트

| 인원 비율 | 배경 토큰 | 숫자 색 토큰 |
|----------|-----------|------------|
| 0% (0명) | `bg-white` | 숫자 미표시 |
| ~25% | `bg-primary-light` | `text-primary-dark` |
| ~50% | `bg-primary-300` | `text-white` |
| ~75% | `bg-primary-500` | `text-white` |
| 100% (전원) | `bg-primary-700` | `text-white` |

---

## 타이포그래피

| 역할 | Tailwind 클래스 | 크기 | Weight |
|------|----------------|------|--------|
| 페이지 제목 | `text-2xl font-bold` | 24px | 700 |
| 섹션 제목 | `text-lg font-semibold` | 18px | 600 |
| 본문 | `text-sm` | 14px | 400 |
| 캡션 / 레이블 | `text-xs` | 12px | 400 |
| 버튼 | `text-sm font-medium` | 14px | 500 |

**폰트**: Pretendard (한국어), Inter (영문/숫자), 시스템 폰트 fallback

---

## 컴포넌트 스타일

### 버튼

```
Primary:   bg-primary text-white rounded-lg px-6 py-3 text-sm font-medium
           hover:bg-primary-dark transition-colors
           disabled:opacity-50 cursor-not-allowed

Secondary: border border-neutral-300 text-neutral-900 rounded-lg px-6 py-3
           hover:bg-neutral-100
```

### 입력 필드

```
border border-neutral-300 rounded-lg px-4 py-3 text-sm
focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
placeholder:text-neutral-400
에러: border-error ring-error/20
```

### 검색 가능한 드롭다운 (Searchable Dropdown)

타임존 선택 등 옵션이 많아 검색이 필요한 경우 사용합니다.

```
트리거 버튼: border border-neutral-300 rounded-lg px-3 pr-10 py-3 text-sm text-left
드롭다운 패널: border border-neutral-200 rounded-lg bg-white shadow-md z-10
검색 입력: 패널 상단 고정 (border-b border-neutral-100 구분선)
목록 영역: max-h-48 overflow-y-auto
선택된 항목: bg-primary-light text-primary font-medium
호버 항목: hover:bg-neutral-100
결과 없음: text-neutral-400 text-center
```

### 카드

```
bg-white rounded-xl shadow-sm border border-neutral-100 p-6
```

### 그리드 슬롯

```
TimeGrid 미선택: bg-neutral-100 border border-neutral-200  h-8 min-w-[2.5rem]
TimeGrid 선택:   bg-primary border-primary
GroupOverlay:    비율에 따른 색상 + 인원 수 숫자 (flex items-center justify-center)
```

---

## 레이아웃

- 전체 컨테이너: `max-w-5xl mx-auto px-4`
- 페이지 배경: `bg-neutral-50 min-h-screen`
- 그리드: `overflow-x-auto` (날짜 많을 시 수평 스크롤)
- 반응형: `sm600:` 프리픽스로 768px 기준 PC 레이아웃 전환 (`tailwind.config.ts`의 `screens`에 `'sm600': '768px'` 정의됨)
