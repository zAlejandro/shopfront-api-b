import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { cfg } from './config.js'
import { fail } from './http.js'
const { account, key, secret, bucket, publicUrl } = cfg.r2
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${account}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: key, secretAccessKey: secret },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
}) // necesario para que R2 acepte las URLs firmadas
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// Un solo bucket; cada negocio vive bajo su propio prefijo: <tenant_id>/<uuid>-<nombre>
export async function signUpload(tenantId, { name, type, size }) {
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(type || ''))
    throw fail(400, 'Solo imágenes jpg, png, webp, gif o avif')
  if (!(size > 0 && size <= MAX_IMAGE_BYTES))
    throw fail(400, 'La imagen debe pesar menos de 5 MB')
  const safeName = String(name || 'imagen')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .slice(-60)
  const key = `${tenantId}/${randomUUID()}-${safeName}`
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: type,
      ContentLength: size,
    }),
    { expiresIn: 300 },
  )
  return { key, uploadUrl, publicUrl: `${publicUrl}/${key}` }
}
export const ownsKey = (tenantId, key) =>
  typeof key === 'string' &&
  key.startsWith(tenantId + '/') &&
  !key.includes('..')
export async function removeObject(tenantId, key) {
  if (!ownsKey(tenantId, key))
    throw fail(403, 'Ese archivo no pertenece a tu negocio')
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
