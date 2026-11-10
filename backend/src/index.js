import { createApp } from './app.js'
import { config } from './config.js'
import { startBackgroundJobs } from './jobs/index.js'

const app = createApp()
const port = Number(process.env.PORT || config.port || 3000)
const host = '0.0.0.0'

const mainServer = app.listen(port, host, () => {
  console.log(`Mesitra API berjalan di http://${host}:${port} (${config.nodeEnv})`)
  console.log(`Dokumentasi OpenAPI: http://${host}:${port}/openapi.yaml`)
  
  // Start background jobs (auto-expire unpaid orders, etc)
  try {
    startBackgroundJobs()
  } catch (err) {
    console.warn('[Jobs] Warning starting background jobs:', err?.message)
  }
})

mainServer.on('error', (err) => {
  console.error('[Server] Main server error:', err)
})

/* ==============================================================================
 * [KONFIGURASI PRODUCTION RAILWAY - DIKOMENTARI UNTUK LOCAL DEVELOPMENT]
 * Aktifkan kembali (uncomment) blok di bawah ini saat siap rilis ke Railway production:
 * Mencegah 502 Port Mismatch di Railway Cloud Proxy.
 * ==============================================================================
const fallbackPorts = [3000, 8080].filter(p => p !== port)
for (const p of fallbackPorts) {
  try {
    const fallbackServer = app.listen(p, host, () => {
      console.log(`Mesitra API juga mendengarkan di http://${host}:${p} (Railway Proxy Multi-Port)`)
    })
    fallbackServer.on('error', (err) => {
      console.warn(`[Server] Port ${p} note:`, err?.message)
    })
  } catch (err) {
    console.warn(`[Server] Could not bind fallback port ${p}:`, err?.message)
  }
}
============================================================================== */
