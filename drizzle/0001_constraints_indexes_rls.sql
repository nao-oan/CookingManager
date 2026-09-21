-- Drizzle が生成しない定義を手で追加する（docs/design/database.md 8章 方針3）。
--   1. auth.users への外部キー
--   2. CHECK 制約
--   3. DEFERRABLE な一意制約
--   4. インデックス
--   5. RLS の有効化とポリシー

-- ---------------------------------------------------------------------------
-- 1. 所有者の外部キー（auth.users は Supabase Auth が管理する）
-- ---------------------------------------------------------------------------
ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "meals"
  ADD CONSTRAINT "meals_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. CHECK 制約
-- ---------------------------------------------------------------------------
ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 50);
--> statement-breakpoint
ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_name_check"
  CHECK (length(btrim("name")) BETWEEN 1 AND 100);
--> statement-breakpoint
ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_note_check"
  CHECK ("note" IS NULL OR length("note") <= 1000);
--> statement-breakpoint
-- 必要量は正の数
ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_quantity_check" CHECK ("quantity" > 0);
--> statement-breakpoint
ALTER TABLE "recipe_steps"
  ADD CONSTRAINT "recipe_steps_position_check" CHECK ("position" > 0);
--> statement-breakpoint
ALTER TABLE "recipe_steps"
  ADD CONSTRAINT "recipe_steps_body_check"
  CHECK (length(btrim("body")) BETWEEN 1 AND 500);
--> statement-breakpoint
-- 在庫は 0 を許容する。差分更新で負にならないことを DB 層でも保証する（F5-3）
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_quantity_check" CHECK ("quantity" >= 0);
--> statement-breakpoint
ALTER TABLE "meals"
  ADD CONSTRAINT "meals_note_check"
  CHECK ("note" IS NULL OR length("note") <= 200);
--> statement-breakpoint
ALTER TABLE "meal_items"
  ADD CONSTRAINT "meal_items_display_name_check"
  CHECK (length(btrim("display_name")) BETWEEN 1 AND 100);
--> statement-breakpoint
ALTER TABLE "meal_items"
  ADD CONSTRAINT "meal_items_position_check" CHECK ("position" > 0);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. DEFERRABLE な一意制約
--    並べ替え中に position が一時的に重複するため、検査をトランザクション
--    終了時まで遅らせる（database.md 5.4 / 5.7）
-- ---------------------------------------------------------------------------
ALTER TABLE "recipe_steps"
  ADD CONSTRAINT "recipe_steps_recipe_position_key"
  UNIQUE ("recipe_id", "position") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "meal_items"
  ADD CONSTRAINT "meal_items_meal_position_key"
  UNIQUE ("meal_id", "position") DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. インデックス（database.md 6章）
-- ---------------------------------------------------------------------------
-- 提案: 有効な在庫の抽出（F5-5）。P-1 の期限順表示（F5-2）と警告（F5-4）にも効く
CREATE INDEX "idx_inventory_owner_expires" ON "inventory_items" ("owner_id", "expires_at");
--> statement-breakpoint
CREATE INDEX "idx_inventory_owner_ingredient" ON "inventory_items" ("owner_id", "ingredient_id");
--> statement-breakpoint
-- 提案: レシピの材料をまとめて取得する（N+1 を避ける）
CREATE INDEX "idx_recipe_ingredients_recipe" ON "recipe_ingredients" ("recipe_id");
--> statement-breakpoint
CREATE INDEX "idx_recipe_ingredients_ingredient" ON "recipe_ingredients" ("ingredient_id");
--> statement-breakpoint
-- R-1: レシピ一覧・料理名検索（F3-3）
CREATE INDEX "idx_recipes_owner_name" ON "recipes" ("owner_id", "name");
--> statement-breakpoint
-- R-2 / R-4: 手順の取得
CREATE INDEX "idx_recipe_steps_recipe_position" ON "recipe_steps" ("recipe_id", "position");
--> statement-breakpoint
-- C-2 / 入力補助: 食材の部分一致検索（F2-2）
CREATE INDEX "idx_ingredients_owner_name" ON "ingredients" ("owner_id", "name");
--> statement-breakpoint
-- M-1: 月単位の記録取得（F4-4）
CREATE INDEX "idx_meals_owner_date" ON "meals" ("owner_id", "date");
--> statement-breakpoint
-- M-2: 品目の取得
CREATE INDEX "idx_meal_items_meal_position" ON "meal_items" ("meal_id", "position");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. RLS（NFR-4, F1-2）
--    アプリ層の条件漏れがあっても他人の行へ到達しないための最後の防御線
-- ---------------------------------------------------------------------------
ALTER TABLE "ingredients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recipe_steps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "meals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "meal_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- owner_id を持つテーブル
CREATE POLICY "ingredients_owner_all" ON "ingredients"
  FOR ALL USING ("owner_id" = auth.uid()) WITH CHECK ("owner_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "recipes_owner_all" ON "recipes"
  FOR ALL USING ("owner_id" = auth.uid()) WITH CHECK ("owner_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "inventory_items_owner_all" ON "inventory_items"
  FOR ALL USING ("owner_id" = auth.uid()) WITH CHECK ("owner_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "meals_owner_all" ON "meals"
  FOR ALL USING ("owner_id" = auth.uid()) WITH CHECK ("owner_id" = auth.uid());
--> statement-breakpoint

-- 子テーブルは親を辿って判定する（owner_id を複写しない / database.md 7.2）
CREATE POLICY "recipe_ingredients_owner_all" ON "recipe_ingredients"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "recipes" r WHERE r."id" = "recipe_ingredients"."recipe_id" AND r."owner_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "recipes" r WHERE r."id" = "recipe_ingredients"."recipe_id" AND r."owner_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "recipe_steps_owner_all" ON "recipe_steps"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "recipes" r WHERE r."id" = "recipe_steps"."recipe_id" AND r."owner_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "recipes" r WHERE r."id" = "recipe_steps"."recipe_id" AND r."owner_id" = auth.uid()));
--> statement-breakpoint
CREATE POLICY "meal_items_owner_all" ON "meal_items"
  FOR ALL
  USING (EXISTS (SELECT 1 FROM "meals" m WHERE m."id" = "meal_items"."meal_id" AND m."owner_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "meals" m WHERE m."id" = "meal_items"."meal_id" AND m."owner_id" = auth.uid()));
