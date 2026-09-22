import postgres from "postgres";

/**
 * E2E のデータ準備と後片付け。
 *
 * アプリのリポジトリ層は `server-only` を含むため Playwright からは読み込めない。
 * ここでは素の SQL で直接触る。触るのはテストアカウントの行だけに限る。
 */
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 2 });

export const TEST_EMAIL = process.env.E2E_EMAIL!;
export const TEST_PASSWORD = process.env.E2E_PASSWORD!;

let cachedOwnerId: string | undefined;

export async function ownerId(): Promise<string> {
  if (cachedOwnerId) return cachedOwnerId;

  const [row] = await sql<{ id: string }[]>`
    select id from auth.users where email = ${TEST_EMAIL} limit 1
  `;
  if (!row) throw new Error(`テストアカウントが無い: ${TEST_EMAIL}。E2E_EMAIL を確認すること`);

  cachedOwnerId = row.id;
  return row.id;
}

/** テストアカウントのデータを消す。他のユーザーの行には触れない */
export async function resetData(): Promise<void> {
  const owner = await ownerId();

  await sql`delete from meals where owner_id = ${owner}`;
  await sql`delete from inventory_items where owner_id = ${owner}`;
  await sql`delete from recipes where owner_id = ${owner}`;
  await sql`delete from ingredients where owner_id = ${owner}`;
}

export async function createIngredient(
  name: string,
  unit: string,
  isStaple = false,
): Promise<string> {
  const owner = await ownerId();
  const [row] = await sql<{ id: string }[]>`
    insert into ingredients (owner_id, name, default_unit, is_staple)
    values (${owner}, ${name}, ${unit}::unit, ${isStaple})
    returning id
  `;
  return row.id;
}

export async function createRecipe(
  name: string,
  ingredients: { id: string; quantity: number; unit: string }[],
  steps: string[] = [],
): Promise<string> {
  const owner = await ownerId();
  const [recipe] = await sql<{ id: string }[]>`
    insert into recipes (owner_id, name) values (${owner}, ${name}) returning id
  `;

  for (const member of ingredients) {
    await sql`
      insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
      values (${recipe.id}, ${member.id}, ${member.quantity}, ${member.unit}::unit)
    `;
  }

  for (const [index, body] of steps.entries()) {
    await sql`
      insert into recipe_steps (recipe_id, position, body)
      values (${recipe.id}, ${index + 1}, ${body})
    `;
  }

  return recipe.id;
}

export async function createInventory(
  ingredientId: string,
  quantity: number,
  unit: string,
  expiresAt: string | null = null,
): Promise<string> {
  const owner = await ownerId();
  const [row] = await sql<{ id: string }[]>`
    insert into inventory_items (owner_id, ingredient_id, quantity, unit, expires_at)
    values (${owner}, ${ingredientId}, ${quantity}, ${unit}::unit, ${expiresAt})
    returning id
  `;
  return row.id;
}

export async function countRows(table: "meals" | "inventory_items" | "recipes"): Promise<number> {
  const owner = await ownerId();
  const [row] = await sql<{ n: number }[]>`
    select count(*)::int as n from ${sql(table)} where owner_id = ${owner}
  `;
  return row.n;
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
