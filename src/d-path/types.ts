import { PathData } from "./index";
import type { TupleToIntersection, PrependParams } from "./utility-types";

export type Coord = [number, number];

export type RelativeCommand = "l" | "h" | "v" | "c" | "s" | "q" | "t" | "a";
export type AbsoluteCommand = "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A";
export type Command = RelativeCommand | AbsoluteCommand;
export type ToAbsoluteCommand<Command> = Command extends "l" | "L"
  ? "L"
  : Command extends "h" | "H"
    ? "H"
    : Command extends "v" | "V"
      ? "V"
      : Command extends "c" | "C"
        ? "C"
        : Command extends "s" | "S"
          ? "S"
          : Command extends "q" | "Q"
            ? "Q"
            : Command extends "t" | "T"
              ? "T"
              : Command extends "a" | "A"
                ? "A"
                : never;

// 用于 createPath 方法的重载签名组成的元祖类型，后续可以转为交叉类型来实现重载；其它方法有类似的重载签名也可以以这个元祖为基础映射类型以进行拓展
type AddPathOverloadsTuple = [
  <C extends "l" | "L">(command: C, endX: number, endY: number) => PathData,
  <C extends "l" | "L">(command: C, end: Coord) => PathData,
  <C extends "h" | "H">(command: C, endX: number) => PathData,
  <C extends "v" | "V">(command: C, endY: number) => PathData,
  <C extends "c" | "C">(
    command: C,
    controlPointX1: number,
    controlPointY1: number,
    controlPointX2: number,
    controlPointY2: number,
    endX: number,
    endY: number,
  ) => PathData,
  <C extends "c" | "C">(
    command: C,
    controlPoint1: Coord,
    controlPoint2: Coord,
    end: Coord,
  ) => PathData,
  <C extends "s" | "S">(
    command: C,
    controlPointX: number,
    controlPointY: number,
    endX: number,
    endY: number,
  ) => PathData,
  <C extends "s" | "S">(command: C, controlPoint: Coord, end: Coord) => any,
  <C extends "q" | "Q">(
    command: C,
    controlPointX: number,
    controlPointY: number,
    endX: number,
    endY: number,
  ) => PathData,
  <C extends "q" | "Q">(command: C, controlPoint: Coord, end: Coord) => any,
  <C extends "t" | "T">(command: C, endX: number, endY: number) => any,
  <C extends "t" | "T">(command: C, end: Coord) => any,
  <C extends "a" | "A">(
    command: C,
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    endX: number,
    endY: number,
  ) => PathData,
  <C extends "a" | "A">(
    command: C,
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    end: Coord,
  ) => PathData,
  <C extends "a" | "A">(
    command: C,
    radius: number | [number, number],
    end: Coord,
    rotation?: number,
    largeArcFlag?: boolean | 0 | 1,
    sweepFlag?: boolean | 0 | 1,
  ) => PathData,
];

// 用于将 AddPathOverloadsTuple 转换为 CreatePathOverloadsTuple 的工厂类型，实质上是向 AddPathOverloadsTuple 中的每个函数签名的参数列表前添加一个 start: Coord 参数
type CreatePathOverloadsTupleFactory<T extends ((...args: any[]) => any)[]> =
  T extends [
    infer First extends (...args: any) => any,
    ...infer Rest extends ((...args: any) => any)[],
  ]
    ? [
        PrependParams<First, [start: Coord]>,
        ...CreatePathOverloadsTupleFactory<Rest>,
      ]
    : [];
// 用于 addPath 方法的重载签名组成的元祖类型
type CreatePathOverloadsTuple =
  CreatePathOverloadsTupleFactory<AddPathOverloadsTuple>;

// 把一个函数签名的返回值变成 pathSegmentInfo, I 指定了要选用的 Command 类型在该函数参数中的序号
type MakePathSegmentInfoResult<
  T extends (...args: any[]) => any,
  I extends number,
> = T extends (...args: any[]) => any
  ? (
      ...args: Parameters<T>
    ) => pathSegmentInfo<ToAbsoluteCommand<Parameters<T>[I]>>
  : never;

// 把 CreatePathOverloadsTuple 中的函数签名转换为 CreatePathSegmentInfoOverloadsTuple 的工具函数，
type CreatePathSegmentInfoOverloadsTupleFactory<
  T extends ((...args: any[]) => any)[],
> = T extends [
  infer First extends (...args: any) => any,
  ...infer Rest extends ((...args: any) => any)[],
]
  ? [
      MakePathSegmentInfoResult<First, 1>,
      ...CreatePathSegmentInfoOverloadsTupleFactory<Rest>,
    ]
  : [];

// 用于 createPathSegmentInfo 方法的重载签名组成的元祖类型
type CreatePathSegmentInfoOverloadsTuple =
  CreatePathSegmentInfoOverloadsTupleFactory<CreatePathOverloadsTuple>;

// 用于 createPath 方法的重载签名
export type CreatePathOverloads = TupleToIntersection<CreatePathOverloadsTuple>;
// 用于 addPath 方法的重载签名
export type AddPathOverloads = TupleToIntersection<AddPathOverloadsTuple>;
// 用于 CreatePathSegmentInfoOverloads 方法的重载签名
export type CreatePathSegmentInfoOverloads =
  TupleToIntersection<CreatePathSegmentInfoOverloadsTuple>;

// 根据 SVG 命令名称返回对应命令参数组成的元祖类型
export type PathSegmentArgs<C extends Command> = C extends "l" | "L"
  ? [number, number]
  : C extends "h" | "H"
    ? [number]
    : C extends "v" | "V"
      ? [number]
      : C extends "c" | "C"
        ? [number, number, number, number, number, number]
        : C extends "s" | "S"
          ? [number, number, number, number]
          : C extends "q" | "Q"
            ? [number, number, number, number]
            : C extends "t" | "T"
              ? [number, number]
              : C extends "a" | "A"
                ? [number, number, number, 0 | 1, 0 | 1, number, number]
                : never;

export interface pathSegmentInfo<C extends AbsoluteCommand = AbsoluteCommand> {
  start: Coord;
  command: C;
  nativeDArgs: PathSegmentArgs<C> extends never ? number[] : PathSegmentArgs<C>;
}
