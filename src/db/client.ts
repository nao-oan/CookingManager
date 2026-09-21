/**
 * DB 接続。サーバー専用。
 *
 * クライアントコンポーネントから import しないこと。データ取得は
 * src/repositories/ 経由に限る（docs/design/structure.md 3章）。
 */
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL が設定されていない。.env.local を確認すること。");
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema, casing: "snake_case" });
