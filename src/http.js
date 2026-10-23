// Envía los errores de las rutas asíncronas al middleware de errores.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)

export const fail = (status, message) =>
  Object.assign(new Error(message), { status })

// Desempaqueta las respuestas de Supabase y propaga sus errores.
export const must = ({ error, data }) => {
  if (error) throw error
  return data
}

export const slug = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const DATABASE_ERRORS = {
  23503: [409, 'No se puede eliminar: tiene productos asociados.'],
  23514: [400, 'Datos inválidos (revisa el precio de oferta).'],
  23505: [409, 'Ya existe.'],
}

// Express reconoce este middleware por sus cuatro parámetros.
export function errorHandler(error, req, res, next) {
  const [status, message] = error.status
    ? [error.status, error.message]
    : DATABASE_ERRORS[error.code] || [500, 'Error interno']

  if (status === 500) console.error(error)
  res.status(status).json({ error: message })
}
