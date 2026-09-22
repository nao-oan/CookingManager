import { describe, expect, it } from "vitest";
import { ingredientThumbnail, recipeThumbnail } from "./thumbnail";

describe("ingredientThumbnail", () => {
  it("食材の種類ごとに絵文字を返す", () => {
    expect(ingredientThumbnail("鶏もも肉")).toBe("🍗");
    expect(ingredientThumbnail("ほうれん草")).toBe("🥬");
    expect(ingredientThumbnail("しめじ")).toBe("🍄");
    expect(ingredientThumbnail("卵")).toBe("🥚");
    expect(ingredientThumbnail("牛乳")).toBe("🥛");
  });

  it("先に並べた規則が優先される（鶏もも肉は肉より鶏）", () => {
    expect(ingredientThumbnail("鶏もも肉")).toBe("🍗");
    expect(ingredientThumbnail("合いびき肉")).toBe("🍖");
  });

  it("該当しない食材は既定の絵文字になる", () => {
    expect(ingredientThumbnail("なにかの食材")).toBe("🥗");
  });

  it("同じ名前なら常に同じ絵文字を返す", () => {
    expect(ingredientThumbnail("トマト")).toBe(ingredientThumbnail("トマト"));
  });
});

describe("recipeThumbnail", () => {
  it("料理名から絵文字を返す", () => {
    expect(recipeThumbnail("チキンカレー")).toBe("🍛");
    expect(recipeThumbnail("ポテトサラダ")).toBe("🥗");
    expect(recipeThumbnail("鶏肉ときのこのバターしょうゆ炒め")).toBe("🍳");
    expect(recipeThumbnail("肉じゃが")).toBe("🥘");
  });

  it("料理名で拾えない場合は食材名の規則で拾う", () => {
    expect(recipeThumbnail("鮭のホイル包み")).toBe("🐟");
  });

  it("どちらでも拾えない場合は既定の絵文字になる", () => {
    expect(recipeThumbnail("いつものやつ")).toBe("🍽️");
  });
});
