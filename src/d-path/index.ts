import type {
  Coord,
  AbsoluteCommand,
  Command,
  PathSegmentArgs,
  CreatePathSegmentInfoOverloads,
  CreatePathOverloads,
  pathSegmentInfo,
  ToAbsoluteCommand,
  AddCommandOverloads,
} from "./types";

// DPathCommon 中定义一些通用方法
abstract class DPathCommon {
  /**
   * 将一些创建路径的方法的传参输出为统一的格式，如果传入的是使用相对坐标的命令，则结果会被转换为绝对坐标的形式
   * @param start 起始点坐标
   * @param command 路径命令
   * @param args 其余的参数，支持多种传参格式，最终会被整理为与原生 SVG 路径命令参数相同的格式
   * @returns
   */
  protected createPathSegmentInfo: CreatePathSegmentInfoOverloads = <
    C extends Command,
  >(
    start: Coord,
    command: C,
    ...args: any[]
  ): pathSegmentInfo<ToAbsoluteCommand<C>> => {
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
    return {
      start,
      command: command.toUpperCase(),
      nativeDArgs,
    } as pathSegmentInfo<ToAbsoluteCommand<C>>;
  };
}

// PathDataCommon 中定义用于路径相关对象中的一些通用方法
abstract class PathDataCommon extends DPathCommon {
  constructor() {
    super();
  }
  abstract start: Coord;

  /**
   * 翻转当前路径方向
   */
  abstract reverse(): this;

  /**
   * 生成路径字符串中的核心命令字符串
   */
  abstract getMiddleString(): string;

  /**
   * 生成最终的路径字符串
   * @returns
   */
  protected getCompleteString() {
    return `M ${this.start[0]} ${this.start[1]} ${this.getMiddleString()}`;
  }
}

// PathSegment 对应组成路径的最小单位，除了 M 与 Z 之外只包含单个路径命令
export class PathSegment<
  C extends AbsoluteCommand = AbsoluteCommand,
> extends PathDataCommon {
  constructor(
    private _start: Coord,
    private _command: C,
    private _args: PathSegmentArgs<C>,
  ) {
    super();
  }

  public get command(): C {
    return this._command;
  }

  public get start(): Coord {
    return this._start;
  }

  public get end(): Coord {
    switch (this._command) {
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
        throw new Error(`Invalid command: ${this._command}`);
    }
  }

  public get args(): PathSegmentArgs<C> {
    return this._args;
  }

  public reverse() {
    const newEnd = this.start;
    this._start = this.end;
    switch (this.command) {
      case "L":
      case "T":
        (this._args as PathSegmentArgs<"L" | "T">) = newEnd;
        break;
      case "H":
        (this._args as PathSegmentArgs<"H">) = [newEnd[0]];
        break;
      case "V":
        (this._args as PathSegmentArgs<"V">) = [newEnd[1]];
        break;
      case "C":
        {
          const oldArgs = this.args as PathSegmentArgs<"C">;
          (this._args as PathSegmentArgs<"C">) = [
            oldArgs[2],
            oldArgs[3],
            oldArgs[0],
            oldArgs[1],
            ...newEnd,
          ];
        }
        break;
      case "S":
      case "Q":
        {
          const oldArgs = this.args as PathSegmentArgs<"S" | "Q">;
          (this._args as PathSegmentArgs<"S" | "Q">) = [
            oldArgs[0],
            oldArgs[1],
            ...newEnd,
          ];
        }
        break;
      case "A":
        {
          const oldArgs = this.args as PathSegmentArgs<"A">;
          (this._args as PathSegmentArgs<"A">) = [
            oldArgs[0],
            oldArgs[1],
            oldArgs[2],
            oldArgs[3],
            oldArgs[4],
            ...newEnd,
          ];
        }
        break;
      default:
        throw new Error(`Invalid command: ${this.command}`);
    }
    return this;
  }

  public getMiddleString() {
    return this.command + " " + this.args.join(" ");
  }

  public toString() {
    return this.getCompleteString();
  }
}

// PathData 代表一条完整的连续路径
export class PathData extends PathDataCommon {
  private _pathSegmentList: PathSegment[];

  constructor(start: Coord, command: AbsoluteCommand, args: any) {
    super();
    this._pathSegmentList = [new PathSegment(start, command, args)];
  }

  public get pathSegmentList() {
    return this._pathSegmentList;
  }

  public get start() {
    return this.pathSegmentList[0].start;
  }

  public get end() {
    return this.pathSegmentList[this.pathSegmentList.length - 1].end;
  }

  // 当前路径是否需要闭合（在末尾使用 Z 命令）
  public isClosed: boolean = false;

  /**
   * 闭合路径
   */
  public close() {
    this.isClosed = true;
    return this;
  }

  /**
   * 取消闭合路径
   */
  public open() {
    this.isClosed = false;
    return this;
  }

  /**
   * 在当前连续路径末尾追加新的命令
   */
  public add: AddCommandOverloads = function (this: PathData, ...args: any[]) {
    const createPathSegmentInfoArgs = [
      this.end,
      ...args,
    ] as unknown as Parameters<CreatePathSegmentInfoOverloads>;
    const { start, command, nativeDArgs } = this.createPathSegmentInfo(
      ...createPathSegmentInfoArgs,
    );
    this.pathSegmentList.push(new PathSegment(start, command, nativeDArgs));
    return this;
  };

  /**
   * 反转当前路径的方向
   */
  public reverse() {
    this.pathSegmentList
      .reverse()
      .forEach((pathSegment) => pathSegment.reverse());
    return this;
  }

  public concat(pathData: PathData) {
    if (this.end.toString() === pathData.start.toString()) {
      this._pathSegmentList = [
        ...this._pathSegmentList,
        ...pathData._pathSegmentList,
      ];
    }
    return this;
  }

  public getMiddleString() {
    return this.pathSegmentList.reduce(
      (accum, currPathSegment) =>
        accum + (accum && " ") + currPathSegment.getMiddleString(),
      "",
    );
  }

  public toString() {
    return this.getCompleteString() + (this.isClosed ? " Z" : "");
  }
}

// 暴露的主体对象
export default class DPath extends DPathCommon {
  private pathSet: Set<PathData>;
  constructor() {
    super();
    this.pathSet = new Set();
  }

  public get pathList() {
    return Array.from(this.pathSet);
  }

  /**
   * 创建一条路径
   */
  public create: CreatePathOverloads = (...args) => {
    const { start, command, nativeDArgs } = this.createPathSegmentInfo(
      ...(args as Parameters<CreatePathOverloads>),
    );
    const result = new PathData(start, command, nativeDArgs);
    this.pathSet.add(result);
    return result;
  };

  private mergePathData(d1: PathData, d2: PathData) {
    if (d1.end.toString() === d2.start.toString()) {
      d1.concat(d2);
      return true;
    } else if (d1.end.toString() === d2.end.toString()) {
      d1.concat(d2.reverse());
      return true;
    } else if (d1.start.toString() === d2.start.toString()) {
      d1.reverse().concat(d2);
      return true;
    } else if (d1.start.toString() === d2.end.toString()) {
      d1.reverse().concat(d2.reverse());
      return true;
    } else {
      return false;
    }
  }

  private recurMerge(d1: PathData) {
    let hasMerged = false;
    this.pathSet.forEach((d2) => {
      if (this.mergePathData(d1, d2)) {
        this.pathSet.delete(d2);
        hasMerged = true;
      }
    });
    if (hasMerged) {
      this.recurMerge(d1);
    }
  }

  /**
   * 将创建过的所有路径中，存在相连的路径进行合并
   */
  public connect() {
    const pathSetTmp = new Set<PathData>();
    this.pathSet.forEach((pathData) => {
      pathSetTmp.add(pathData);
      this.pathSet.delete(pathData);
      this.recurMerge(pathData);
    });
    this.pathSet = pathSetTmp;
  }

  public toString() {
    let result = ''
    this.pathSet.forEach(pathData=>{
      result += (result ? ' ' : '') + pathData.toString()
    })
    return result;
  }
}
