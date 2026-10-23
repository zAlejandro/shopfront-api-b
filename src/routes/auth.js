// Login a través de la API: el panel no necesita ninguna clave de Supabase. Lo secreto se queda en el servidor.
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { cfg } from '../config.js'
import { db } from '../db.js'
import { asyncHandler, fail } from '../http.js'

const router = Router()

const createAuthClient = () =>
  createClient(cfg.supabaseUrl, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) // cliente nuevo por petición: nunca comparte sesión
const toSessionResponse = ({ session, user }) => {
  const userData = user || session.user,
    metadata = userData.app_metadata || {}
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: {
      email: userData.email,
      role: metadata.role || 'tenant',
      tenant: metadata.tenant_id || null,
    },
  }
}
// Freno contra adivinar contraseñas: 5 fallos por IP+correo cada 15 min (en memoria: con varias instancias usa Redis o similar)
const loginAttempts = new Map(),
  LOGIN_WINDOW_MS = 15 * 60e3,
  MAX_LOGIN_ATTEMPTS = 5
setInterval(() => {
  for (const [attemptKey, attempt] of loginAttempts)
    if (attempt.until < Date.now()) loginAttempts.delete(attemptKey)
}, LOGIN_WINDOW_MS).unref()

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}
    if (!email || !password) throw fail(400, 'Escribe tu correo y contraseña.')
    const attemptKey = `${req.ip}|${String(email).toLowerCase()}`,
      attempt =
        loginAttempts.get(attemptKey) &&
        loginAttempts.get(attemptKey).until > Date.now()
          ? loginAttempts.get(attemptKey)
          : null
    if (attempt && attempt.n >= MAX_LOGIN_ATTEMPTS)
      throw fail(429, 'Demasiados intentos. Espera unos minutos.')
    const { data, error } = await createAuthClient().auth.signInWithPassword({
      email,
      password,
    })
    if (error || !data.session) {
      loginAttempts.set(attemptKey, {
        n: (attempt?.n || 0) + 1,
        until: attempt?.until || Date.now() + LOGIN_WINDOW_MS,
      })
      throw fail(401, 'Correo o contraseña incorrectos.')
    }
    loginAttempts.delete(attemptKey)
    res.json(toSessionResponse(data))
  }),
)

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // body {refresh_token} -> sesión nueva
    const refreshToken = req.body?.refresh_token
    if (!refreshToken) throw fail(400, 'Falta el refresh_token')
    const { data, error } = await createAuthClient().auth.refreshSession({
      refresh_token: refreshToken,
    })
    if (error || !data.session)
      throw fail(401, 'Sesión vencida. Inicia sesión de nuevo.')
    res.json(toSessionResponse(data))
  }),
)

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    // Bearer token -> invalida la sesión en Supabase
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (token) await db.auth.admin.signOut(token).catch(() => {})
    res.status(204).end()
  }),
)

export default router
