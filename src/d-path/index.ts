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
  getPointReflection,
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
    // 命令 T 和 S 需做特殊处理所以不包含在内
    switch (this._command) {
      case "L":
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
    // 反转路径方向时，S 命令和 T 命令，即平滑曲线命令需要特殊处理，在 pathSegmentList 中找出它们所在的序号，存入 segmentSTail 和 segmentTTail 中
    const segmentSTail = new Set<number>();
    const segmentTTail = new Set<number>();
    this.pathSegmentList.forEach((pathSegment, index) => {
      /* 在 pathSegmentList 中找出 S 命令和 T 命令，存在以下情况时，将它们的序号和值设置为 segmentSMap 或 segmentTMap 的键值对：
       *  1. S 命令且以下一命令不为 S
       *  2. T 命令且以下一命令不为 T
       * 这是因为反转后，之前末尾的 S 或 T 命令会反过来影响前面的曲线命令，所以这里只需要先存储最末尾的来作为处理的发起点
       */
      checkPathSegmentType(pathSegment, "S") &&
        (!this.pathSegmentList[index + 1] ||
          !checkPathSegmentType(this.pathSegmentList[index + 1], "S")) &&
        segmentSTail.add(index);
      checkPathSegmentType(pathSegment, "T") &&
        (!this.pathSegmentList[index + 1] ||
          !checkPathSegmentType(this.pathSegmentList[index + 1], "T")) &&
        segmentTTail.add(index);
    });
    // pathSegmentMap 时要特殊处理的 PathSegment 的序号和处理后的 PathSegment 的映射
    const pathSegmentMap = new Map<number, PathSegment>();
    segmentTTail.forEach((segmentTIndex) => {
      // 先在 pathSegmentList 中从 segmentT 开始往前找，直到遇到 T、Q 以外的命令，把找到的 segment 加入到 seq 中
      const seq: (PathSegment<"T"> | PathSegment<"Q">)[] = [];
      for (let i = segmentTIndex; i >= 0; i--) {
        const curSegment = this.pathSegmentList[i];
        if (
          checkPathSegmentType(curSegment, "T") ||
          checkPathSegmentType(curSegment, "Q")
        ) {
          seq.push(curSegment);
        } else {
          break;
        }
      }
      // T 命令是单独存在的情况
      if (seq.length <= 1) {
        const singleTSegment = seq[0] as PathSegment<"T">;
        const newStart = singleTSegment.end;
        const newEnd = singleTSegment.start;
        const newControlPoint = singleTSegment.start;
        const newSegment = new PathSegment(newStart, "Q", [
          ...newControlPoint,
          ...newEnd,
        ]);
        pathSegmentMap.set(segmentTIndex, newSegment);
        // T 命令和其它二次贝塞尔曲线命令连续存在的情况
      } else {
        // startSegment 是这一系列平滑曲线的开头
        const startSegment = seq[seq.length - 1];
        // controlPointTmp 用来缓存每一段二次贝塞尔曲线的控制点，它将影响下一段平滑二次贝塞尔曲线的控制点的位置
        let controlPointTmp: Coord = checkPathSegmentType(startSegment, "Q")
          ? [startSegment.args[0], startSegment.args[1]]
          : startSegment.start;
        // 从 seq 的尾部（也是曲线的头部）开始处理
        for (let i = seq.length - 1; i >= 0; i--) {
          const curSegment = seq[i];
          // 计算出 curSegment 在 pathSegmentList 中的序号
          const indexInPathSegmentList = segmentTIndex - i;
          // 当前曲线不是第一段的情况，控制点根据上一个控制点推算出来
          if (i < seq.length - 1) {
            // 用中心对称推算
            controlPointTmp = getPointReflection(
              controlPointTmp,
              curSegment.start,
            );
          }
          const newStart = curSegment.end;
          const newEnd = curSegment.start;
          // 当前不是曲线的最后一段的情况，反转后的命令一定是 T
          if (i !== 0) {
            const newSegment = new PathSegment(newStart, "T", newEnd);
            pathSegmentMap.set(indexInPathSegmentList, newSegment);
            // 当前是曲线的最后一段的情况，反转后的的命令一定是 Q
          } else {
            const newSegment = new PathSegment(newStart, "Q", [
              ...controlPointTmp,
              ...newEnd,
            ]);
            pathSegmentMap.set(indexInPathSegmentList, newSegment);
            curSegment;
          }
        }
      }
    });
    segmentSTail.forEach((segmentTIndex) => {
      // 先在 pathSegmentList 中从 segmentT 开始往前找，直到遇到 T、Q 以外的命令，把找到的 segment 加入到 seq 中
      const seq: (PathSegment<"S"> | PathSegment<"C">)[] = [];
      for (let i = segmentTIndex; i >= 0; i--) {
        const curSegment = this.pathSegmentList[i];
        if (
          checkPathSegmentType(curSegment, "S") ||
          checkPathSegmentType(curSegment, "C")
        ) {
          seq.push(curSegment);
        } else {
          break;
        }
      }
      // S 命令是单独存在的情况
      if (seq.length <= 1) {
        const singleTSegment = seq[0] as PathSegment<"S">;
        const controlPoint1 = singleTSegment.start;
        const controlPoint2: Coord = [
          singleTSegment.args[0],
          singleTSegment.args[1],
        ];
        const newStart = singleTSegment.end;
        const newEnd = singleTSegment.start;
        const newContorlPoint1 = controlPoint2;
        const newContorlPoint2 = controlPoint1;
        const newSegment = new PathSegment(newStart, "C", [
          ...newContorlPoint1,
          ...newContorlPoint2,
          ...newEnd,
        ]);
        pathSegmentMap.set(segmentTIndex, newSegment);
        // S 命令和其它三次贝塞尔曲线命令连续存在的情况
      } else {
        // 从 seq 的尾部（也是曲线的头部）开始处理
        for (let i = seq.length - 1; i >= 0; i--) {
          const curSegment = seq[i];
          // 计算出 curSegment 在 pathSegmentList 中的序号
          const indexInPathSegmentList = segmentTIndex - i;
          const newStart = curSegment.end;
          const newEnd = curSegment.start;
          // 当前是曲线第一段的情况，反转后的命令一定是 S
          if (i === seq.length - 1) {
            let controlPoint1: Coord;
            let controlPoint2: Coord;
            if (checkPathSegmentType(curSegment, "C")) {
              controlPoint1 = [curSegment.args[0], curSegment.args[1]];
              controlPoint2 = [curSegment.args[2], curSegment.args[3]];
            } else {
              controlPoint1 = curSegment.start;
              controlPoint2 = [curSegment.args[0], curSegment.args[1]];
            }
            const newControlPoint2 = controlPoint1;
            const newSegment = new PathSegment(newStart, "S", [
              ...newControlPoint2,
              ...newEnd,
            ]);
            pathSegmentMap.set(indexInPathSegmentList, newSegment);
            // 当前不是曲线的第一段也不是最后一段的情况，反转前和反转后的命令一定都是 S
          } else if (i !== 0) {
            const prevSegment = seq[i + 1]; // 曲线中的前一段，即 seq 中的后一段
            let prevControlPoint2: Coord;
            if (checkPathSegmentType(prevSegment, "C")) {
              prevControlPoint2 = [prevSegment.args[2], prevSegment.args[3]];
            } else {
              prevControlPoint2 = [prevSegment.args[0], prevSegment.args[1]];
            }
            const controlPoint1 = getPointReflection(
              prevControlPoint2,
              curSegment.start,
            );
            const newControlPoint2 = controlPoint1;
            const newSegment = new PathSegment(newStart, "S", [
              ...newControlPoint2,
              ...newEnd,
            ]);
            pathSegmentMap.set(indexInPathSegmentList, newSegment);
            // 当前是曲线的最后一段的情况，反转前的命令一定是 S, 反转后的的命令一定是 C
          } else {
            const prevSegment = seq[i + 1]; // 曲线中的前一段，即 seq 中的后一段
            let prevControlPoint2: Coord;
            if (checkPathSegmentType(prevSegment, "C")) {
              prevControlPoint2 = [prevSegment.args[2], prevSegment.args[3]];
            } else {
              prevControlPoint2 = [prevSegment.args[0], prevSegment.args[1]];
            }
            const controlPoint1 = getPointReflection(
              prevControlPoint2,
              curSegment.start,
            );
            const controlPoint2: Coord = [
              curSegment.args[0],
              curSegment.args[1],
            ];
            const newControlPoint1 = controlPoint2;
            const newControlPoint2 = controlPoint1;
            const newSegment = new PathSegment(newStart, "C", [
              ...newControlPoint1,
              ...newControlPoint2,
              ...newEnd,
            ]);
            pathSegmentMap.set(indexInPathSegmentList, newSegment);
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
