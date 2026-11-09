import { ApiError } from '../lib/errors.js'

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} tidak ditemukan`,
      details: [{ field: 'path', message: 'Lihat daftar endpoint pada GET /' }]
    }
  })
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    const body = { error: { code: err.code, message: err.message } }
    if (err.details) body.error.details = err.details
    return res.status(err.status).json(body)
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Body request bukan JSON yang valid' }
    })
  }

  console.error(`[ErrorTracker] 500 Internal Error req=${req.id || '-'}:`, err?.stack || err)
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan internal pada server',
      requestId: req.id || null
    }
  })
}
