// Para la web vitrina. Sin login. Siempre con ?tenant=<slug>. Solo devuelve lo publicable.
import { Router } from 'express'
import { db } from '../db.js'
import { asyncHandler, fail, must, slug } from '../http.js'
import { toProduct } from '../mappers.js'

const router = Router()

router.use(
  asyncHandler(async (req, res, next) => {
    const tenant = must(
      await db
        .from('tenants')
        .select('id')
        .eq('slug', slug(req.query.tenant))
        .maybeSingle(),
    )
    if (!tenant) throw fail(404, 'Negocio no encontrado')
    req.tenantId = tenant.id
    res.set('Cache-Control', 'public, max-age=30')
    next()
  }),
)
const getSite = async (id) =>
  must(await db.from('sites').select('data').eq('tenant_id', id).maybeSingle())
    ?.data || {}

router.get(
  '/site',
  asyncHandler(async (req, res) => {
    const { reviews, ...siteData } = await getSite(req.tenantId)
    res.json(siteData)
  }),
)

router.get(
  '/categories',
  asyncHandler(async (req, res) =>
    res.json(
      must(
        await db
          .from('categories')
          .select('id,name,image')
          .eq('tenant_id', req.tenantId)
          .order('position'),
      ).map((category) => ({
        slug: category.id,
        name: category.name,
        image: category.image,
      })),
    ),
  ),
)

router.get(
  '/products',
  asyncHandler(async (req, res) =>
    res.json(
      must(
        await db
          .from('products')
          .select('*')
          .eq('tenant_id', req.tenantId)
          .eq('active', true)
          .order('created_at'),
      ).map(toProduct),
    ),
  ),
)

router.get(
  '/reviews',
  asyncHandler(async (req, res) =>
    res.json((await getSite(req.tenantId)).reviews || []),
  ),
) // luego: Google Places con el place_id del negocio

export default router
