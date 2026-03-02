import type { TupleToIntersection } from "./utility-types";

type RelativeCommand = "l" | "h" | "v" | "c" | "s" | "q" | "t" | "a";
type AbsoluteCommand = "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A";
type Command = RelativeCommand | AbsoluteCommand;
type Coord = [number, number];

// 路径描述对象，包含单个命令及对应的参数
interface PathDescription {
  command: Command;
  args: number[];
}
interface PathDescriptionL extends PathDescription {
  command: "l" | "L";
  args: [number, number];
}
interface PathDescriptionH extends PathDescription {
  command: "h" | "H";
  args: [number];
}
interface PathDescriptionV extends PathDescription {
  command: "v" | "V";
  args: [number];
}
interface PathDescriptionC extends PathDescription {
  command: "c" | "C";
  args: [number, number, number, number, number, number];
}
interface PathDescriptionS extends PathDescription {
  command: "s" | "S";
  args: [number, number, number, number];
}
interface PathDescriptionQ extends PathDescription {
  command: "q" | "Q";
  args: [number, number, number, number];
}
interface PathDescriptionT extends PathDescription {
  command: "t" | "T";
  args: [number, number];
}
interface PathDescriptionA extends PathDescription {
  command: "a" | "A";
  args: [number, number, number, number, number, number, number];
}

// 用于 createPath 方法的重载签名组成的元祖类型，后续可以转为交叉类型来实现重载；其它方法有类似的重载签名也可以以这个元祖为基础映射类型以进行拓展
type AddPathOverloadsTuple = [
  (
    command: "l" | "L",
    destinationX: number,
    destinationY: number,
  ) => PathDescriptionL,
  (command: "l" | "L", destination: Coord) => PathDescriptionL,
  (command: "h" | "H", destinationX: number) => PathDescriptionH,
  (command: "v" | "V", destinationY: number) => PathDescriptionV,
  (
    command: "c" | "C",
    controlPointX1: number,
    controlPointY1: number,
    controlPointX2: number,
    controlPointY2: number,
    destinationX: number,
    destinationY: number,
  ) => PathDescriptionC,
  (
    command: "c" | "C",
    controlPoint1: Coord,
    controlPoint2: Coord,
    destination: Coord,
  ) => PathDescriptionC,
  (
    command: "s" | "S",
    controlPointX: number,
    controlPointY: number,
    destinationX: number,
    destinationY: number,
  ) => PathDescriptionS,
  (
    command: "s" | "S",
    controlPoint: Coord,
    destination: Coord,
  ) => PathDescriptionS,
  (
    command: "q" | "Q",
    controlPointX: number,
    controlPointY: number,
    destinationX: number,
    destinationY: number,
  ) => PathDescriptionQ,
  (
    command: "q" | "Q",
    controlPoint: Coord,
    destination: Coord,
  ) => PathDescriptionQ,
  (
    command: "t" | "T",
    destinationX: number,
    destinationY: number,
  ) => PathDescriptionT,
  (command: "t" | "T", destination: Coord) => PathDescriptionT,
  (
    command: "a" | "A",
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    destinationX: number,
    destinationY: number,
  ) => PathDescriptionA,
  (
    command: "a" | "A",
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    destination: Coord,
  ) => PathDescriptionA,
  (
    command: "a" | "A",
    radius: number | [number, number],
    destination: Coord,
    rotation?: number,
    largeArcFlag?: boolean | 0 | 1,
    sweepFlag?: boolean | 0 | 1,
  ) => PathDescriptionA,
];

// 用于 createPath 方法的重载签名
type CreatePathOverloads = TupleToIntersection<AddPathOverloadsTuple>;

export class DPath {
  constructor() {}

  createPath: CreatePathOverloads = (command: any, ...args: any[]) => {
    return { command, args } as unknown as any;
  };
}