/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프록시 환경에서 CSS/JS 정적 파일 경로 접두사 설정
  // 프록시 URL이 /proxy/3000/ 형태일 때: NEXT_PUBLIC_BASE_PATH=/proxy/3000
  // 로컬 직접 접속 시: 비워두거나 설정하지 않음
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
