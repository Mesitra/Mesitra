import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = createApp().listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

const api = (path, options) => fetch(`${baseUrl}${path}`, options)

const jsonRequest = (body, method = 'POST') => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
})

test('GET /api/health mengembalikan status ok', async () => {
  const res = await api('/api/health')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.status, 'ok')
  assert.equal(body.service, 'mesitra-api')
  assert.equal(typeof body.uptimeSeconds, 'number')
})

test('GET /api/rentals mengembalikan daftar lengkap dengan meta pagination', async () => {
  const res = await api('/api/rentals')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.length, 8)
  assert.deepEqual(body.meta, { total: 8, page: 1, limit: 20, totalPages: 1 })
})

test('GET /api/rentals memfilter berdasarkan category, status, dan search', async () => {
  const byCategory = await (await api('/api/rentals?category=Properti')).json()
  assert.equal(byCategory.data.length, 3)
  assert.ok(byCategory.data.every((rental) => rental.category === 'Properti'))

  const byStatus = await (await api('/api/rentals?status=Disewa')).json()
  assert.equal(byStatus.data.length, 3)

  const search = await (await api('/api/rentals?search=sudirman')).json()
  assert.equal(search.data.length, 1)
  assert.equal(search.data[0].title, 'Apartemen Sudirman Suites 2BR')
})

test('GET /api/rentals mendukung pagination dan sorting', async () => {
  const page = await (await api('/api/rentals?limit=3&page=2&sort=price&order=asc')).json()
  assert.equal(page.data.length, 3)
  assert.equal(page.meta.totalPages, 3)

  const sorted = await (await api('/api/rentals?sort=price&order=asc&limit=100')).json()
  const prices = sorted.data.map((rental) => rental.price)
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b))
})

test('GET /api/rentals menolak query tidak valid dengan 422', async () => {
  const res = await api('/api/rentals?limit=0')
  assert.equal(res.status, 422)
  const body = await res.json()
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.ok(body.error.details.some((detail) => detail.field === 'limit'))
})

test('GET /api/rentals/:id mengembalikan detail unit', async () => {
  const res = await api('/api/rentals/1')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.id, 1)
  assert.equal(body.data.title, 'Apartemen Sudirman Suites 2BR')
})

test('GET /api/rentals/:id mengembalikan 404 untuk id tidak dikenal', async () => {
  const res = await api('/api/rentals/999')
  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.error.code, 'RENTAL_NOT_FOUND')
})

test('GET /api/rentals/:id mengembalikan 400 untuk id bukan angka', async () => {
  const res = await api('/api/rentals/abc')
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error.code, 'INVALID_ID')
})

test('POST /api/rentals membuat unit baru dan menghapusnya kembali', async () => {
  const payload = { title: 'Tenda Camping 4P Waterproof', category: 'Peralatan', price: 150000, period: 'hari', tags: ['Waterproof'] }
  const res = await api('/api/rentals', jsonRequest(payload))
  assert.equal(res.status, 201)
  assert.match(res.headers.get('location'), /^\/api\/rentals\/\d+$/)

  const body = await res.json()
  assert.equal(body.data.title, payload.title)
  assert.equal(body.data.status, 'Tersedia')
  assert.equal(body.data.tenant, null)
  assert.equal(body.data.tags[0], 'Waterproof')

  const createdId = body.data.id
  const fetched = await (await api(`/api/rentals/${createdId}`)).json()
  assert.equal(fetched.data.id, createdId)

  const deleted = await api(`/api/rentals/${createdId}`, { method: 'DELETE' })
  assert.equal(deleted.status, 204)

  const gone = await api(`/api/rentals/${createdId}`)
  assert.equal(gone.status, 404)
})

test('POST /api/rentals menolak payload tidak valid dengan detail per-field', async () => {
  const res = await api('/api/rentals', jsonRequest({ title: 'x', category: 'Rumah', price: -1, period: 'tahun' }))
  assert.equal(res.status, 422)
  const body = await res.json()
  const fields = body.error.details.map((detail) => detail.field)
  for (const field of ['title', 'category', 'price', 'period']) {
    assert.ok(fields.includes(field), `detail untuk field '${field}' harus ada`)
  }
})

test("POST /api/rentals menolak status 'Disewa' tanpa tenant", async () => {
  const payload = { title: 'Unit Sewa Tanpa Tenant', category: 'Properti', price: 1000000, period: 'bulan', status: 'Disewa' }
  const res = await api('/api/rentals', jsonRequest(payload))
  assert.equal(res.status, 422)
  const body = await res.json()
  assert.ok(body.error.details.some((detail) => detail.field === 'tenant'))
})

test('POST /api/rentals menerima status Disewa lengkap dengan tenant', async () => {
  const payload = {
    title: 'Townhouse Bintaro 3KT',
    category: 'Properti',
    price: 12000000,
    period: 'bulan',
    status: 'Disewa',
    tenant: { name: 'Rina Marlina', until: '2026-12-31', verified: true }
  }
  const res = await api('/api/rentals', jsonRequest(payload))
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.equal(body.data.tenant.name, 'Rina Marlina')

  await api(`/api/rentals/${body.data.id}`, { method: 'DELETE' })
})

test('PATCH /api/rentals/:id memperbarui sebagian field', async () => {
  const res = await api(
    '/api/rentals/1',
    jsonRequest({ status: 'Disewa', tenant: { name: 'Andi Wijaya', until: '2026-11-01', verified: false } }, 'PATCH')
  )
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.status, 'Disewa')
  assert.equal(body.data.tenant.name, 'Andi Wijaya')

  const revert = await api('/api/rentals/1', jsonRequest({ status: 'Tersedia', tenant: null }, 'PATCH'))
  assert.equal(revert.status, 200)
  const reverted = await revert.json()
  assert.equal(reverted.data.tenant, null)
  assert.equal(reverted.data.status, 'Tersedia')
})

test('PATCH /api/rentals/:id menolak body kosong dengan 422', async () => {
  const res = await api('/api/rentals/1', jsonRequest({}, 'PATCH'))
  assert.equal(res.status, 422)
  const body = await res.json()
  assert.equal(body.error.code, 'VALIDATION_ERROR')
})

test('DELETE /api/rentals/:id mengembalikan 404 untuk id tidak ada', async () => {
  const res = await api('/api/rentals/999', { method: 'DELETE' })
  assert.equal(res.status, 404)
})

test('GET /api/categories mengembalikan kategori dengan jumlah unit', async () => {
  const res = await api('/api/categories')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.data.length, 3)
  const properti = body.data.find((category) => category.name === 'Properti')
  assert.equal(properti.count, 3)
})

test('GET /api/stats menghitung ringkasan dashboard dari data', async () => {
  const res = await api('/api/stats')
  assert.equal(res.status, 200)
  const { data } = await res.json()
  assert.equal(data.totalAssets, 8)
  assert.equal(data.activeRentals, 3)
  assert.equal(data.availableAssets, 4)
  assert.equal(data.occupancyRate, 37.5)
  assert.equal(data.monthlyRevenueEstimate, 61500000)
  assert.equal(data.activeTenants, 3)
  assert.equal(data.verifiedTenantsPct, 100)
  assert.equal(data.byStatus.Perawatan, 1)
  assert.equal(data.byCategory.Properti, 3)
  assert.equal(typeof data.newThisMonth, 'number')
})

test('endpoint tidak dikenal mengembalikan 404 dengan format error konsisten', async () => {
  const res = await api('/api/tidak-ada')
  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.error.code, 'NOT_FOUND')
})

test('body JSON tidak valid mengembalikan 400 INVALID_JSON', async () => {
  const res = await api('/api/rentals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{bukan json'
  })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error.code, 'INVALID_JSON')
})

test('CORS mengizinkan origin frontend', async () => {
  const res = await api('/api/health', { headers: { origin: 'http://localhost:5173' } })
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})

test('GET / mengembalikan info API dan daftar endpoint', async () => {
  const res = await api('/')
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.name, 'Mesitra API')
  assert.ok(body.endpoints.includes('GET /api/rentals'))
})
