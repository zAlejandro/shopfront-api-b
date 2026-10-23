import { Router } from 'express'
import { db } from '../../db.js'
import { asyncHandler, must, fail } from '../../http.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json(
      must(
        await db
          .from('sites')
          .select('data')
          .eq('tenant_id', req.tenantId)
          .maybeSingle(),
      )?.data || {},
    ),
  ),
)

router.put(
  '/',
  asyncHandler(async (req, res) => {
    // body: el objeto "site" completo
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      throw fail(400, 'Formato inválido')
    if (Array.isArray(req.body.slides) && req.body.slides.length > 8)
      throw fail(400, 'Máximo 8 slides')
    must(
      await db.from('sites').upsert({
        tenant_id: req.tenantId,
        data: req.body,
        updated_at: new Date().toISOString(),
      }),
    )
    res.json(req.body)
  }),
)

export default router
