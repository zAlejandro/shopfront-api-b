// Subida en 3 pasos: 1) /sign  2) el navegador sube el archivo a R2 con uploadUrl  3) POST / registra la imagen.
import { Router } from 'express'
import { db } from '../../db.js'
import { asyncHandler, must, fail } from '../../http.js'
import { signUpload, ownsKey, removeObject } from '../../storage.js'

const router = Router()

router.post(
  '/sign',
  asyncHandler(async (req, res) =>
    res.json(await signUpload(req.tenantId, req.body || {})),
  ),
) // body {name,type,size} -> {key,uploadUrl,publicUrl}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    // body {name,path} donde path = key devuelta por /sign
    const { name, path } = req.body || {}
    if (!ownsKey(req.tenantId, path)) throw fail(400, 'Ruta inválida')
    res.status(201).json(
      must(
        await db
          .from('media')
          .insert({
            tenant_id: req.tenantId,
            name: String(name || 'imagen'),
            path,
          })
          .select('id,name,path')
          .single(),
      ),
    )
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const media = must(
      await db
        .from('media')
        .select('path')
        .eq('tenant_id', req.tenantId)
        .eq('id', req.params.id)
        .maybeSingle(),
    )
    if (!media) throw fail(404, 'Imagen no encontrada')
    await removeObject(req.tenantId, media.path)
    must(
      await db
        .from('media')
        .delete()
        .eq('tenant_id', req.tenantId)
        .eq('id', req.params.id),
    )
    res.status(204).end()
  }),
)

export default router
