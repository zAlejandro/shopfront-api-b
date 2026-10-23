// Panel de administración. Todo requiere Authorization: Bearer <token de Supabase>.
import { Router } from 'express'
import { requireUser, requireTenant } from '../../auth.js'
import { db } from '../../db.js'
import { asyncHandler, must } from '../../http.js'
import { toProduct } from '../../mappers.js'
import site from './site.js'
import categories from './categories.js'
import products from './products.js'
import media from './media.js'

const router = Router()

router.use(requireUser)

router.get('/me', (req, res) =>
  res.json({
    email: req.user.email,
    role: req.user.role,
    tenant: req.tenantId,
  }),
)

router.use(requireTenant)

router.get(
  '/tenant',
  asyncHandler(async (req, res) => {
    // todo el negocio de una vez: lo que carga el panel al abrir
    const tenantId = req.tenantId
    const [siteResult, categoriesResult, productsResult, mediaResult, tenantResult] =
      await Promise.all([
        db.from('sites').select('data').eq('tenant_id', tenantId).maybeSingle(),
        db
          .from('categories')
          .select('id,name,image')
          .eq('tenant_id', tenantId)
          .order('position'),
        db
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at'),
        db
          .from('media')
          .select('id,name,path')
          .eq('tenant_id', tenantId)
          .order('created_at'),
        db.from('tenants').select('id,slug,name,website_url').eq('id', tenantId).maybeSingle(),
      ])
    res.json({
      tenant: must(tenantResult),
      site: must(siteResult)?.data || {},
      categories: must(categoriesResult),
      products: must(productsResult).map(toProduct),
      media: must(mediaResult),
    })
  }),
)

router.use('/site', site)

router.use('/categories', categories)

router.use('/products', products)

router.use('/media', media)

export default router
