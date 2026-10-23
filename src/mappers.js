export const toProduct = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category_id,
  price: row.price,
  from: row.price_from,
  spec: row.spec,
  description: row.description,
  image: row.image,
  featured: row.featured,
  active: row.active,
  status: row.status,
  onSale: row.on_sale,
  salePrice: row.sale_price,
})
const toNullableNumber = (value) =>
  value === '' || value == null ? null : Number(value)
export const fromProduct = (body) => ({
  name: String(body.name || '').trim(),
  category_id: body.category || null,
  price: toNullableNumber(body.price),
  price_from: !!body.from,
  spec: String(body.spec || ''),
  description: String(body.description || ''),
  image: String(body.image || ''),
  featured: !!body.featured,
  active: body.active !== false,
  status: ['available', 'soon', 'out'].includes(body.status)
    ? body.status
    : 'available',
  on_sale: !!body.onSale,
  sale_price: toNullableNumber(body.salePrice),
})
