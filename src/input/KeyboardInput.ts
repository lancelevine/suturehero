import type { InputDevice, ToolCommand, ToolId } from './types';
export class KeyboardInput implements InputDevice {
  private keys = new Set<string>();
  private down = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
    this.keys.add(event.code);
  };
  private up = (event: KeyboardEvent) => { this.keys.delete(event.code); };
  private blur = () => { this.keys.clear(); };
  constructor() {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.blur);
  }
  sample(tool: ToolId): ToolCommand {
    const axis = (positive: string, negative: string) => Number(this.keys.has(positive)) - Number(this.keys.has(negative));
    return tool === 'left'
      ? { translation: [axis('KeyD','KeyA'),axis('KeyE','KeyQ'),axis('KeyS','KeyW')], rotation: [axis('KeyT','KeyG'),axis('KeyF','KeyH'),axis('KeyR','KeyY')], jaw: axis('KeyX','KeyZ') }
      : { translation: [axis('ArrowRight','ArrowLeft'),axis('PageUp','PageDown'),axis('ArrowDown','ArrowUp')], rotation: [axis('KeyI','KeyK'),axis('KeyJ','KeyL'),axis('KeyU','KeyO')], jaw: axis('Period','Comma') };
  }
  dispose() {
    window.removeEventListener('keydown',this.down); window.removeEventListener('keyup',this.up); window.removeEventListener('blur',this.blur);
  }
}
