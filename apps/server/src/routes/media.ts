import { Router } from 'express'
import { v2 as cloudinary } from 'cloudinary'
import { requireUser } from '../auth-middleware'
import { env } from '../env'

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
})

export const mediaRouter = Router()

/** Public id from a delivery URL: .../upload/v123/frisbee/avatars/abc.jpg → frisbee/avatars/abc */
function publicIdFromUrl(url: string) {
  const m = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(frisbee\/[^.]+)\.[a-z0-9]+$/i)
  return m?.[1] ?? null
}

/**
 * Deletes an uploaded asset. Only the uploader's own avatar/post images are expected
 * here; the browser cannot delete on Cloudinary without the API secret.
 */
mediaRouter.post('/delete', requireUser, async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url : ''
  const publicId = publicIdFromUrl(url)
  if (!publicId) return res.status(400).json({ error: 'Not a frisbee asset URL' })
  if (!env.cloudinary.apiSecret) return res.status(503).json({ error: 'Cloudinary is not configured' })
  const result = await cloudinary.uploader.destroy(publicId, { invalidate: true })
  res.json({ result: result.result })
})
