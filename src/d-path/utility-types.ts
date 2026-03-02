// 联合类型转交叉类型
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// 元祖类型转交叉类型
export type TupleToIntersection<T extends any[]> = UnionToIntersection<T[number]>;

// 向函数签名的参数列表前添加参数
export type PrependParams<T extends (...args: any) => any, P extends any[]> = (
  ...args: [...P, ...Parameters<T>]
) => ReturnType<T>;
