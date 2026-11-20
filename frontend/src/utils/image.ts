/**
 * Prepares a photo for upload entirely in the browser.
 *
 * Phone cameras produce 4-12MB files, which is both slow to upload on mobile
 * data and far more resolution than a feed card needs. Drawing through a canvas
 * also drops the EXIF block, so the GPS coordinates most phones embed in a photo
 * never leave the device.
 */

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export interface PreparedImage {
  /** JPEG data URL, ready to POST. */
  dataUrl: string;
  width: number;
  height: number;
  /** Approximate decoded size, for showing the user what will be uploaded. */
  bytes: number;
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  // 4 base64 chars encode 3 bytes; subtract the padding.
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.round((base64.length * 3) / 4) - padding;
}

export async function prepareImage(
  file: File,
  maxEdge = 1280,
  quality = 0.82,
): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  // `from-image` honours the orientation flag, so photos taken in portrait do
  // not come out sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process that image.');

    // JPEG has no alpha; without this, transparent PNGs turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const bytes = dataUrlBytes(dataUrl);

    if (bytes > MAX_UPLOAD_BYTES) {
      throw new Error('That image is too large even after resizing. Try a smaller one.');
    }

    return { dataUrl, width, height, bytes };
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
