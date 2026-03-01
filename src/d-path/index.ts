type RelativeCommand = "l" | "h" | "v" | "c" | "s" | "q" | "t" | "a";
type AbsoluteCommand = "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A";
type Command = RelativeCommand | AbsoluteCommand;
type Coord = [number, number];

interface PathDescription {
  command: Command;
  args: number[];
};
interface PathDescriptionL extends PathDescription{
    command: "l" | "L";
    args: [number, number];
}
interface PathDescriptionH extends PathDescription{
    command: "h" | "H";
    args: [number];
}
interface PathDescriptionV extends PathDescription{
    command: "v" | "V";
    args: [number];
}
interface PathDescriptionC extends PathDescription{
    command: "c" | "C";
    args: [number, number, number, number, number, number];
}
interface PathDescriptionS extends PathDescription{
    command: "s" | "S";
    args: [number, number, number, number];
}
interface PathDescriptionQ extends PathDescription{
    command: "q" | "Q";
    args: [number, number, number, number];
}
interface PathDescriptionT extends PathDescription{
    command: "t" | "T";
    args: [number, number];
}
interface PathDescriptionA extends PathDescription{
    command: "a" | "A";
    args: [number, number, number, number, number, number, number] 
}   

class DPath {
  constructor() {}
  createPath(command: "l" | "L", x: number, y: number): PathDescriptionL;
  createPath(command: "h" | "H", x: number): PathDescriptionH;
  createPath(command: "v" | "V", y: number): PathDescriptionV;
  createPath(
    command: "c" | "C",
    controlPointX1: number,
    controlPointY1: number,
    controlPointX2: number,
    controlPointY2: number,
    endPointX: number,
    endPointY: number,
  ): PathDescriptionC;
  createPath(command: "c" | "C", controlPoint1: Coord, controlPoint2: Coord, endPoint: Coord): PathDescriptionC;
  createPath(
    command: "s" | "S",
    controlPointX: number,
    controlPointY: number,
    endPointX: number,
    endPointY: number,
  ): PathDescriptionS;
  createPath(command: "s" | "S", controlPoint: Coord, endPoint: Coord): PathDescriptionS;
  createPath(
    command: "q" | "Q",
    controlPointX: number,
    controlPointY: number,
    endPointX: number,
    endPointY: number,
  ): PathDescriptionQ;
  createPath(command: "q" | "Q", controlPoint: Coord, endPoint: Coord): PathDescriptionQ;
  createPath(command: "t" | "T", endPointX: number, endPointY: number): PathDescriptionT;
  createPath(command: "t" | "T", endPoint: Coord): PathDescriptionT;
  createPath(
    command: "a" | "A",
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    endPointX: number,
    endPointY: number,
  ): PathDescriptionA;
  createPath(
    command: "a" | "A",
    rx: number,
    ry: number,
    rotation: number,
    largeArcFlag: boolean | 0 | 1,
    sweepFlag: boolean | 0 | 1,
    endPoint: Coord,
  ): PathDescriptionA;
  createPath(
    command: "a" | "A",
    radius: number | [number, number],
    endPoint: Coord,
    rotation?: number,
    largeArcFlag?: boolean | 0 | 1,
    sweepFlag?: boolean | 0 | 1,
  ): PathDescriptionA;
  createPath(command: Command, ...args: any[]) {
    return {} as unknown as PathDescription;
  }
}
