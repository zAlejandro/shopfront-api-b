import { Router } from 'express'
import { db } from '../../db.js'
import { asyncHandler, must, fail, slug } from '../../http.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json(
      must(
        await db
          .from('categories')
          .select('id,name,image')
          .eq('tenant_id', req.tenantId)
          .order('position'),
      ),
    ),
  ),
)

router.put(
  '/',
  asyncHandler(async (req, res) => {
    // body: [{id,name}] en el orden del menú; reemplaza la lista
    if (!Array.isArray(req.body)) throw fail(400, 'Se esperaba una lista')
    const rows = req.body
      .map((category, position) => ({
        tenant_id: req.tenantId,
        id: slug(category.id || category.name),
        name: String(category.name || '').trim(),
        image: String(category.image || ''),
        position,
      }))
      .filter((category) => category.id && category.name)
    must(await db.from('categories').upsert(rows))
    const categoryIds = rows.map((category) => category.id),
      deleteQuery = db.from('categories').delete().eq('tenant_id', req.tenantId)
    must(
      await (categoryIds.length
        ? deleteQuery.not('id', 'in', `(${categoryIds.join(',')})`)
        : deleteQuery),
    ) // si una categoría tiene productos, falla (409)
    res.json(rows.map(({ id, name, image }) => ({ id, name, image })))
  }),
)

export default router
