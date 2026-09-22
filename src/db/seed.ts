/**
 * 開発と性能試験で共用するシードデータの生成（docs/design/structure.md 6章 方針4）。
 *
 * DB へ流し込む処理は持たず、配列を組み立てる純関数だけを公開する。
 * 性能試験（src/domain/suggestion/suggest.perf.test.ts）がこの関数を直接呼ぶため、
 * ここで src/db/client.ts を import すると server-only がテストで落ちる。
 * 投入スクリプトを足すときは別ファイルに置き、この関数の戻り値を INSERT すること。
 */
import type { DateOnly, Ingredient, InventoryItem, Recipe, Unit, UUID } from "@/types";

export interface SeedOptions {
  /** 食材マスタの件数 */
  ingredientCount?: number;
  /** レシピの件数。NFR-2 の想定は200件 */
  recipeCount?: number;
  /** レシピ1件あたりの材料数の平均。NFR-2 の想定は6件 */
  ingredientsPerRecipe?: number;
  /** 在庫の件数。NFR-2 の想定は100件 */
  inventoryCount?: number;
  /** 賞味期限を散らす基準日 */
  today?: DateOnly;
  /** 乱数の種。同じ種なら必ず同じデータになる（性能試験を揺らさないため） */
  seed?: number;
  ownerId?: UUID;
}

export interface SeedData {
  ownerId: UUID;
  ingredients: Ingredient[];
  recipes: Recipe[];
  inventory: InventoryItem[];
}

const DEFAULTS = {
  ingredientCount: 60,
  recipeCount: 200,
  ingredientsPerRecipe: 6,
  inventoryCount: 100,
  /** 既定値を固定日にするのは、引数を省いても生成結果が変わらないようにするため */
  today: "2026-04-01",
  seed: 20260401,
  ownerId: "00000000-0000-4000-8000-000000000001",
} satisfies Required<SeedOptions>;

/** 質量・容量・可算をひと通り混ぜ、換算できない組み合わせ（F6-6）も現れるようにする */
const UNIT_POOL: Unit[] = ["g", "kg", "ml", "L", "個", "袋", "パック", "本", "束", "枚"];

const NAME_POOL = [
  "鶏もも肉",
  "豚バラ肉",
  "牛こま切れ",
  "玉ねぎ",
  "にんじん",
  "じゃがいも",
  "キャベツ",
  "ほうれん草",
  "卵",
  "牛乳",
  "豆腐",
  "しめじ",
];

const DISH_POOL = ["炒め", "煮込み", "焼き", "和え", "揚げ", "蒸し", "サラダ", "スープ"];

/**
 * シードデータを決定的に生成する。
 *
 * 乱数は種付きの線形合同法で固定する。Math.random を使うと性能試験の入力が毎回変わり、
 * 失敗を再現できなくなるため。
 */
export function generateSeed(options: SeedOptions = {}): SeedData {
  const config = { ...DEFAULTS, ...options };
  const random = createRandom(config.seed);
  const createdAt = new Date(`${config.today}T00:00:00.000Z`);

  const ingredients: Ingredient[] = Array.from({ length: config.ingredientCount }, (_, index) => ({
    id: uuidAt(0x10000000, index),
    ownerId: config.ownerId,
    name: `${NAME_POOL[index % NAME_POOL.length]}${Math.floor(index / NAME_POOL.length) + 1}`,
    defaultUnit: UNIT_POOL[index % UNIT_POOL.length],
    // 10件に1件を常備食材にして、分母から外れる材料（F6-4）を混ぜる
    isStaple: index % 10 === 0,
    createdAt,
  }));

  const recipes: Recipe[] = Array.from({ length: config.recipeCount }, (_, index) => {
    // 材料数は平均の前後2件で散らす。1件未満にはしない（F3-2）
    const count = Math.max(1, config.ingredientsPerRecipe - 2 + pick(random, 5));
    const used = new Set<number>();

    while (used.size < count && used.size < ingredients.length) {
      used.add(pick(random, ingredients.length));
    }

    return {
      id: uuidAt(0x20000000, index),
      ownerId: config.ownerId,
      name: `${NAME_POOL[index % NAME_POOL.length]}の${DISH_POOL[index % DISH_POOL.length]}${index + 1}`,
      ingredients: [...used].map((position) => {
        const ingredient = ingredients[position];
        return {
          ingredientId: ingredient.id,
          name: ingredient.name,
          isStaple: ingredient.isStaple,
          quantity: quantityFor(ingredient.defaultUnit, random),
          unit: ingredient.defaultUnit,
        };
      }),
      steps: [`下ごしらえをする`, `加熱する`, `味を調えて盛り付ける`],
      note: index % 5 === 0 ? "作り置き向き" : null,
    };
  });

  const inventory: InventoryItem[] = Array.from({ length: config.inventoryCount }, (_, index) => {
    // 在庫は少数の食材に偏らせず、先頭から順に食材を割り当てて同一食材の複数ロット（F6-5）も作る
    const ingredient = ingredients[index % ingredients.length];
    // 5件に1件は食材の標準単位と違う次元にして unknown（F6-6）を起こす
    const unit =
      index % 5 === 0 ? UNIT_POOL[(index + 4) % UNIT_POOL.length] : ingredient.defaultUnit;

    return {
      id: uuidAt(0x30000000, index),
      ownerId: config.ownerId,
      ingredientId: ingredient.id,
      quantity: quantityFor(unit, random),
      unit,
      expiresAt: expiryFor(config.today, index, random),
    };
  });

  return { ownerId: config.ownerId, ingredients, recipes, inventory };
}

/** 単位に見合った数量。質量・容量は大きめ、可算は小さめにする */
function quantityFor(unit: Unit, random: () => number): number {
  if (unit === "g" || unit === "ml") return (pick(random, 10) + 1) * 50;
  if (unit === "kg" || unit === "L") return (pick(random, 4) + 1) * 0.5;
  return pick(random, 5) + 1;
}

/** 期限なし・期限切れ・有効をひと通り作る（F5-5 の確認のため） */
function expiryFor(today: DateOnly, index: number, random: () => number): DateOnly | null {
  if (index % 4 === 0) return null;
  if (index % 7 === 0) return addDays(today, -(pick(random, 10) + 1));
  return addDays(today, pick(random, 30));
}

function addDays(date: DateOnly, days: number): DateOnly {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** 0 以上 max 未満の整数 */
function pick(random: () => number, max: number): number {
  return Math.floor(random() * max);
}

/**
 * 線形合同法（Numerical Recipes の係数）。
 * 暗号用途ではなく、同じ種から同じ並びを得るためだけに使う。
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** 連番から UUID の形の識別子を作る。生成結果を決定的にするため */
function uuidAt(prefix: number, index: number): UUID {
  const head = prefix.toString(16).padStart(8, "0");
  const tail = index.toString(16).padStart(12, "0");
  return `${head}-0000-4000-8000-${tail}`;
}
