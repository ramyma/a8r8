export type BrushStroke = {
  points: number[];
  brushColor: string;
  brushSize: number;
  tool: "brush" | "eraser";
};

export type BrushStrokePoint = {
  x: number;
  y: number;
  brushColor: string;
  brushSize: number;
  tool: "brush" | "eraser";
};
