// Solo para ti (role=owner): ver y crear negocios.
import { Router } from 'express'
import { db } from '../db.js'
import { requireUser, requireOwner } from '../auth.js'
import { asyncHandler, must, fail, slug } from '../http.js'

const router = Router()

const tenantFields = 'id,slug,name,website_url'

export function websiteUrl(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw fail(400, 'URL del sitio inválida')
  if (!value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error()
    return url.href
  } catch {
    throw fail(400, 'La URL del sitio debe comenzar con http:// o https://')
  }
}

router.use(requireUser, requireOwner)

router.get(
  '/tenants',
  asyncHandler(async (req, res) =>
    res.json(
      must(await db.from('tenants').select(tenantFields).order('created_at')),
    ),
  ),
)

router.post(
  '/tenants',
  asyncHandler(async (req, res) => {
    // body {slug,name,email,password}: crea negocio + su usuario administrador
    const { name, email, password } = req.body || {},
      tenantSlug = slug(req.body?.slug || name)
    if (!name || !email || !password || password.length < 8 || !tenantSlug)
      throw fail(400, 'Faltan datos (la contraseña debe tener 8+ caracteres)')
    const website_url = websiteUrl(req.body?.website_url)
    const tenant = must(
      await db
        .from('tenants')
        .insert({ slug: tenantSlug, name, website_url })
        .select(tenantFields)
        .single(),
    )
    try {
      must(
        await db.from('sites').insert({ tenant_id: tenant.id, data: { name } }),
      )
      const { error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { tenant_id: tenant.id, role: 'tenant' },
      })
      if (error) throw error
    } catch (error) {
      await db.from('tenants').delete().eq('id', tenant.id)
      throw error
    } // si falla algo, no deja el negocio a medias
    res.status(201).json(tenant)
  }),
)

router.patch(
  '/tenants/:id',
  asyncHandler(async (req, res) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id))
      throw fail(400, 'Identificador de negocio inválido')
    if (!Object.hasOwn(req.body || {}, 'website_url'))
      throw fail(400, 'Falta website_url')
    const tenant = must(await db.from('tenants')
      .update({ website_url: websiteUrl(req.body.website_url) })
      .eq('id', req.params.id).select(tenantFields).maybeSingle())
    if (!tenant) throw fail(404, 'Negocio no encontrado')
    res.json(tenant)
  }),
)

export default router
