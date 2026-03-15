# MeetSlot 프로젝트 - Claude 코딩 룰

## 1. 한국어 주석
- 모든 함수와 컴포넌트에 한국어 주석 필수
- 비개발자도 이해할 수 있는 수준으로 작성
- "왜 이렇게 했는지" 이유 중심으로 작성

## 2. 변수명
- 짧고 명확하게 (eventId, slots, isLoading)
- 불리언: is/has/can 접두사
- 배열: 복수형 (dates, slots, responses)
- 이벤트 핸들러: on 접두사 (onSubmit, onSave)

## 3. 코드 품질
- 중복 로직은 함수/컴포넌트로 추출
- 한 함수는 한 가지 역할
- Early return으로 중첩 줄이기

## 4. 디자인
- 코드 작업 전 DESIGN-GUIDE.md 참조 필수
- Tailwind에서 정의된 색상 토큰만 사용
- 임의 색상/폰트 사이즈 직접 입력 금지

## 5. 검증
- 코드 완료 후 반드시 `npm run build` 실행
- TypeScript 오류 없이 완료
