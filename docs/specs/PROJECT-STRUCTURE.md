# 프로젝트 폴더 구성 계획

| 항목 | 내용 |
|------|------|
| Created | 2026.03.15. |
| Status | `draft` |

---

## 개요

미팅 일정 조율 웹 서비스(가칭: **MeetSlot**)의 프로젝트 폴더 구조 계획서.
로컬 MVP → 웹 배포 확장을 고려한 구조.

---

## 최종 폴더 구조

```
/project
├── CLAUDE.md                  # Claude 코드 작업 룰 (자동 로드)
├── DESIGN-GUIDE.md            # 디자인 가이드 (코드 작업 시 참고)
│
├── /docs
│   ├── /plans                 # 기획/작업 계획 문서
│   │   └── spec-review.md     # 스펙 검토 보고서
│   │
│   └── /specs                 # 스펙 문서
│       ├── PRD.md
│       ├── PROJECT-STRUCTURE.md
│       ├── TECH-STACK.md
│       ├── SPEC-001.md        # SCR-001: 홈 / 이벤트 생성
│       ├── SPEC-002.md        # SCR-002: 이벤트 참여
│       ├── SPEC-003.md        # SCR-003: 그룹 오버레이
│       └── SPEC-004.md        # SCR-004: 이벤트 없음 (404)
│
├── /src
│   ├── /app                   # Next.js App Router
│   │   ├── layout.tsx         # 전체 레이아웃 (폰트, 메타데이터)
│   │   ├── page.tsx           # 홈 (이벤트 생성 페이지)
│   │   ├── /[eventId]         # 이벤트 참여 페이지
│   │   │   └── page.tsx
│   │   └── /api               # API 라우트
│   │       ├── /events
│   │       │   ├── route.ts   # POST /api/events (이벤트 생성)
│   │       │   └── /[eventId]
│   │       │       └── route.ts  # GET (이벤트 조회)
│   │       └── /responses
│   │           └── route.ts   # POST /api/responses (가용 시간 제출)
│   │
│   ├── /components            # 재사용 UI 컴포넌트
│   │   ├── EventForm.tsx      # 이벤트 생성 폼
│   │   ├── TimeGrid.tsx       # 시간 선택 그리드 (드래그)
│   │   ├── GroupOverlay.tsx   # 그룹 가용성 오버레이
│   │   └── NameEntry.tsx      # 참여자 이름 입력
│   │
│   ├── /lib                   # 유틸리티 함수
│   │   ├── db.ts              # 데이터베이스 연결
│   │   ├── event.ts           # 이벤트 관련 로직
│   │   └── time.ts            # 시간/날짜 유틸리티
│   │
│   └── /types                 # TypeScript 타입 정의
│       └── index.ts
│
├── /prisma                    # DB 스키마 & 마이그레이션
│   ├── schema.prisma
│   └── /migrations
│
├── /public                    # 정적 파일 (아이콘, 이미지)
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 단계별 생성 순서

### Phase 1: 기반 설정
1. `CLAUDE.md` 작성 (코딩 룰)
2. Next.js 프로젝트 초기화
3. Prisma + SQLite 설정
4. Tailwind CSS 설정

### Phase 2: 핵심 기능 개발
5. DB 스키마 작성 (events, responses 테이블)
6. API 라우트 구현
7. 이벤트 생성 UI
8. 시간 선택 그리드 (드래그 인터랙션)
9. 그룹 오버레이 뷰

### Phase 3: 마무리
10. 에러 처리 및 엣지케이스 대응
11. 디자인 폴리싱
12. 로컬 환경 동작 검증

---

## 향후 배포 확장 시 변경 사항

| 항목 | 로컬 MVP | 웹 배포 |
|------|---------|--------|
| DB | SQLite (파일 기반) | PostgreSQL (Supabase/Neon) |
| 호스팅 | localhost:3000 | Vercel / Railway |
| 실시간 업데이트 | 폴링 (3초) | Server-Sent Events 또는 WebSocket |
| 환경변수 | .env.local | 플랫폼 환경변수 설정 |
