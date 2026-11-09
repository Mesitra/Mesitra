import { createApp } from './app.js'
import { config } from './config.js'
import { startBackgroundJobs } from './jobs/index.js'

const app = createApp()
const port = Number(process.env.PORT || config.port || 3000)
const host = '0.0.0.0'

app.listen(port, host, () => {
  console.log(`MyRent API berjalan di http://${host}:${port} (${config.nodeEnv})`)
  console.log(`Dokumentasi OpenAPI: http://${host}:${port}/openapi.yaml`)
  
  // Start background jobs (auto-expire unpaid orders, etc)
  try {
    startBackgroundJobs()
  } catch (err) {
    console.warn('[Jobs] Warning starting background jobs:', err?.message)
  }
})
