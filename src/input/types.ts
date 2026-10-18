/** Device adapters emit local tool velocities, independent of rendering or game rules.
 * Future XR adapters can supply absolute target poses through a separate pose driver. */
export interface ToolCommand {
  translation: readonly [number, number, number];
  rotation: readonly [number, number, number];
  jaw: number;
}
export type ToolId = 'left' | 'right';
export interface InputDevice {
  sample(tool: ToolId): ToolCommand;
  dispose(): void;
}
