import type {
  Coord,
  AbsoluteCommand,
  PathSegmentArgs,
  CreatePathSegmentInfoOverloads,
  CreatePathOverloads,
  AddCommandOverloads,
} from "./types";
import { createPathSegmentInfo } from "./utils";

// PathGroupCommom 中定义一些 PathGroup 的成员和行为，且在 DPath 类中也能复用
abstract class PathGroupCommom {
  protected abstract pathSet: Set<PathData | PathGroup>;

  /**
   * 传入一个 PathSet，输出它的扁平化版本，即将其中的所有 PathGroup 拆成 PathData
   * @param pathSet
   */
  private flattenPathSet(pathSet: Set<PathData | PathGroup>): Set<PathData> {
    const result = new Set<PathData>();
    pathSet.forEach((item) => {
      if (item instanceof PathData) {
        result.add(item);
      } else if (item instanceof PathGroup) {
        this.flattenPathSet((item as any).pathSet).forEach((subItem) => {
          result.add(subItem);
        });
      }
    });
    return result;
  }

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

  private recurMerge(d1: PathData, pathSet: Set<PathData>) {
    let hasMerged = false;
    pathSet.forEach((d2) => {
      if (this.mergePathData(d1, d2)) {
        pathSet.delete(d2);
        hasMerged = true;
      }
    });
    if (hasMerged) {
      this.recurMerge(d1, pathSet);
    }
  }

  /**
   * 将创建过的所有路径中，存在相连的路径进行合并
   */
  public connect() {
    const pathSetTmp = new Set<PathData>();
    const flattenedPathSet = this.flattenPathSet(this.pathSet);
    flattenedPathSet.forEach((pathData) => {
      pathSetTmp.add(pathData);
      this.pathSet.delete(pathData);
      this.recurMerge(pathData, flattenedPathSet);
    });
    this.pathSet = pathSetTmp;
  }
}

// PathDataCommon 中定义用于路径相关对象中的一些通用方法
abstract class PathDataCommon {
  constructor() {}
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
    const { start, command, nativeDArgs } = createPathSegmentInfo(
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

export class PathGroup extends PathGroupCommom {
  protected pathSet: Set<PathData | PathGroup>;

  constructor(...args: (PathData | PathGroup)[] | [(PathData | PathGroup)[]]) {
    super();
    this.pathSet = new Set();
    const addToSet = (
      data: ((PathData | PathGroup)[] | (PathData | PathGroup))[],
    ) => {
      data.forEach((item) => {
        if (Array.isArray(item)) {
          addToSet(item);
        } else {
          this.pathSet.add(item);
        }
      });
    };
    addToSet(args);
  }
}

// 暴露的主体对象
export default class DPath extends PathGroupCommom {
  protected pathSet: Set<PathData>;
  constructor() {
    super()
    this.pathSet = new Set();
  }

  public get pathList() {
    return Array.from(this.pathSet);
  }

  /**
   * 创建一条路径
   */
  public create: CreatePathOverloads = (...args) => {
    const { start, command, nativeDArgs } = createPathSegmentInfo(
      ...(args as Parameters<CreatePathOverloads>),
    );
    const result = new PathData(start, command, nativeDArgs);
    this.pathSet.add(result);
    return result;
  };

  public toString() {
    let result = "";
    this.pathSet.forEach((pathData) => {
      result += (result ? " " : "") + pathData.toString();
    });
    return result;
  }
}
