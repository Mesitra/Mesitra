import { createApp } from './app.js'
import { config } from './config.js'
import { startBackgroundJobs } from './jobs/index.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`MyRent API berjalan di http://localhost:${config.port} (${config.nodeEnv})`)
  console.log(`Dokumentasi OpenAPI: http://localhost:${config.port}/openapi.yaml`)
  
  // Start background jobs (auto-expire unpaid orders, etc)
  startBackgroundJobs()
})
