import type { OptimizedImage } from './mediaTypes'

export const SOURCE_IMAGE_MAX_DIMENSION = 2200
export const SOURCE_IMAGE_JPEG_QUALITY = 0.86

export type ImageDimensions = {
  width: number
  height: number
}

export function calculateOptimizedDimensions(
  width: number,
  height: number,
  maxDimension = SOURCE_IMAGE_MAX_DIMENSION,
): ImageDimensions {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    throw new Error('Image dimensions must be positive.')
  }

  const longestEdge = Math.max(width, height)
  if (longestEdge <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) }
  }

  const scale = maxDimension / longestEdge
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export async function optimizeSourceImage(file: File): Promise<OptimizedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }

  const image = await loadImage(file)
  const dimensions = calculateOptimizedDimensions(
    image.naturalWidth,
    image.naturalHeight,
  )
  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('This browser cannot optimize images.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, dimensions.width, dimensions.height)
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height)

  const blob = await canvasToBlob(canvas)

  return {
    fileName: createOptimizedFileName(file.name),
    mimeType: blob.type,
    sizeBytes: blob.size,
    blob,
    width: dimensions.width,
    height: dimensions.height,
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The selected image could not be decoded.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('The optimized image could not be created.'))
        }
      },
      'image/jpeg',
      SOURCE_IMAGE_JPEG_QUALITY,
    )
  })
}

function createOptimizedFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/u, '') || 'page'
  return `${withoutExtension}-optimized.jpg`
}
