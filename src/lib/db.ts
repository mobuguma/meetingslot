// 데이터베이스 연결 관리
// Prisma 7은 드라이버 어댑터 방식을 사용합니다.
// Next.js 개발 환경에서 핫 리로드 시 클라이언트가 중복 생성되는 것을 방지하기 위해
// 전역 변수에 인스턴스를 캐싱합니다.

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // SQLite 파일 경로는 환경변수에서 읽습니다 (예: file:./prisma/dev.db)
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  // PrismaLibSql은 Config 객체(url)를 직접 받습니다
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
