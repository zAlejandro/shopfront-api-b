import { db } from './db.js'
import { asyncHandler, fail } from './http.js'
const UUID = /^[0-9a-f-]{36}$/i

export const requireUser = asyncHandler(async (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) throw fail(401, 'Falta iniciar sesión')
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) throw fail(401, 'Sesión inválida o vencida')
  const metadata = data.user.app_metadata || {},
    role = metadata.role || 'tenant'
  req.user = { id: data.user.id, email: data.user.email, role }
  const requestedTenant = req.headers['x-tenant']
  req.tenantId =
    role === 'owner'
      ? UUID.test(requestedTenant || '')
        ? requestedTenant
        : null
      : metadata.tenant_id || null
  next()
})
export const requireTenant = (req, res, next) =>
  req.tenantId ? next() : next(fail(400, 'No hay negocio seleccionado'))
export const requireOwner = (req, res, next) =>
  req.user.role === 'owner'
    ? next()
    : next(fail(403, 'Solo el dueño de la plataforma'))
