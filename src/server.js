import express from 'express'
import cors from 'cors'
import { cfg } from './config.js'
import { errorHandler } from './http.js'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin/index.js'
import ownerRoutes from './routes/owner.js'
import authRoutes from './routes/auth.js'

const app = express()
const privateCors = cors({ origin: cfg.origins })

app.set('trust proxy', 1)
app.use(express.json({ limit: '300kb' }))

app.get('/health', (_, res) => res.json({ ok: true }))
app.use('/public', cors(), publicRoutes) // web vitrina (abierto, solo lectura)
app.use('/auth', privateCors, authRoutes) // login del panel
app.use('/admin', privateCors, adminRoutes) // panel del cliente
app.use('/owner', privateCors, ownerRoutes)

app.use(errorHandler)

app.listen(cfg.port, () => console.log(`API lista en :${cfg.port}`))
