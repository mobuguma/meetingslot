# 개발 스택 검토

| 항목 | 내용 |
|------|------|
| Created | 2026.03.15. |
| Status | `draft` |

---

## 선택 기준

1. **MVP 단순성**: 복잡한 설정 없이 바로 시작 가능
2. **로컬 → 웹 확장**: 추가 작업 없이 배포 가능한 구조
3. **TypeScript 기반**: 타입 안전성으로 버그 감소
4. **생태계**: 레퍼런스가 풍부하고 유지보수 용이

---

## 최종 선택 스택

### Frontend + Backend: **Next.js 14 (App Router)**

| 항목 | 내용 |
|------|------|
| 버전 | Next.js 14+ |
| 언어 | TypeScript |
| 이유 | 프론트/백엔드 통합, API 라우트 내장, 배포 용이 (Vercel) |
| 대안 | Vite + Express (분리 관리 복잡), Remix (학습 곡선 높음) |

### 스타일링: **Tailwind CSS**

| 항목 | 내용 |
|------|------|
| 버전 | Tailwind CSS 3+ |
| 이유 | 유틸리티 기반, 빠른 개발, 일관된 디자인 토큰 관리 |
| 대안 | CSS Modules (토큰 관리 번거로움), styled-components (번들 사이즈) |

### 데이터베이스: **SQLite (로컬) / PostgreSQL (배포)**

| 항목 | 내용 |
|------|------|
| 로컬 | SQLite (파일 기반, 설치 불필요) |
| 배포 | PostgreSQL (Supabase 무료 플랜 또는 Neon) |
| 이유 | 로컬에서 별도 DB 서버 없이 즉시 사용 가능 |

### ORM: **Prisma**

| 항목 | 내용 |
|------|------|
| 버전 | Prisma 5+ |
| 이유 | 타입 안전 쿼리, schema.prisma로 명확한 스키마 관리, SQLite↔PostgreSQL 전환 용이 |
| 대안 | Drizzle (가볍지만 레퍼런스 적음), raw SQL (타입 불안전) |

---

## 패키지 목록

### Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@prisma/client": "^5.0.0",
  "typescript": "^5.0.0",
  "nanoid": "^5.0.0"
}
```

### DevDependencies

```json
{
  "prisma": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "postcss": "^8.0.0",
  "autoprefixer": "^10.0.0",
  "@types/node": "^20.0.0",
  "@types/react": "^18.0.0",
  "eslint": "^8.0.0",
  "eslint-config-next": "^14.0.0"
}
```

---

## DB 스키마 명세

### eventId 생성 방식

`nanoid` 라이브러리를 사용하여 짧고 URL-safe한 고유 ID를 생성한다.

```typescript
import { nanoid } from 'nanoid';
const eventId = nanoid(10); // 예: "V1StGXR8_Z"
```

### Prisma 스키마

```prisma
model Event {
  id        String     @id @default(cuid())   // nanoid로 생성 후 직접 할당
  title     String                             // 이벤트 이름 (최대 50자)
  dates     String                             // JSON 배열 (YYYY-MM-DD 형식)
  startTime String                             // UTC 기준 시작 시간 (HH:00)
  endTime   String                             // UTC 기준 종료 시간 (HH:00)
  timezone  String                             // IANA 타임존 (예: "Asia/Seoul")
  createdAt DateTime   @default(now())
  responses Response[]
}

model Response {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name      String                             // 참여자 이름 (최대 50자)
  slots     String                             // JSON 배열 ("20260320T090000" 형식, UTC)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

> `dates`, `slots` 필드는 SQLite 호환을 위해 JSON 문자열로 저장. 애플리케이션 레이어에서 `JSON.parse` / `JSON.stringify` 처리.
> 관계: `Event 1:N Response`. 이벤트 삭제(90일 만료) 시 응답도 CASCADE 삭제.

---

## 실시간 업데이트 전략

### MVP: 폴링 (Polling)

```typescript
// 3초마다 API 호출로 최신 응답 데이터 갱신
useEffect(() => {
  const timer = setInterval(() => fetchResponses(eventId), 3000);
  return () => clearInterval(timer);
}, [eventId]);
```

| 항목 | 내용 |
|------|------|
| 방식 | `setInterval` + `fetch` |
| 간격 | 3초 |
| 장점 | 구현 단순, 별도 서버 설정 불필요 |
| 단점 | 실시간성 낮음, 불필요한 요청 발생 |

### 향후: Server-Sent Events (SSE)

배포 단계에서 Next.js Route Handler의 SSE로 교체.
WebSocket 대비 단방향이지만 구현이 간단하고 HTTP 기반으로 프록시 친화적.

---

## 환경 설정

### 로컬 개발

```bash
# 설치
npm install

# DB 초기화
npx prisma migrate dev --name init

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```

### 환경 변수 (`.env.local`)

```env
# 로컬 SQLite
DATABASE_URL="file:./dev.db"
```

### 배포 시 변경 사항

```env
# PostgreSQL (Supabase)
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

Prisma schema.prisma에서 provider만 변경:
```prisma
// 로컬
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 배포
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 검증 스크립트

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

---

## 기술 스택 요약

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 프레임워크 | Next.js 14 | App Router |
| 언어 | TypeScript 5 | 전체 적용 |
| 스타일링 | Tailwind CSS 3 | + Pretendard 폰트 |
| DB (로컬) | SQLite | 파일 기반 |
| DB (배포) | PostgreSQL | Supabase/Neon |
| ORM | Prisma 5 | 타입 안전 쿼리 |
| 실시간 (MVP) | Polling (3초) | |
| 실시간 (향후) | SSE | |
| 배포 | Vercel | 무료 플랜 가능 |
| 코드 검증 | ESLint + TypeScript | npm run build |
