
export enum Tool {
  PENCIL = 'pencil',
  ERASER = 'eraser',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  LINE = 'line',
  TEXT = 'text',
  POLYLINE = 'polyline',
  POLYGON = 'polygon'
}

export enum FillType {
  SOLID = 'solid',
  LINEAR = 'linear',
  RADIAL = 'radial'
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawingAction {
  tool: Tool;
  color: string;
  fillColor?: string;
  fillColor2?: string;
  fillType?: FillType;
  isFilled?: boolean;
  lineWidth: number;
  path?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
}
