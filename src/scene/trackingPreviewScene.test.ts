import { expect, it, vi } from 'vitest';

vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = vi.fn(); });

it('builds an embedded preview without a renderer and places the three instruments', async () => {
  const { createTrackingPreviewScene } = await import('./trackingPreviewScene');
  const mount = { style: { display: '' }, append: vi.fn() } as unknown as HTMLElement;
  const preview = createTrackingPreviewScene(mount, true);
  expect(preview.renderer).toBeNull();
  expect(mount.style.display).toBe('none');
  expect([preview.driver.position.z, preview.forceps.position.z, preview.scissors.position.z]).toEqual([-0.85, 0.15, 1.05]);
  expect([...preview.models.keys()].sort()).toEqual(['left', 'right']);
  expect(preview.render()).toBe(false);
});
