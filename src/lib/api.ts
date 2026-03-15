// 클라이언트에서 API 호출 시 프록시 환경의 base path를 자동으로 포함합니다.
// 프록시 없는 로컬 환경에서는 BASE_PATH가 비어 있으므로 기존과 동일하게 동작합니다.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// 예: apiUrl('/api/events') → '/proxy/3000/api/events' (프록시 환경)
//                           → '/api/events'             (로컬 환경)
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
