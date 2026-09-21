// 各画面の HTML に styles.css を埋め込み、単体で完結するファイルを dist/ に書き出す。
//
// html.to.design プラグインはローカルの外部CSSを解決できないため、
// Figma へ取り込むときはこの dist/ 配下のファイルを使う。
//
//   node docs/design/mockups/html/build-standalone.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
mkdirSync(dist, { recursive: true });

const css = readFileSync(join(here, 'styles.css'), 'utf8');

const pages = readdirSync(here)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort();

for (const page of pages) {
  const html = readFileSync(join(here, page), 'utf8');
  if (!/<link[^>]+styles\.css[^>]*>/.test(html)) {
    console.warn(`  ! ${page}: styles.css への link が見つからない。そのまま複製する`);
  }
  // <link rel="stylesheet" href="styles.css"> を CSS 本体に差し替える
  const inlined = html.replace(
    /<link[^>]+href=["']styles\.css["'][^>]*>/,
    `<style>\n${css}\n</style>`
  );
  writeFileSync(join(dist, page), inlined, 'utf8');
  console.log(`  ${page} -> dist/${page}`);
}

// 全画面を一覧できるコンタクトシート
const cards = pages
  .map((p) => {
    const title = (readFileSync(join(here, p), 'utf8').match(/<title>(.*?)<\/title>/) || [, p])[1];
    return `    <figure>
      <iframe src="${p}" width="390" height="844" loading="lazy"></iframe>
      <figcaption>${title}</figcaption>
    </figure>`;
  })
  .join('\n');

writeFileSync(
  join(here, 'index.html'),
  `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>CookingManager 全画面</title>
<style>
  body { margin: 0; padding: 24px; background: #DDE3DA; font-family: 'Noto Sans JP', sans-serif; }
  h1 { font-size: 20px; margin: 0 0 18px; color: #1E2B21; }
  .sheet { display: flex; flex-wrap: wrap; gap: 24px; }
  figure { margin: 0; }
  iframe { border: none; background: #FEFDF9; display: block; }
  figcaption { font-size: 12px; color: #1E2B21; padding-top: 6px; text-align: center; }
</style>
</head>
<body>
  <h1>CookingManager 全画面（${pages.length}枚）</h1>
  <div class="sheet">
${cards}
  </div>
</body>
</html>
`,
  'utf8'
);

console.log(`\n${pages.length} 画面を dist/ に書き出した。一覧は index.html。`);
