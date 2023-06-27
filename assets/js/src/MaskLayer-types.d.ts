export type BrushStroke = {
  points: number[];
  brushColor: string;
  brushSize: number;
  tool: "brush" | "eraser";
};
