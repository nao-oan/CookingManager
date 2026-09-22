/**
 * DB 接続。サーバー専用。
 *
 * クライアントコンポーネントから import しないこと。データ取得は
 * src/repositories/ 経由に限る（docs/design/structure.md 3章）。
 */
import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

let connection: Db | null = null;

function connect(): Db {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていない。.env.local を確認すること。");
  }

  return drizzle(postgres(connectionString, { prepare: false }), {
    schema,
    casing: "snake_case",
  });
}

/**
 * 接続はモジュール評価時ではなく最初のクエリ時に作る。
 *
 * next build はページデータの収集でこのモジュールを評価するだけなので、
 * ビルド環境に DATABASE_URL を置かなくてもビルドが通るようにする。
 * 設定漏れは最初のクエリで上のエラーとして分かる。
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    connection ??= connect();
    const value = Reflect.get(connection, property);
    // メソッドの this は実体に固定する。プロキシ越しでは内部状態を読めない
    return typeof value === "function" ? value.bind(connection) : value;
  },
});
