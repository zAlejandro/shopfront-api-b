import { createClient } from '@supabase/supabase-js'
import { cfg } from './config.js'

export const db = createClient(cfg.supabaseUrl, cfg.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
