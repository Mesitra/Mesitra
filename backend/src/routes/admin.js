import { Router } from 'express'
import { requireAdmin } from '../middleware/adminAuth.js'
import { adminUsersRouter } from './admin/adminUsers.js'
import { adminFinanceRouter } from './admin/adminFinance.js'

export const adminRouter = Router()

// Seluruh endpoint admin dilindungi oleh middleware requireAdmin
adminRouter.use(requireAdmin)

// Pilar 1: KYC, Submissions & Manajemen User (Suspensi / Unsuspensi)
adminRouter.use(adminUsersRouter)

// Pilar 2: Finansial & Pencairan Dana (Withdrawals)
adminRouter.use(adminFinanceRouter)
