
export function directionToStickPosition(direction: string): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 128, y: 0 };
    case "down":
      return { x: 128, y: 255 };
    case "left":
      return { x: 0, y: 128 };
    case "right":
      return { x: 255, y: 128 };
    default:
      throw new Error("Invalid direction");
  }
}
