import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import jwt from 'jsonwebtoken'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { realtimeService } from '../src/services/realtimeService.js'

describe('Scale-Ready Architecture & Observability Tests', () => {
  let server
  let baseUrl
  let validToken

  before(async () => {
    const app = createApp()
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://localhost:${server.address().port}`

    validToken = jwt.sign(
      { userId: 'test-user-scale-001', role: 'PENYEWA' },
      config.jwtSecret,
      { expiresIn: '1h' }
    )
  })

  after(async () => {
    realtimeService.stopHeartbeat()
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections()
    }
    await new Promise((resolve) => server.close(resolve))
  })

  describe('1. System Health & Observability Metrics', () => {
    it('GET /api/health mengembalikan struktur observabilitas lengkap (DB, RAM, Uptime)', async () => {
      const res = await fetch(`${baseUrl}/api/health`)
      assert.equal(res.status, 200)

      const body = await res.json()
      assert.equal(body.status, 'ok')
      assert.equal(body.service, 'myrent-api')
      assert.ok(typeof body.uptimeSeconds === 'number')
      assert.ok(body.timestamp)
      assert.ok(body.system?.memory?.heapUsed)
      assert.ok(body.database?.status === 'connected')
      assert.ok(typeof body.database?.latencyMs === 'number' || body.database?.latencyMs === null)
      assert.ok(typeof body.realtime?.activeUsersCount === 'number')
    })
  })

  describe('2. Real-time Event Stream (Server-Sent Events / SSE)', () => {
    it('GET /api/realtime/stream tanpa token mengembalikan HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/realtime/stream`)
      assert.equal(res.status, 401)
      const body = await res.json()
      assert.equal(body.error?.code, 'UNAUTHORIZED')
    })

    it('GET /api/realtime/status mengembalikan metrik klien aktif', async () => {
      const res = await fetch(`${baseUrl}/api/realtime/status`)
      assert.equal(res.status, 200)
      const body = await res.json()
      assert.equal(body.status, 'ok')
      assert.ok(typeof body.metrics?.activeUsersCount === 'number')
      assert.ok(typeof body.metrics?.totalConnectionsCount === 'number')
    })

    it('GET /api/realtime/stream dengan token valid mengembalikan headers SSE', async () => {
      const controller = new AbortController()
      try {
        const res = await fetch(`${baseUrl}/api/realtime/stream?token=${validToken}`, {
          signal: controller.signal
        })
        assert.equal(res.status, 200)
        assert.ok(res.headers.get('content-type')?.includes('text/event-stream'))
        assert.equal(res.headers.get('cache-control'), 'no-cache, no-transform')
        controller.abort()
      } catch (err) {
        if (err.name !== 'AbortError') throw err
      }
    })

    it('realtimeService mampu broadcast event tanpa melempar exception', () => {
      assert.doesNotThrow(() => {
        realtimeService.broadcast('test:event', { hello: 'world' })
        realtimeService.sendToUser('user-dummy', 'test:event', { val: 123 })
        realtimeService.sendToRole('ADMIN', 'test:event', { adminMsg: true })
      })
    })
  })

  describe('3. API Rate Limiter & Abuse Prevention', () => {
    it('Bypass aktif pada mode test standar sehingga tidak memblokir automated tests', async () => {
      // 5 request beruntun ke /api/auth/check-unique berjalan mulus
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${baseUrl}/api/auth/check-unique`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'email', value: `test${i}@example.com` })
        })
        assert.notEqual(res.status, 429)
      }
    })

    it('Rate limiter mencatat header rate limit standar (ratelimit-limit)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/check-unique`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-rate-limit': 'true'
        },
        body: JSON.stringify({ field: 'email', value: 'check@example.com' })
      })
      // Header standar IETF rate limit hadir
      assert.ok(res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit'))
    })
  })
})

