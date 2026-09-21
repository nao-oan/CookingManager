import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: { import: importPlugin },
    rules: {
      /*
       * 層の依存方向を強制する（docs/design/structure.md 3章）。
       *   app → actions → repositories → domain
       * domain はフレームワークにも DB にも依存しない。これにより提案
       * アルゴリズムを DB なしで単体テストできる（NFR-13）。
       */
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/domain",
              from: "./src/db",
              message: "domain から db を参照しない（NFR-13）",
            },
            {
              target: "./src/domain",
              from: "./src/actions",
              message: "domain から actions を参照しない（NFR-13）",
            },
            {
              target: "./src/domain",
              from: "./src/repositories",
              message: "domain から repositories を参照しない（NFR-13）",
            },
            {
              target: "./src/domain",
              from: "./src/app",
              message: "domain から app を参照しない（NFR-13）",
            },
            {
              target: "./src/repositories",
              from: "./src/app",
              message: "repositories から app を参照しない",
            },
            {
              target: "./src/components",
              from: "./src/repositories",
              message: "コンポーネントはデータ取得を行わない",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/design/mockups/**"]),
]);

export default eslintConfig;
