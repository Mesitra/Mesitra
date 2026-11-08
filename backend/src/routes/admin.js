import { Router } from 'express'
import { requireAdmin } from '../middleware/adminAuth.js'
import { adminUsersRouter } from './admin/adminUsers.js'
import { adminFinanceRouter } from './admin/adminFinance.js'
import { adminDisputesRouter } from './admin/adminDisputes.js'
import { adminModerationRouter } from './admin/adminModeration.js'

export const adminRouter = Router()

// Seluruh endpoint admin dilindungi oleh middleware requireAdmin
adminRouter.use(requireAdmin)

// Pilar 1: KYC, Submissions & Manajemen User (Suspensi / Unsuspensi)
adminRouter.use(adminUsersRouter)

// Pilar 2: Finansial & Pencairan Dana (Withdrawals)
adminRouter.use(adminFinanceRouter)

// Pilar 3: Mediasi Sengketa (Disputes & Arbitrase Finansial)
adminRouter.use(adminDisputesRouter)

// Pilar 4: Moderasi Konten (Takedown/Restore Alat & Hapus Ulasan)
adminRouter.use(adminModerationRouter)
