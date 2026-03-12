import type {
  Coord,
  AbsoluteCommand,
  PathSegmentArgs,
  CreatePathSegmentInfoOverloads,
  CreatePathOverloads,
  AddCommandOverloads,
  Operations,
  Vector,
} from "./types";
import {
  checkPathSegmentType,
  createPathSegmentInfo,
  offsetCoord,
} from "./utils";

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

  public toString() {
    let result = "";
    this.pathSet.forEach((item) => {
      result += (result ? " " : "") + item.toString();
    });
    return result;
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
export class PathSegment<C extends AbsoluteCommand = AbsoluteCommand>
  extends PathDataCommon
  implements Operations<PathSegment<C>>
{
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
    switch (this._command) {
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
          const oldArgs = this._args as PathSegmentArgs<"C">;
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
          const oldArgs = this._args as PathSegmentArgs<"S" | "Q">;
          (this._args as PathSegmentArgs<"S" | "Q">) = [
            oldArgs[0],
            oldArgs[1],
            ...newEnd,
          ];
        }
        break;
      case "A":
        {
          const oldArgs = this._args as PathSegmentArgs<"A">;
          (this._args as PathSegmentArgs<"A">) = [
            oldArgs[0],
            oldArgs[1],
            oldArgs[2],
            oldArgs[3],
            oldArgs[4] === 1 ? 0 : 1,
            ...newEnd,
          ];
        }
        break;
      default:
        throw new Error(`Invalid command: ${this._command}`);
    }
    return this;
  }

  public getMiddleString() {
    return this.command + " " + this.args.join(" ");
  }

  public toString() {
    return this.getCompleteString();
  }

  public move: Operations<PathSegment<C>>["move"] = (...args: any[]) => {
    let vector: Vector;
    if (Array.isArray(args[0])) {
      vector = args[0] as Vector;
    } else {
      vector = [args[0], args[1]];
    }
    this._start = offsetCoord(this._start, vector);
    const newEnd = offsetCoord(this.end, vector);
    switch (this._command) {
      case "L":
      case "T":
        {
          (this._args as PathSegmentArgs<"L" | "T">) = newEnd;
        }
        break;
      case "H":
        (this._args as PathSegmentArgs<"H">) = [newEnd[0]];
        break;
      case "V":
        (this._args as PathSegmentArgs<"V">) = [newEnd[1]];
        break;
      case "C":
        {
          const oldArgs = this._args as PathSegmentArgs<"C">;
          (this._args as PathSegmentArgs<"C">) = [
            oldArgs[0] + vector[0],
            oldArgs[1] + vector[1],
            oldArgs[2] + vector[0],
            oldArgs[3] + vector[1],
            ...newEnd,
          ];
        }
        break;
      case "S":
      case "Q":
        {
          const oldArgs = this._args as PathSegmentArgs<"S" | "Q">;
          (this._args as PathSegmentArgs<"S" | "Q">) = [
            oldArgs[0] + vector[0],
            oldArgs[1] + vector[1],
            ...newEnd,
          ];
        }
        break;
      case "A":
        {
          const oldArgs = this._args as PathSegmentArgs<"A">;
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
        throw new Error(`Invalid command: ${this._command}`);
    }
    return this;
  };
}

// PathData 代表一条完整的连续路径
export class PathData extends PathDataCommon implements Operations<PathData> {
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
    // 反转路径方向时，S 命令和 T 命令，即平滑曲线命令需要特殊处理，在 pathSegmentList 中找出它们所在的序号
    const smoothCurveIndexList = this.pathSegmentList
      .filter(
        (pathSegment) =>
          pathSegment.command === "S" || pathSegment.command === "T",
      )
      .map((pathSegment) => this.pathSegmentList.indexOf(pathSegment));
    // 要特殊处理的 PathSegment 的序号和处理后的 PathSegment 的映射
    const pathSegmentMap = new Map<number, PathSegment>();
    // 对平滑曲线命令做特殊反转处理
    smoothCurveIndexList.forEach((smoothCurveIndex) => {
      const smoothCurveSegment = this.pathSegmentList[
        smoothCurveIndex
      ] as PathSegment<"S" | "T">;
      if (smoothCurveIndex > 0) {
        const relatedSegment = this.pathSegmentList[smoothCurveIndex - 1];
        if (checkPathSegmentType(smoothCurveSegment, "S")) {
        } else if (checkPathSegmentType(smoothCurveSegment, "T")) {
          if (checkPathSegmentType(relatedSegment, "Q")) {
            // 二次贝塞尔曲线后接平滑二次贝塞尔曲线的情况
            const start: Coord = relatedSegment.start;
            const controlPoint: Coord = [
              relatedSegment.args[0],
              relatedSegment.args[1],
            ];
            const joinPoint: Coord = [
              relatedSegment.args[2],
              relatedSegment.args[3],
            ];
            const autoControlPoint: Coord = [
              2 * joinPoint[0] - controlPoint[0],
              2 * joinPoint[1] - controlPoint[1],
            ];
            const end: Coord = [
              smoothCurveSegment.args[0],
              smoothCurveSegment.args[1],
            ];
            const newStart = end;
            const newControlPoint = autoControlPoint;
            const newEnd = start;
            const newQPathSegment = new PathSegment(newStart, "Q", [
              ...newControlPoint,
              ...joinPoint,
            ]);
            const newTPathSegment = new PathSegment(joinPoint, "T", newEnd);
            pathSegmentMap.set(smoothCurveIndex, newQPathSegment);
            pathSegmentMap.set(smoothCurveIndex - 1, newTPathSegment);
          }
        }
      }
    });
    // 替换 pathSegmentList 中特殊处理的 PathSegment 后进行反转
    this.pathSegmentList.forEach((pathSegment, index) => {
      if (pathSegmentMap.has(index)) {
        this.pathSegmentList[index] = pathSegmentMap.get(index)!;
      } else {
        pathSegment.reverse();
      }
    });
    this.pathSegmentList.reverse();
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

  public move: Operations<PathData>["move"] = (...args: any[]) => {
    this.pathSegmentList.forEach((pathSegment) => {
      (pathSegment.move as any)(...args);
    });
    return this;
  };
}

export class PathGroup
  extends PathGroupCommom
  implements Operations<PathGroup>
{
  protected pathSet: Set<PathData | PathGroup>;

  constructor(
    pathList: (PathData | PathGroup)[],
    topPathSet: Set<PathData | PathGroup>,
  ) {
    super();
    this.pathSet = new Set();
    pathList.forEach((item) => {
      if (topPathSet.has(item)) {
        this.pathSet.add(item);
        topPathSet.delete(item);
      }
    });
  }

  public move: Operations<PathGroup>["move"] = (...args: any[]) => {
    this.pathSet.forEach((item) => {
      (item.move as any)(...args);
    });
    return this;
  };
}

// 暴露的主体对象
export default class DPath extends PathGroupCommom {
  protected pathSet: Set<PathData | PathGroup>;
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
    const { start, command, nativeDArgs } = createPathSegmentInfo(
      ...(args as Parameters<CreatePathOverloads>),
    );
    const pathData = new PathData(start, command, nativeDArgs);
    this.pathSet.add(pathData);
    return pathData;
  };

  /**
   * 将已创建的路径并为一组
   */
  public group(...args: (PathData | PathGroup)[] | [(PathData | PathGroup)[]]) {
    let input: (PathData | PathGroup)[];
    if (args.length === 1 && Array.isArray(args[0])) {
      input = args[0];
    } else {
      input = args as (PathData | PathGroup)[];
    }
    const pathGroup = new PathGroup(input, this.pathSet);
    this.pathSet.add(pathGroup);
    return pathGroup;
  }
}
