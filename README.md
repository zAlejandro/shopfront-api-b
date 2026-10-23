# vitrina-api

Backend (Express) para la web vitrina y el panel. Supabase = base de datos + login. R2 = imágenes.

## Estructura
```
src/server.js          configuración de Express, rutas y arranque
src/http.js            utilidades HTTP y manejo de errores
src/config.js          variables de entorno
src/db.js              cliente de Supabase (service key)
src/auth.js            verifica el login y decide a qué negocio pertenece el usuario
src/storage.js         R2: URLs firmadas y borrado, separado por negocio
src/mappers.js         columnas de la base <-> formato del panel/web
src/routes/auth.js     login, refresh y logout (el panel no usa claves de Supabase)
src/routes/public.js   lo que lee la web vitrina
src/routes/owner.js    crear/listar negocios (solo tú)
src/routes/admin/      panel: index, site, categories, products, media
supabase/schema.sql    tablas + RLS
supabase/migrations/    cambios a la base ya creada (002: imagen de categoría)
supabase/seed-mrphone.sql datos de ejemplo de Mr. Phone (negocio, ajustes, categorías, productos)
```

## Puesta en marcha
1. Supabase: SQL Editor -> pega `supabase/schema.sql`. Crea tu usuario en Authentication > Users y corre el `update auth.users ...` del final del SQL para volverte `owner`. Opcional: corre `supabase/seed-mrphone.sql` para cargar los datos de Mr. Phone (es repetible y no pisa lo que edites).
2. R2: crea el bucket, activa acceso público (r2.dev o dominio propio) y un API Token con "Object Read & Write" limitado a ese bucket. En el bucket > Settings > CORS pon:
   `[{"AllowedOrigins":["http://localhost:5174","https://TU-PANEL"],"AllowedMethods":["PUT"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]`
3. `cp .env.example .env`, llena tus credenciales (la service key y las llaves de R2 NUNCA van al frontend), `npm install`, `npm run dev`.
4. Render: Web Service, Build `npm install`, Start `npm start`, y las mismas variables en Environment.

## Cómo se separan los negocios
- **Datos:** cada fila lleva `tenant_id`. El `tenant_id` del usuario sale de `app_metadata` en su token (solo el servidor puede escribirlo) y la API siempre filtra por él. RLS en la base es la segunda barrera.
- **Archivos:** un solo bucket, una carpeta por negocio: `<tenant_id>/<uuid>-<nombre>`. La API firma URLs de subida solo dentro de la carpeta del negocio y solo borra archivos de esa carpeta. En la base y en el frontend se guarda solo esa ruta relativa; la URL completa es `R2_PUBLIC_URL + "/" + ruta`. Si un cliente se va, copias su carpeta (`rclone copy r2:bucket/<tenant_id> destino`) y le cambias `VITE_ASSETS_URL`.

## Endpoints
Errores: `{ "error": "mensaje" }`. Panel y owner: `Authorization: Bearer <access_token de Supabase>`. El owner además manda `X-Tenant: <uuid>` para elegir negocio.

### Web vitrina (sin login) — `VITE_API_URL=https://TU-API/public`
| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/site?tenant=slug` | ajustes del sitio (objeto `site`, sin reseñas) |
| GET | `/categories?tenant=slug` | `[{slug,name,image}]` en orden |
| GET | `/products?tenant=slug` | solo `active`: `[{id,name,category,price,from,spec,description,image,featured,active,status,onSale,salePrice}]` |
| GET | `/reviews?tenant=slug` | `[{name,stars,text}]` (vacío hasta conectar Google) |

### Login (`/auth`) — sin token, solo desde los orígenes de `CORS_ORIGINS`
| Método | Ruta | Body -> Respuesta |
|---|---|---|
| POST | `/auth/login` | `{email,password}` -> `{access_token,refresh_token,expires_at,user:{email,role,tenant}}` (401 si falla; 429 tras 5 fallos en 15 min) |
| POST | `/auth/refresh` | `{refresh_token}` -> sesión nueva |
| POST | `/auth/logout` | Bearer token -> 204 |

### Panel (`/admin`)
| Método | Ruta | Body -> Respuesta |
|---|---|---|
| GET | `/me` | -> `{email,role,tenant}` |
| GET | `/tenant` | -> `{site,categories:[{id,name}],products,media:[{id,name,path}]}` (lo que carga el panel) |
| PUT | `/site` | objeto `site` completo |
| PUT | `/categories` | `[{id?,name}]` en orden; reemplaza la lista (409 si borras una con productos) |
| POST | `/products` | producto sin `id` -> 201 producto con `id` |
| PUT | `/products/:id` | producto -> producto |
| DELETE | `/products/:id` | -> 204 |
| POST | `/media/sign` | `{name,type,size}` -> `{key,uploadUrl,publicUrl}` |
| POST | `/media` | `{name,path:key}` -> 201 `{id,name,path}` |
| DELETE | `/media/:id` | borra de R2 y de la base -> 204 |

Subir una imagen: `POST /media/sign` -> `PUT uploadUrl` con el archivo (mismo `Content-Type` y tamaño) -> `POST /media` con la `key`. Guarda `key` como `image`/`logo`/`heroImage`.

### Owner (`/owner`)
| GET | `/tenants` | -> `[{id,slug,name,website_url}]` |
|---|---|---|
| POST | `/tenants` | `{slug?,name,email,password,website_url?}` crea negocio y usuario -> 201 `{id,slug,name,website_url}` |
| PATCH | `/tenants/:id` | `{website_url}` actualiza la URL -> `{id,slug,name,website_url}`; 404 si no existe |

`website_url` acepta URLs completas HTTP/HTTPS sin credenciales. Envía `null` o una cadena vacía para quitarla. Todas las rutas `/owner` requieren sesión con rol `owner`.

`GET /admin/tenant` incluye además `tenant: {id,slug,name,website_url}` del negocio autorizado para el usuario, conservando `site`, `categories`, `products` y `media`.

Requisito en la base de datos: columna nullable `tenants.website_url` de tipo `text`. Si aún no existe, ejecutar manualmente en Supabase: `alter table tenants add column if not exists website_url text;`.

## Conectar los frontends (ya vienen listos)
- **Panel (vitrina-admin):** `.env` con `VITE_DATA_SOURCE=api`, `VITE_API_URL=https://TU-API` (sin /admin) y `VITE_ASSETS_URL=<R2_PUBLIC_URL>`. No lleva claves de Supabase.
- **Web (mrphone-web):** `.env` con `VITE_DATA_SOURCE=api`, `VITE_API_URL=https://TU-API/public`, `VITE_TENANT_SLUG=<slug del negocio>`, `VITE_ASSETS_URL=<R2_PUBLIC_URL>`.
- En `CORS_ORIGINS` de la API pon la URL del panel.
