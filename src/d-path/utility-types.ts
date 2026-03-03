// 联合类型转交叉类型
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// 元祖类型转交叉类型
export type TupleToIntersection<T extends any[]> = UnionToIntersection<
  T[number]
>;

// 向函数签名的参数列表前添加参数
export type PrependParams<T extends (...args: any) => any, P extends any[]> = (
  ...args: [...P, ...Parameters<T>]
) => ReturnType<T>;

// 从元祖中过滤出满足条件的类型
export type FilterTurple<T extends any[], Condition> = T extends [
  infer First,
  ...infer Rest,
]
  ? Condition extends First
    ? [First, ...FilterTurple<Rest, Condition>]
    : FilterTurple<Rest, Condition>
  : [];

// 从元祖中逆变的方式过滤出满足条件的类型，适用于以函数签名中的参数类型作为过滤条件的情况
export type ContraFilterTurple<T extends any[], Condition> = T extends [
  infer First,
  ...infer Rest,
]
  ? Condition extends First
    ? [First, ...FilterTurple<Rest, Condition>]
    : FilterTurple<Rest, Condition>
  : [];
