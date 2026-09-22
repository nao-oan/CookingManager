# CookingManager

日々の料理を管理するクラウドWebアプリケーション。

レシピを登録し、食べたものを記録し、冷蔵庫の在庫から「いま作れる料理」を買い足しの少ない順に提案する。

## 主な機能

| 機能 | 内容 |
|---|---|
| レシピ登録 | 料理名・材料・手順を登録し、材料ごとに在庫の有無を確認できる |
| 食事記録 | 日付と食事区分ごとに、食べたものを記録する |
| 在庫管理 | 冷蔵庫の中身を数量・賞味期限つきで管理する |
| レシピ提案 | 在庫と材料を突き合わせ、不足食材の少ない順にレシピを提案する |

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [要件定義書](docs/spec/cooking-manager-requirements.md) | 概要、機能要件、非機能要件、技術要件、プロジェクト計画 |
| [サイトマップ](docs/design/sitemap.md) | 画面一覧、URL構成、画面遷移図、ナビゲーション構造 |
| [画面設計書](docs/design/screen-design.md) | デザイントークン、共通コンポーネント、17画面の定義、モックアップ |
| [システム設計書](docs/design/system.md) | アーキテクチャ、データフロー、API仕様、提案アルゴリズム |
| [DB設計書](docs/design/database.md) | ER図、テーブル定義、インデックス、RLSポリシー |
| [ファイル設計書](docs/design/structure.md) | ディレクトリ構成、モジュールの責務、命名規則 |
| [CI/CD とテスト](docs/design/ci-cd.md) | 開発から本番までの流れ、CIのジョブ構成、テストの内訳 |

## 開発環境の構築

### 必要なもの

| 項目 | バージョン |
|---|---|
| Node.js | 24 以上 |
| Supabase のプロジェクト | 開発用。無料枠で足りる |

### 手順

```bash
# 1. 依存関係をインストールする
npm install

# 2. 環境変数を用意する
cp .env.example .env.local
#    Supabase ダッシュボードの Project Settings から4つの値を転記する
#    （どの値をどこから取るかは .env.example のコメントに記載）

# 3. マイグレーションを適用する
npm run db:migrate

# 4. 開発サーバーを起動する
npm run dev   # http://localhost:3000
```

### ローカルDBを使う場合（任意）

Docker があれば、クラウドの代わりにローカルの Supabase を使える。

```bash
npm run db:start      # 初回は Docker イメージの取得に5〜10分かかる
                      # 出力された URL と鍵を .env.local に転記する
npm run db:migrate
```

管理画面（Supabase Studio）は http://127.0.0.1:54323 で開く。停止は `npm run db:stop`。

### コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバーを起動する |
| `npm run build` | 本番ビルドを作る |
| `npm test` | 単体テストを実行する（Vitest） |
| `npm run test:e2e` | E2E を実行する（Playwright。ビルドから通しで行う） |
| `npm run lint` | ESLint を実行する |
| `npm run typecheck` | 型チェックを実行する |
| `npm run format` | Prettier で整形する（`docs/` は対象外） |
| `npm run db:start` / `db:stop` | ローカルDBを起動・停止する |
| `npm run db:generate` | スキーマ変更からマイグレーションを生成する |
| `npm run db:migrate` | マイグレーションを適用する |
| `npm run db:studio` | Drizzle Studio を開く |

ディレクトリ構成と命名規則は[ファイル設計書](docs/design/structure.md)を参照。`.env` 系のファイルはコミットしない（NFR-7）。


### ブラウザ操作（Playwright MCP）

リポジトリ直下の `.mcp.json` に Playwright MCP サーバーを定義してある。Claude Code から実際のブラウザを操作して画面の確認ができる。

- 初回はセッション開始時にサーバーの利用可否を尋ねられる
- インストール済みの Chrome を使うため、ブラウザの追加ダウンロードは不要
- CI で回す E2E テスト（下記）とは別物

### E2E テスト

サイトマップ4章の主要導線5本を Playwright で通す。CI では単体テストとビルドが通ってから実行する。

```bash
npm run test:e2e        # ビルド → サーバー起動 → 5本を直列で実行
npm run test:e2e:ui     # 画面を見ながら実行する
```

| 項目 | 内容 |
|---|---|
| 対象 | 開発用 Supabase プロジェクト。本番には接続しない |
| アカウント | テスト用の1アカウント（`E2E_EMAIL` / `E2E_PASSWORD`） |
| データ | 実行前後にそのアカウントのデータを空にする。他のユーザーの行には触れない |
| 注意 | **このアカウントは CI 専用。** 手元で画面を見るときは別のアカウント（`DEMO_EMAIL` / `DEMO_PASSWORD`）を使う。同じアカウントを使うと、CI の実行中にデータを消し合って E2E が落ちる |
| 並列 | しない。1アカウントを共有するため `workers: 1` |

**ビルドから通しで実行する理由。** `NEXT_PUBLIC_*` はビルド時に値が埋め込まれるため、実行時に環境変数を渡しても接続先は変わらない。ローカルには `.env.production.local`（本番プロジェクト）があり `.env.local` より優先されるので、開発プロジェクトの値を明示的に渡してビルドし直している。

CI に必要なシークレット（GitHub Actions）:

| 名前 | 内容 |
|---|---|
| `E2E_EMAIL` / `E2E_PASSWORD` | テスト用アカウント |
| `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY` | 開発用 Supabase プロジェクト |
| `E2E_DATABASE_URL` | 同プロジェクトへの接続文字列（データ準備と後片付けに使う） |

`E2E_DATABASE_URL` には **Connection Pooler（Supavisor）の接続文字列**を入れる。`db.<ref>.supabase.co` の直接接続は IPv6 でしか名前解決できず、GitHub Actions のランナーからは `ENETUNREACH` で届かない。ホストは `aws-0-<region>.pooler.supabase.com`、ユーザー名は `postgres.<ref>` の形になる。

## デプロイ

本番: https://cooking-manager-two.vercel.app

| 項目 | 内容 |
|---|---|
| ホスティング | Vercel。main への push で自動デプロイ |
| DB | Supabase。開発用とは別プロジェクト |
| 環境変数 | Vercel の Production に設定する。リポジトリには置かない（NFR-7） |

### 本番DBへのマイグレーション

本番の接続情報を `.env.production.local` に置き、それを読ませて適用する。

```bash
node -e "require('dotenv').config({path:'.env.production.local'});require('child_process').execSync('npx drizzle-kit migrate',{stdio:'inherit',env:process.env})"
```

スキーマを変更したときは、**本番へ適用してからデプロイする**。アプリが先に新しいスキーマを前提に動くと、適用までの間エラーになる。

## 開発状況

**全7フェーズ完了。** 要件定義書の機能要件・非機能要件をすべて実装し、CI で単体テスト99件と E2E 32件（Chromium / WebKit）が通る。進捗は GitHub Projects で管理する。

| # | フェーズ | 状態 |
|---|---|---|
| 0 | 要件定義・設計 | 完了 |
| 1 | 環境構築 | 完了 |
| 2 | 基盤（認証・食材） | 完了 |
| 3 | レシピ登録 | 完了 |
| 4 | 在庫管理 | 完了 |
| 5 | レシピ提案 | 完了 |
| 6 | 食事記録 | 完了 |
| 7 | 仕上げ | 完了 |

実機での確認（Safari / Edge）と、本番 Supabase の Redirect URLs へ `/auth/callback` を登録することだけが残っている。

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js（App Router）／ TypeScript ／ Tailwind CSS ／ shadcn/ui |
| バックエンド | Next.js Server Actions / Route Handlers |
| データベース | Supabase（PostgreSQL）／ Drizzle ORM ／ RLS |
| 認証 | Supabase Auth |
| ホスティング | Vercel |
| CI | GitHub Actions |
| テスト | Vitest（単体）／ Playwright（E2E） |

選定理由と却下した構成は[要件定義書「4. 技術要件」](docs/spec/cooking-manager-requirements.md#4-技術要件)を参照。
