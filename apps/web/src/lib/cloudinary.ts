import { env } from './env'

export type UploadFolder = 'avatars' | 'posts' | 'proofs' | 'covers'

/** Free-tier unsigned uploads cap at 10 MB; we downscale first anyway. */
const MAX_BYTES = 10 * 1024 * 1024

/**
 * Unsigned browser upload to Cloudinary. Only the cloud name and an unsigned
 * preset ship to the client; the API secret stays on the server (used there
 * only for deletes). The preset restricts folder/size/formats on Cloudinary's side.
 */
export async function uploadImage(file: File | Blob, folder: UploadFolder): Promise<string> {
  const { cloudName, uploadPreset } = env.cloudinary
  if (!cloudName) throw new Error('Image uploads are not configured yet')
  if (file.size > MAX_BYTES) throw new Error('Image is larger than 10 MB')

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', uploadPreset)
  body.append('folder', `frisbee/${folder}`)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body })
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(explain(res.status, detail?.error?.message ?? ''))
  }
  const json = (await res.json()) as { secure_url: string }
  return json.secure_url
}

// Cloudinary's messages are accurate but assume you know its vocabulary. Map the ones a
// misconfigured deployment actually hits to something the person can act on.
function explain(status: number, message: string): string {
  const m = message.toLowerCase()
  if (status === 401 || m.includes('unknown api key') || m.includes('cloud_name')) {
    return `Cloudinary cloud name "${env.cloudinary.cloudName}" is wrong. Check VITE_CLOUDINARY_CLOUD_NAME.`
  }
  if (m.includes('upload preset not found')) {
    return `Upload preset "${env.cloudinary.uploadPreset}" does not exist in this Cloudinary account.`
  }
  if (m.includes('whitelisted for unsigned') || m.includes('must be specified when using unsigned')) {
    return `Upload preset "${env.cloudinary.uploadPreset}" must have Signing mode set to Unsigned.`
  }
  if (m.includes('file size too large')) return 'Image is too large for the upload preset.'
  if (m.includes('invalid image file')) return 'That file is not a valid image.'
  return message || 'Upload failed'
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
