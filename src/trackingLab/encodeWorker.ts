export {};
/// <reference lib="webworker" />
let canvas: OffscreenCanvas | undefined;
self.onmessage = async (event: MessageEvent<{
    id: number;
    bitmap: ImageBitmap;
}>) => { const { id, bitmap } = event.data; try {
    canvas ??= new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    const image = await canvas.convertToBlob({ type: 'image/jpeg', quality: .94 });
    self.postMessage({ id, image });
}
catch (error) {
    bitmap.close();
    self.postMessage({ id, error: String(error) });
} };
