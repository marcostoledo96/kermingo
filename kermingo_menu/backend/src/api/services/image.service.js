import sharp from 'sharp';

/**
 * Procesa una imagen de producto usando sharp para redimensionarla, rotarla (según EXIF)
 * y convertirla a WebP.
 * 
 * @param {Buffer} inputBuffer Buffer de la imagen original
 * @returns {Promise<{buffer: Buffer, mimeType: string, extension: string, size: number}>}
 */
export async function processProductImage(inputBuffer) {
  const processedBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: 900,
      height: 900,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: 75 })
    .toBuffer();

  return {
    buffer: processedBuffer,
    mimeType: 'image/webp',
    extension: 'webp',
    size: processedBuffer.length
  };
}
