import type { PathSegment } from ".";
import type {
  AbsoluteCommand,
  Command,
  Coord,
  CreatePathSegmentInfoOverloads,
  pathSegmentInfo,
  ToAbsoluteCommand,
  Vector,
} from "./types";

/**
 * 将一些创建路径的方法的传参输出为统一的格式，如果传入的是使用相对坐标的命令，则结果会被转换为绝对坐标的形式
 * @param start 起始点坐标
 * @param command 路径命令
 * @param args 其余的参数，支持多种传参格式，最终会被整理为与原生 SVG 路径命令参数相同的格式
 * @returns
 */
export const createPathSegmentInfo: CreatePathSegmentInfoOverloads = <
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
        typeof args[i] === "boolean" ? (args[i] ? 1 : 0) : (args[i] as number);
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
          nativeDArgs = [rx, ry, rotation, largeArcFlag, sweepFlag, endX, endY];
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

/**
 * 计算出一个坐标叠加一个向量后的坐标
 * @param coord
 * @param vector
 * @returns
 */
export function offsetCoord(coord: Coord, vector: Vector): Coord {
  return [coord[0] + vector[0], coord[1] + vector[1]];
}

/**
 * 计算出两个坐标之间的向量
 * @param startPoint
 * @param endPoint
 * @returns
 */
export function getOffsetVector(startPoint: Coord, endPoint: Coord): Vector {
  return [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1]];
}

/**
 * 判断一个 pathSegment 是对应某个指令，如果是则收缩具体的 pathSegment 类型
 * @param pathSegment
 * @param command
 * @returns
 */
export function checkPathSegmentType<C extends AbsoluteCommand>(
  pathSegment: PathSegment,
  command: C,
): pathSegment is PathSegment<C> {
  return pathSegment.command === command;
}

/**
 * 获取一个点相对于一个中心点的中心对称坐标
 * @param originPoint
 * @param centerPoint
 * @returns
 */
export function getPointReflection(originPoint: Coord, centerPoint: Coord) {
  const vector = getOffsetVector(originPoint, centerPoint);
  return offsetCoord(centerPoint, vector);
}
