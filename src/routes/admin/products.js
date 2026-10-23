import { Router } from 'express'
import { db } from '../../db.js'
import { asyncHandler, must, fail, slug } from '../../http.js'
import { toProduct, fromProduct } from '../../mappers.js'

const router = Router()

const readProductBody = (req) => {
  const product = fromProduct(req.body || {})
  if (!product.name) throw fail(400, 'Falta el nombre del producto')
  return product
}

router.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json(
      must(
        await db
          .from('products')
          .select('*')
          .eq('tenant_id', req.tenantId)
          .order('created_at'),
      ).map(toProduct),
    ),
  ),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const product = readProductBody(req),
      id = `${slug(product.name)}-${Date.now().toString(36)}`
    res.status(201).json(
      toProduct(
        must(
          await db
            .from('products')
            .insert({ ...product, id, tenant_id: req.tenantId })
            .select()
            .single(),
        ),
      ),
    )
  }),
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = must(
      await db
        .from('products')
        .update(readProductBody(req))
        .eq('tenant_id', req.tenantId)
        .eq('id', req.params.id)
        .select()
        .maybeSingle(),
    )
    if (!row) throw fail(404, 'Producto no encontrado')
    res.json(toProduct(row))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    must(
      await db
        .from('products')
        .delete()
        .eq('tenant_id', req.tenantId)
        .eq('id', req.params.id),
    )
    res.status(204).end()
  }),
)

export default router
