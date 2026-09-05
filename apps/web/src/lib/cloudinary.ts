import { env } from './env'

export type UploadFolder = 'avatars' | 'posts' | 'proofs' | 'covers'

/**
 * Unsigned browser upload to Cloudinary. Only the cloud name and an unsigned
 * preset ship to the client; the API secret stays on the server (used there
 * only for deletes). The preset restricts folder/size/formats on Cloudinary's side.
 */
export async function uploadImage(file: File | Blob, folder: UploadFolder): Promise<string> {
  if (!env.cloudinary.cloudName) throw new Error('Image uploads are not configured yet')
  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', env.cloudinary.uploadPreset)
  body.append('folder', `frisbee/${folder}`)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/auto/upload`, {
    method: 'POST',
    body,
  })
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(detail?.error?.message ?? 'Upload failed')
  }
  const json = (await res.json()) as { secure_url: string }
  return json.secure_url
}

/** Cloudinary URL transform: on-the-fly resize/crop/format for thumbnails. */
export function thumb(url: string | null | undefined, size: number): string | undefined {
  if (!url) return undefined
  if (!url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/c_fill,g_face,w_${size},h_${size},f_auto,q_auto/`)
}

/** Downscale on the client before upload — avatars never need more than 512px. */
export function resizeImage(file: File, max: number, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))), 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('Not a valid image'))
    img.src = url
  })
}
