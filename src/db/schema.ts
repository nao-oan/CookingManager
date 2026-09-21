/**
 * Drizzle のスキーマ定義。
 *
 * 出典: docs/design/database.md
 * 列名はスネークケース、TypeScript 側はキャメルケース（docs/design/structure.md 5.3）。
 *
 * RLS ポリシー・DEFERRABLE 制約・auth.users への外部キーは Drizzle が生成しないため、
 * マイグレーションファイルへ手で追記する（database.md 8章 方針3）。
 */
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** 単位（F6-6）。質量・容量のみ換算し、可算単位は同一単位でしか比較しない */
export const unitEnum = pgEnum("unit", [
  "g",
  "kg",
  "ml",
  "L",
  "個",
  "袋",
  "パック",
  "本",
  "束",
  "枚",
  "缶",
  "箱",
]);

/** 食事区分（F4-1） */
export const mealSlotEnum = pgEnum("meal_slot", ["breakfast", "lunch", "dinner", "snack"]);

/** 食材マスタ（F2-1） */
export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    defaultUnit: unitEnum("default_unit").notNull(),
    /** 常備食材。true なら不足判定から除外する（F6-4） */
    isStaple: boolean("is_staple").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // 同一オーナー内で食材名を一意にする（F2-3 重複作成の防止）
    unique("ingredients_owner_name_key").on(table.ownerId, table.name),
  ],
);

/** レシピ（F3-1） */
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  name: text("name").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** レシピ材料（F3-2）。「1件以上必須」は Zod で担保する（database.md 5.3） */
export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    // 参照がある食材は削除できない（database.md 4章）
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: unitEnum("unit").notNull(),
  },
  (table) => [
    unique("recipe_ingredients_recipe_ingredient_key").on(table.recipeId, table.ingredientId),
  ],
);

/** レシピ手順（F3-1）。並べ替えのため配列列ではなく別表にする */
export const recipeSteps = pgTable("recipe_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  body: text("body").notNull(),
});

/** 在庫（F5-1）。同じ食材を複数行持て、期限を個別に管理する */
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  ingredientId: uuid("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  /** 0 を許容する。使い切った在庫は行を残し既定表示から外す（F5-3） */
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: unitEnum("unit").notNull(),
  /** 任意。null は期限なしで、期限切れ判定の対象外（F5-5） */
  expiresAt: date("expires_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 食事記録（F4-1）。1日1区分につき1レコード */
export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    /** Asia/Tokyo における日付（NFR-11） */
    date: date("date").notNull(),
    slot: mealSlotEnum("slot").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("meals_owner_date_slot_key").on(table.ownerId, table.date, table.slot)],
);

/** 食事記録の品目（F4-2, F4-3） */
export const mealItems = pgTable("meal_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealId: uuid("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  /** レシピ参照。自由入力の場合と、レシピ削除後は null（database.md 4章） */
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  /** 登録時点の料理名を複写する。レシピを消しても記録は残る */
  displayName: text("display_name").notNull(),
  position: integer("position").notNull(),
});
