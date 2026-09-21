import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js は .env.local を自動で読むが、drizzle-kit は別プロセスのため明示的に読む
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // 列名はスネークケース（docs/design/structure.md 5.3）
  casing: "snake_case",
});
