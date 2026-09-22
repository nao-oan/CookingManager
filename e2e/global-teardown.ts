import { closeDb, resetData } from "./fixtures/db";

/** 実行後にテストアカウントのデータを空に戻す */
export default async function globalTeardown(): Promise<void> {
  await resetData();
  await closeDb();
}
