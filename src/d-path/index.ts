import type {
  ContraFilterTurple,
  PrependParams,
  TupleToIntersection,
} from "./utility-types";

type RelativeCommand = "l" | "h" | "v" | "c" | "s" | "q" | "t" | "a";
type AbsoluteCommand = "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A";
type Command = RelativeCommand | AbsoluteCommand;
type ToAbsoluteCommand<Command> = Command extends "l" | "L"
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
type Coord = [number, number];

// 用于 createPath 方法的重载签名组成的元祖类型，后续可以转为交叉类型来实现重载；其它方法有类似的重载签名也可以以这个元祖为基础映射类型以进行拓展
type AddPathOverloadsTuple = [
  <C extends "l" | "L">(
    command: ToAbsoluteCommand<C>,
    endX: number,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "l" | "L">(
    command: ToAbsoluteCommand<C>,
    end: Coord,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "h" | "H">(
    command: ToAbsoluteCommand<C>,
    endX: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "v" | "V">(
    command: ToAbsoluteCommand<C>,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "c" | "C">(
    command: ToAbsoluteCommand<C>,
    controlPointX1: number,
    controlPointY1: number,
    controlPointX2: number,
    controlPointY2: number,
    endX: number,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "c" | "C">(
    command: ToAbsoluteCommand<C>,
    controlPoint1: Coord,
    controlPoint2: Coord,
    end: Coord,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "s" | "S">(
    command: ToAbsoluteCommand<C>,
    controlPointX: number,
    controlPointY: number,
    endX: number,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "s" | "S">(
    command: ToAbsoluteCommand<C>,
    controlPoint: Coord,
    end: Coord,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "q" | "Q">(
    command: ToAbsoluteCommand<C>,
    controlPointX: number,
    controlPointY: number,
    endX: number,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "q" | "Q">(
    command: ToAbsoluteCommand<C>,
    controlPoint: Coord,
    end: Coord,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "t" | "T">(
    command: ToAbsoluteCommand<C>,
    endX: number,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "t" | "T">(
    command: ToAbsoluteCommand<C>,
    end: Coord,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "a" | "A">(
    command: ToAbsoluteCommand<C>,
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    endX: number,
    endY: number,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "a" | "A">(
    command: ToAbsoluteCommand<C>,
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    end: Coord,
  ) => PathDescription<ToAbsoluteCommand<C>>,
  <C extends "a" | "A">(
    command: ToAbsoluteCommand<C>,
    radius: number | [number, number],
    end: Coord,
    rotation?: number,
    largeArcFlag?: boolean | 0 | 1,
    sweepFlag?: boolean | 0 | 1,
  ) => PathDescription<ToAbsoluteCommand<C>>,
];

// 用于将 AddPathOverloadsTuple 转换为 CreatePathOverloadsTuple 的工厂类型，实质上是向 AddPathOverloadsTuple 中的每个函数签名的参数列表前添加一个 start: Coord 参数
type CreatePathOverloadsTupleFactory<T extends ((...args: any) => any)[]> =
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

// 用于 createPath 方法的重载签名
type CreatePathOverloads = TupleToIntersection<CreatePathOverloadsTuple>;
// 用于 addPath 方法的重载签名
type AddPathOverloads = TupleToIntersection<AddPathOverloadsTuple>;

// 根据 SVG 命令名称返回对应命令参数组成的元祖类型
type PathDescriptionArgs<C extends Command> = C extends "l" | "L"
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

// 路径描述对象，包含单个命令及对应的参数
interface PathDescriptionMember<C extends AbsoluteCommand> {
  start: Coord;
  end: Coord;
  command: C;
  args: PathDescriptionArgs<C>;
}

interface PathDescriptionBehavior {
  getSegment: () => string;
  toString: () => string;
}

class PathDescription<C extends Command>
  implements
    PathDescriptionMember<ToAbsoluteCommand<C>>,
    PathDescriptionBehavior
{
  constructor(
    public readonly start: Coord,
    public readonly command: ToAbsoluteCommand<C>,
    public readonly args: PathDescriptionArgs<ToAbsoluteCommand<C>>,
  ) {}

  public get end(): Coord {
    switch (this.command) {
      case "L":
      case "T":
        return [this.args[0], this.args[1]] as Coord;
      case "H":
        return [this.args[0], this.start[1]] as Coord;
      case "V":
        return [this.start[0], this.args[0]] as Coord;
      case "C":
        return [this.args[4], this.args[5]] as Coord;
      case "S":
      case "Q":
        return [this.args[2], this.args[3]] as Coord;
      case "A":
        return [this.args[5], this.args[6]] as Coord;
      default:
        throw new Error(`Invalid command: ${this.command}`);
    }
  }

  public getSegment() {
    return this.command + " " + this.args.join(" ");
  }

  public toString(): string {
    return `M ${this.start[0]} ${this.start[1]} ${this.getSegment()} Z`;
  }
}

export class DPath {
  constructor() {}

  createPath: CreatePathOverloads = (
    start: Coord,
    command: Command,
    ...args: any[]
  ): PathDescription<Command> => {
    let nativeDArgs: number[] = [];
    const isNativeArgs = args.every(
      (arg) => typeof arg === "number" || typeof arg === "boolean",
    );
    // 当传入的剩余参数完全对应 SVG 原生命令参数时，直接使用这些参数，否则进行转换
    if (isNativeArgs) {
      for (let i = 0; i < args.length; i++) {
        const nativeArg =
          typeof args[i] === "boolean"
            ? args[i]
              ? 1
              : 0
            : (args[i] as number);
        nativeDArgs[i] = nativeArg;
      }
    }
    switch (command) {
      case "l":
      case "L":
        if (!isNativeArgs) {
          nativeDArgs.push(...args[0]);
        }
        if (command.toUpperCase() !== command) {
          nativeDArgs[0] += start[0];
          nativeDArgs[1] += start[1];
        }
        break;
      case "h":
      case "H":
        if (command.toUpperCase() !== command) {
          nativeDArgs[0] += start[0];
        }
        break;
      case "v":
      case "V":
        if (command.toUpperCase() !== command) {
          nativeDArgs[0] += start[1];
        }
        break;
      case "c":
      case "C":
      case "s":
      case "S":
      case "q":
      case "Q":
      case "t":
      case "T":
        if (!isNativeArgs) {
          nativeDArgs = [].concat(...args);
        }
        if (command.toUpperCase() !== command) {
          for (let i = 0; i < nativeDArgs.length; i++) {
            nativeDArgs[i] = args[i % 2];
          }
        }
        break;
      case "a":
      case "A":
        if (!isNativeArgs) {
          if (Array.isArray(args[5])) {
            nativeDArgs = [].concat(...args);
          } else {
            const radius = args[0];
            const rx = Array.isArray(radius) ? radius[0] : radius;
            const ry = Array.isArray(radius) ? radius[1] : radius;
            const rotation = args[2] || 0;
            const largeArcFlag = !!(args[3] ?? true) ? 1 : 0;
            const sweepFlag = !!(args[4] ?? true) ? 1 : 0;
            const [endX, endY] = args[1];
            nativeDArgs = [
              rx,
              ry,
              rotation,
              largeArcFlag,
              sweepFlag,
              endX,
              endY,
            ];
          }
          if (command.toUpperCase() !== command) {
            nativeDArgs[5] += start[0];
            nativeDArgs[6] += start[1];
          }
        }
        break;
      default:
        throw new Error(`Invalid command: ${command}`);
    }
    return new PathDescription(
      start,
      command.toUpperCase() as AbsoluteCommand,
      nativeDArgs as any,
    );
  };
}
