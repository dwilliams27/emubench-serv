interface Buttons {
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  z: boolean;
  start: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  l: boolean;
  r: boolean;
}

interface StickPosition {
  x: number; // 0-255, center at 128
  y: number; // 0-255, center at 128
}

interface TriggerValues {
  l: number; // 0-255
  r: number; // 0-255
}

export interface IPCControllerInputRequest {
  connected: boolean;
  buttons?: Partial<Buttons>;
  mainStick?: StickPosition;
  cStick?: StickPosition;
  triggers?: Partial<TriggerValues>;
  frames: number;
}
