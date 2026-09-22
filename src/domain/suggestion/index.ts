/**
 * 在庫との突き合わせの公開インターフェース。
 *
 * 提案アルゴリズム本体（並べ替えを含む suggest）は #29 で足す。
 * R-2 の在庫表示はここで公開する判定部分だけを使う。
 */
export { aggregateStock, matchIngredients } from "./match";
export type {
  IngredientMatch,
  MatchableIngredient,
  MatchState,
  StockLot,
  StockTotals,
} from "./types";
