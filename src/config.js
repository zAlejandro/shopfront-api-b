const requireEnv = (name) => {
  if (!process.env[name])
    throw new Error(`Falta la variable de entorno ${name}`)
  return process.env[name]
}
export const cfg = {
  port: process.env.PORT || 3000,
  supabaseUrl: requireEnv('SUPABASE_URL'),
  serviceKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  anonKey: requireEnv('SUPABASE_ANON_KEY'),
  origins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  r2: {
    account: requireEnv('R2_ACCOUNT_ID'),
    key: requireEnv('R2_ACCESS_KEY_ID'),
    secret: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_BUCKET'),
    publicUrl: requireEnv('R2_PUBLIC_URL').replace(/\/$/, ''),
  },
}
