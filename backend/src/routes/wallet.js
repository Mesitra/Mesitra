import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { config } from '../config.js'
import { requireAuth, requireKyc } from '../middleware/authMiddleware.js'
import { walletLimiter } from '../middleware/rateLimiter.js'

export const walletRouter = Router()

walletRouter.use(requireAuth)

/**
 * Helper: Kalkulasi finansial lengkap pemilik (Owner Wallet Engine)
 * Menghitung saldo tersedia (availableBalance), escrow (escrowBalance),
 * rincian item escrow dengan status H-x, pertumbuhan bulan ini,
 * mutasi komprehensif (Masuk, Keluar, Escrow), dan rekening penarikan.
 */
export async function calculateOwnerWallet(ownerId) {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      walletBalance: true,
      kycData: true,
      withdrawalAccounts: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
      }
    }
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  // Ambil seluruh peralatan milik pemilik
  const equipments = await prisma.equipment.findMany({
    where: { ownerId },
    select: { id: true, name: true, maintenanceBufferDays: true }
  })
  const equipmentIds = equipments.map((e) => e.id)

  // Ambil semua pesanan terkait peralatan pemilik
  const orders = await prisma.order.findMany({
    where: { equipmentId: { in: equipmentIds } },
    include: {
      equipment: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          kycData: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Ambil seluruh mutasi penarikan dana (WITHDRAW)
  const withdrawals = await prisma.walletTransaction.findMany({
    where: {
      userId: ownerId,
      type: 'WITHDRAW'
    },
    orderBy: { createdAt: 'desc' }
  })

  // Ambil penarikan yang masih pending
  const pendingWithdrawals = await prisma.withdrawalRequest.findMany({
    where: {
      userId: ownerId,
      status: { in: ['MENUNGGU', 'DIPROSES'] }
    }
  })

  const completedOrders = orders.filter((o) => o.status === 'SELESAI')
  const activeOrders = orders.filter((o) =>
    ['MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI', 'DISPUTE'].includes(o.status)
  )

  const now = new Date()

  // 1. Akumulasi Pendapatan Bersih Pesanan SELESAI (gunakan netOwnerPayout jika ada)
  let totalCompletedNet = 0
  completedOrders.forEach((order) => {
    if (order.netOwnerPayout > 0) {
      // Sudah ada netOwnerPayout dari settlement
      totalCompletedNet += order.netOwnerPayout
    } else {
      // Fallback: hitung manual (legacy orders)
      const rental = order.rentalCost || 0
      const shipping = order.shippingCost || 0
      const addons = order.addonsCost || 0
      const damage = order.damageFee || 0
      const platformFee = order.platformFee > 0 ? order.platformFee : Math.round(rental * 0.05)
      totalCompletedNet += rental + shipping + addons + damage - platformFee
    }
  })

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'BERHASIL')
    .reduce((sum, w) => sum + (w.amount || 0), 0)
  const totalPending = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0)
  const availableBalance = Math.max(0, totalCompletedNet - totalWithdrawn - totalPending)

  // 2. Pertumbuhan Bulan Berjalan (monthlyGrowth) - gunakan netOwnerPayout
  const currentMonthCompleted = completedOrders.filter((o) => {
    const d = new Date(o.updatedAt || o.endDate || o.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthlyGrowthAmount = currentMonthCompleted.reduce((sum, o) => {
    if (o.netOwnerPayout > 0) {
      return sum + o.netOwnerPayout
    }
    const rental = o.rentalCost || 0
    const shipping = o.shippingCost || 0
    const addons = o.addonsCost || 0
    const damage = o.damageFee || 0
    const platformFee = o.platformFee > 0 ? o.platformFee : Math.round(rental * 0.05)
    return sum + (rental + shipping + addons + damage - platformFee)
  }, 0)

  let monthlyGrowthText = '+ Rp 0 bulan ini'
  if (monthlyGrowthAmount >= 1000000) {
    const inJt = (monthlyGrowthAmount / 1000000).toLocaleString('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    })
    monthlyGrowthText = `+ Rp ${inJt} jt bulan ini`
  } else if (monthlyGrowthAmount > 0) {
    monthlyGrowthText = `+ Rp ${monthlyGrowthAmount.toLocaleString('id-ID')} bulan ini`
  }

  // 3. Dana di Escrow (escrowBalance & escrowItems)
  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  const escrowItems = activeOrders
    .map((order) => {
      const bufferDays = order.equipment?.maintenanceBufferDays ?? 1
      const endDate = new Date(order.endDate || order.startDate)
      const releaseDate = new Date(endDate.getTime() + bufferDays * 86400000)
      const diffTime = releaseDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / 86400000)
      const daysRemaining = diffDays <= 0 ? 'Hari ini' : `H-${diffDays}`
      const payoutAmount = (order.rentalCost || 0) + (order.shippingCost || 0) + (order.addonsCost || 0)

      const formattedDate = `${endDate.getDate()} ${monthShorts[endDate.getMonth()]}`

      return {
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        equipmentName: order.equipment?.name || 'Alat Sewa',
        endDate: order.endDate,
        formattedDate,
        amount: payoutAmount,
        payoutAmount,
        totalAmount: order.totalPaid,
        daysRemaining,
        diffDays,
        status: order.status
      }
    })
    .sort((a, b) => a.diffDays - b.diffDays)

  // Pastikan variabel escrowBalance dihitung mutlak dengan melakukan .reduce() dari array escrowItems yang HANYA berisi pesanan aktif
  const escrowBalance = escrowItems.reduce((sum, item) => sum + (item.amount || 0), 0)

  let nextPayout = {
    date: '-',
    amount: 0,
    label: 'Belum ada jadwal'
  }

  if (escrowItems.length > 0) {
    const nearest = escrowItems[0]
    const amountStr =
      nearest.payoutAmount >= 1000000
        ? `${(nearest.payoutAmount / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} jt`
        : nearest.payoutAmount.toLocaleString('id-ID')
    nextPayout = {
      date: nearest.formattedDate,
      amount: nearest.payoutAmount,
      label: `${nearest.formattedDate} · Rp ${amountStr}`
    }
  }

  // 4. Generator Riwayat Mutasi (mutations: MASUK, KELUAR, ESCROW)
  const mutations = []

  completedOrders.forEach((order) => {
    const platformFee = order.platformFee > 0 ? order.platformFee : Math.round((order.rentalCost || 0) * 0.05)
    const netAmount = order.netOwnerPayout > 0
      ? order.netOwnerPayout
      : (order.rentalCost || 0) + (order.shippingCost || 0) + (order.addonsCost || 0) + (order.damageFee || 0) - platformFee

    const orderDate = new Date(order.updatedAt || order.endDate)
    const day = orderDate.getDate().toString().padStart(2, '0')
    const formattedDate = `${day} ${monthShorts[orderDate.getMonth()]}`
    const tenantName = order.user?.fullName || order.user?.kycData?.businessName || 'Penyewa'

    // MASUK: Sewa Selesai
    mutations.push({
      id: `MUT-IN-${order.id}`,
      date: formattedDate,
      rawDate: orderDate.toISOString(),
      description: `Sewa ${order.equipment?.name || 'Alat'} · ${tenantName}`,
      category: 'MASUK',
      badgeStatus: 'Selesai',
      subStatus: 'Cair',
      amount: netAmount
    })

    // KELUAR: Potongan biaya layanan platform (jangan tampilkan dua kali)
    if (platformFee > 0 && !order.netOwnerPayout) {
      mutations.push({
        id: `MUT-FEE-${order.id}`,
        date: formattedDate,
        rawDate: orderDate.toISOString(),
        description: 'Biaya layanan platform',
        category: 'KELUAR',
        badgeStatus: 'Selesai',
        subStatus: 'Sukses',
        amount: -platformFee
      })
    }
  })

  // KELUAR: Penarikan Dana (Withdrawals - hanya yang BERHASIL)
  withdrawals
    .filter((w) => w.status === 'BERHASIL')
    .forEach((tx) => {
      const txDate = new Date(tx.createdAt)
      const day = txDate.getDate().toString().padStart(2, '0')
      const formattedDate = `${day} ${monthShorts[txDate.getMonth()]}`

      mutations.push({
        id: `MUT-WD-${tx.id}`,
        date: formattedDate,
        rawDate: txDate.toISOString(),
        description: tx.description,
        category: 'KELUAR',
        badgeStatus: 'Selesai',
        subStatus: 'Sukses',
        amount: -tx.amount
      })
    })

  // ESCROW: Dana Sewa + Deposit yang Sedang Ditahan pada Pesanan Aktif
  activeOrders.forEach((order) => {
    const activeDate = new Date(order.createdAt || order.startDate)
    const day = activeDate.getDate().toString().padStart(2, '0')
    const formattedDate = `${day} ${monthShorts[activeDate.getMonth()]}`
    const tenantName = order.user?.fullName || order.user?.kycData?.businessName || 'Penyewa'
    const totalEscrowHold =
      order.totalPaid || (order.rentalCost || 0) + (order.depositAmount || 0) + (order.shippingCost || 0)

    mutations.push({
      id: `MUT-ESC-${order.id}`,
      date: formattedDate,
      rawDate: activeDate.toISOString(),
      description: `Sewa ${order.equipment?.name || 'Alat'} · ${tenantName}`,
      category: 'ESCROW',
      badgeStatus: 'Escrow',
      subStatus: 'Ditahan',
      amount: totalEscrowHold
    })
  })

  mutations.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))

  // 5. Rekening Pencairan Pemilik
  const primaryAccount = user.withdrawalAccounts?.find((a) => a.isPrimary) || user.withdrawalAccounts?.[0]
  const kycBank = (user.kycData && typeof user.kycData === 'object' && user.kycData.bankAccount) || {}
  const bankName = primaryAccount?.bankName || kycBank.bankName || 'BCA'
  const accountNumber = primaryAccount?.accountNumber || kycBank.accountNumber || '4471 8820 04'
  const accountHolder = primaryAccount?.accountHolder || kycBank.accountHolder || user.fullName || 'Budi Santoso'
  const businessName = user.kycData?.businessName || user.fullName || 'Kopi Senja'

  const bankAccount = {
    id: primaryAccount?.id || null,
    bankName,
    accountNumber,
    accountHolder,
    title: `${businessName} · ${accountNumber}`
  }

  return {
    availableBalance,
    monthlyGrowth: monthlyGrowthAmount,
    monthlyGrowthAmount,
    monthlyGrowthText,
    nextPayout,
    escrowBalance,
    escrowItems,
    mutations,
    bankAccount,
    payoutInfo: {
      minimumWithdrawal: 100000,
      transferFeeText: 'Gratis · 3× / minggu',
      heldBalance: 0
    }
  }
}

/**
 * GET /api/wallet/owner/me
 * Endpoint khusus pemilik alat untuk mengambil saldo tersedia real-time,
 * dana escrow, item rincian pencairan H-x, riwayat mutasi komprehensif, dan rekening bank.
 */
walletRouter.get('/owner/me', async (req, res, next) => {
  try {
    const walletData = await calculateOwnerWallet(req.userId)
    return res.json(walletData)
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }
    next(error)
  }
})

/**
 * GET /api/wallet/owner/bank-account
 * Mengambil informasi rekening pencairan aktif pemilik alat.
 */
walletRouter.get('/owner/bank-account', async (req, res, next) => {
  try {
    const walletData = await calculateOwnerWallet(req.userId)
    return res.json({ bankAccount: walletData.bankAccount })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/wallet/owner/withdraw
 * Melakukan penarikan saldo pemilik ke rekening pencairan utama.
 * Minimal Rp 100.000 dan tidak boleh melebihi availableBalance.
 */
walletRouter.post('/owner/withdraw', walletLimiter, requireKyc, async (req, res, next) => {
  try {
    const { amount } = req.body
    const numericAmount = Number(amount)

    if (!numericAmount || isNaN(numericAmount) || numericAmount < 100000) {
      return res.status(400).json({
        error: { code: 'INVALID_AMOUNT', message: 'Nominal penarikan minimal Rp 100.000' }
      })
    }

    const currentWallet = await calculateOwnerWallet(req.userId)

    if (numericAmount > currentWallet.availableBalance) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Saldo tidak mencukupi. Saldo tersedia saat ini: Rp ${Number(currentWallet.availableBalance).toLocaleString('id-ID')}`
        }
      })
    }

    const bankName = currentWallet.bankAccount?.bankName || 'BCA'
    const cleanNumber = currentWallet.bankAccount?.accountNumber || '4471'
    const last4 = cleanNumber.replace(/\s+/g, '').slice(-4) || '4471'
    const reference = `WD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
    const description = `Pencairan ke ${bankName} · ${last4}`

    const [updatedUser, transaction, withdrawalRequest] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: {
          walletBalance: {
            decrement: Math.min(currentWallet.availableBalance, numericAmount)
          }
        },
        select: { walletBalance: true }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: req.userId,
          type: 'WITHDRAW',
          amount: numericAmount,
          description,
          status: 'MENUNGGU',
          reference,
          paymentMethod: bankName
        }
      }),
      prisma.withdrawalRequest.create({
        data: {
          withdrawalCode: reference,
          userId: req.userId,
          amount: numericAmount,
          transferFee: 0,
          netAmount: numericAmount,
          bankName,
          accountNumber: cleanNumber,
          accountHolder: currentWallet.bankAccount?.accountHolder || 'Pemilik Alat',
          status: 'MENUNGGU'
        }
      })
    ])

    const updatedWallet = await calculateOwnerWallet(req.userId)

    return res.json({
      message: 'Penarikan saldo berhasil diproses',
      newBalance: updatedWallet.availableBalance,
      transaction,
      withdrawalRequest,
      destinationAccount: currentWallet.bankAccount
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PUT /api/wallet/owner/bank-account
 * Mengubah atau mendaftarkan rekening pencairan utama pemilik alat.
 */
walletRouter.put('/owner/bank-account', async (req, res, next) => {
  try {
    const { bankName, accountNumber, accountHolder } = req.body

    const cleanBank = bankName ? String(bankName).trim() : ''
    const cleanNumber = accountNumber ? String(accountNumber).trim() : ''
    const cleanHolder = accountHolder ? String(accountHolder).trim() : ''

    if (!cleanBank) {
      return res.status(400).json({
        error: { code: 'BANK_NAME_REQUIRED', message: 'Nama bank atau e-wallet wajib diisi' }
      })
    }

    if (!cleanNumber || cleanNumber.length < 5) {
      return res.status(400).json({
        error: { code: 'ACCOUNT_NUMBER_INVALID', message: 'Nomor rekening minimal 5 digit' }
      })
    }

    if (!cleanHolder) {
      return res.status(400).json({
        error: { code: 'ACCOUNT_HOLDER_REQUIRED', message: 'Nama pemilik rekening wajib diisi' }
      })
    }

    // Upsert primary withdrawal account
    let account = await prisma.withdrawalAccount.findFirst({
      where: { userId: req.userId, isPrimary: true }
    })
    if (!account) {
      account = await prisma.withdrawalAccount.findFirst({
        where: { userId: req.userId }
      })
    }

    if (account) {
      account = await prisma.withdrawalAccount.update({
        where: { id: account.id },
        data: {
          bankName: cleanBank,
          accountNumber: cleanNumber,
          accountHolder: cleanHolder,
          isPrimary: true
        }
      })
    } else {
      account = await prisma.withdrawalAccount.create({
        data: {
          userId: req.userId,
          bankName: cleanBank,
          accountNumber: cleanNumber,
          accountHolder: cleanHolder,
          isPrimary: true
        }
      })
    }

    // Perbarui kycData untuk menjaga redundansi profil toko
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { kycData: true, fullName: true }
    })
    const kyc = user?.kycData && typeof user.kycData === 'object' ? user.kycData : {}
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        kycData: {
          ...kyc,
          bankAccount: {
            bankName: cleanBank,
            accountNumber: cleanNumber,
            accountHolder: cleanHolder
          }
        }
      }
    })

    const businessName = kyc.businessName || user?.fullName || 'Kopi Senja'

    return res.json({
      message: 'Rekening pencairan berhasil diperbarui',
      bankAccount: {
        id: account.id,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolder: account.accountHolder,
        title: `${businessName} · ${account.accountNumber}`
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/wallet
 * Mengambil ringkasan saldo, dana ditahan escrow, daftar rekening penarikan,
 * dan riwayat transaksi terkini user yang sedang login.
 */
walletRouter.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        walletBalance: true,
        kycData: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan' }
      })
    }

    // Hitung dana deposit yang sedang ditahan di escrow dari pesanan aktif
    const activeOrders = await prisma.order.findMany({
      where: {
        userId: req.userId,
        status: {
          in: ['MENUNGGU_KONFIRMASI', 'DIKIRIM', 'SEWA_AKTIF', 'INSPEKSI']
        }
      },
      select: { depositAmount: true }
    })

    const escrowHold = activeOrders.reduce((sum, o) => sum + (o.depositAmount || 0), 0)

    // Ambil daftar rekening penarikan terdaftar
    const accounts = await prisma.withdrawalAccount.findMany({
      where: { userId: req.userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
    })

    // Ambil riwayat mutasi / transaksi dompet
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return res.json({
      walletBalance: user.walletBalance ?? 0,
      escrowHold,
      accounts,
      transactions,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/wallet/topup
 * Menambahkan saldo dompet digital user.
 */
walletRouter.post('/topup', async (req, res, next) => {
  try {
    const { amount, paymentMethod = 'QRIS' } = req.body
    const numericAmount = Number(amount)

    if (!numericAmount || isNaN(numericAmount) || numericAmount < 10000) {
      return res.status(400).json({
        error: { code: 'INVALID_AMOUNT', message: 'Nominal top up minimal Rp 10.000' }
      })
    }

    if (numericAmount > 50000000) {
      return res.status(400).json({
        error: { code: 'AMOUNT_EXCEEDED', message: 'Nominal top up maksimal Rp 50.000.000 per transaksi' }
      })
    }

    const reference = `TOPUP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`

    // Eksekusi transaksi penambahan saldo dan pencatatan mutasi
    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: {
          walletBalance: {
            increment: numericAmount
          }
        },
        select: { walletBalance: true }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: req.userId,
          type: 'TOPUP',
          amount: numericAmount,
          description: `Top Up Saldo via ${paymentMethod}`,
          status: 'BERHASIL',
          reference,
          paymentMethod
        }
      })
    ])

    return res.status(201).json({
      message: 'Top up saldo berhasil',
      newBalance: updatedUser.walletBalance,
      transaction
    })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/wallet/withdraw
 * Melakukan penarikan saldo ke rekening pencairan yang sudah didaftarkan.
 */
walletRouter.post('/withdraw', async (req, res, next) => {
  try {
    const { amount, accountId, notes } = req.body
    const numericAmount = Number(amount)

    if (!numericAmount || isNaN(numericAmount) || numericAmount < 10000) {
      return res.status(400).json({
        error: { code: 'INVALID_AMOUNT', message: 'Nominal penarikan minimal Rp 10.000' }
      })
    }

    // Ambil data user terkini untuk validasi saldo
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { walletBalance: true }
    })

    if (!user || user.walletBalance < numericAmount) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Saldo tidak mencukupi. Saldo saat ini: Rp ${Number(user?.walletBalance || 0).toLocaleString('id-ID')}`
        }
      })
    }

    // Cek rekening tujuan penarikan
    let account = null
    if (accountId) {
      account = await prisma.withdrawalAccount.findFirst({
        where: { id: accountId, userId: req.userId }
      })
    } else {
      account = await prisma.withdrawalAccount.findFirst({
        where: { userId: req.userId, isPrimary: true }
      }) || await prisma.withdrawalAccount.findFirst({
        where: { userId: req.userId }
      })
    }

    if (!account) {
      return res.status(400).json({
        error: {
          code: 'ACCOUNT_REQUIRED',
          message: 'Pilih atau daftarkan rekening penarikan tujuan terlebih dahulu'
        }
      })
    }

    const reference = `WD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
    const description = `Pencairan dana ke ${account.bankName} - ${account.accountNumber} (a.n. ${account.accountHolder})`

    // Eksekusi penarikan: kurangi saldo dan catat transaksi
    const [updatedUser, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: {
          walletBalance: {
            decrement: numericAmount
          }
        },
        select: { walletBalance: true }
      }),
      prisma.walletTransaction.create({
        data: {
          userId: req.userId,
          type: 'WITHDRAW',
          amount: numericAmount,
          description,
          status: 'BERHASIL',
          reference,
          paymentMethod: account.bankName
        }
      })
    ])

    return res.json({
      message: 'Penarikan saldo berhasil diproses',
      newBalance: updatedUser.walletBalance,
      transaction,
      destinationAccount: account
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/wallet/accounts
 * Mengambil daftar rekening penarikan milik user.
 */
walletRouter.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await prisma.withdrawalAccount.findMany({
      where: { userId: req.userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }]
    })

    return res.json({ accounts })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/wallet/accounts
 * Mendaftarkan rekening penarikan baru.
 */
walletRouter.post('/accounts', async (req, res, next) => {
  try {
    const { bankName, accountNumber, accountHolder, isPrimary = false } = req.body

    const cleanBank = bankName ? String(bankName).trim() : ''
    const cleanNumber = accountNumber ? String(accountNumber).trim() : ''
    const cleanHolder = accountHolder ? String(accountHolder).trim() : ''

    if (!cleanBank) {
      return res.status(400).json({
        error: { code: 'BANK_NAME_REQUIRED', message: 'Nama bank atau e-wallet wajib diisi' }
      })
    }

    if (!cleanNumber || cleanNumber.length < 5) {
      return res.status(400).json({
        error: { code: 'ACCOUNT_NUMBER_INVALID', message: 'Nomor rekening / e-wallet tidak valid' }
      })
    }

    if (!cleanHolder) {
      return res.status(400).json({
        error: { code: 'ACCOUNT_HOLDER_REQUIRED', message: 'Nama pemilik rekening wajib diisi' }
      })
    }

    // Cek apakah user sudah punya rekening penarikan sebelumnya
    const totalExisting = await prisma.withdrawalAccount.count({
      where: { userId: req.userId }
    })

    const shouldBePrimary = isPrimary || totalExisting === 0

    if (shouldBePrimary && totalExisting > 0) {
      await prisma.withdrawalAccount.updateMany({
        where: { userId: req.userId },
        data: { isPrimary: false }
      })
    }

    const newAccount = await prisma.withdrawalAccount.create({
      data: {
        userId: req.userId,
        bankName: cleanBank,
        accountNumber: cleanNumber,
        accountHolder: cleanHolder,
        isPrimary: shouldBePrimary
      }
    })

    return res.status(201).json({
      message: 'Rekening penarikan berhasil didaftarkan',
      account: newAccount
    })
  } catch (error) {
    next(error)
  }
})

/**
 * PATCH /api/wallet/accounts/:id
 * Mengupdate rekening penarikan atau mengubahnya menjadi rekening utama.
 */
walletRouter.patch('/accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { bankName, accountNumber, accountHolder, isPrimary } = req.body

    const existing = await prisma.withdrawalAccount.findFirst({
      where: { id, userId: req.userId }
    })

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Rekening penarikan tidak ditemukan' }
      })
    }

    if (isPrimary) {
      await prisma.withdrawalAccount.updateMany({
        where: { userId: req.userId },
        data: { isPrimary: false }
      })
    }

    const updated = await prisma.withdrawalAccount.update({
      where: { id },
      data: {
        ...(bankName ? { bankName: String(bankName).trim() } : {}),
        ...(accountNumber ? { accountNumber: String(accountNumber).trim() } : {}),
        ...(accountHolder ? { accountHolder: String(accountHolder).trim() } : {}),
        ...(typeof isPrimary === 'boolean' ? { isPrimary } : {})
      }
    })

    return res.json({
      message: 'Rekening penarikan berhasil diperbarui',
      account: updated
    })
  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /api/wallet/accounts/:id
 * Menghapus rekening penarikan.
 */
walletRouter.delete('/accounts/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const existing = await prisma.withdrawalAccount.findFirst({
      where: { id, userId: req.userId }
    })

    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Rekening penarikan tidak ditemukan' }
      })
    }

    await prisma.withdrawalAccount.delete({
      where: { id }
    })

    // Jika rekening yang dihapus adalah rekening utama, jadikan rekening lain sebagai utama
    if (existing.isPrimary) {
      const another = await prisma.withdrawalAccount.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: 'desc' }
      })
      if (another) {
        await prisma.withdrawalAccount.update({
          where: { id: another.id },
          data: { isPrimary: true }
        })
      }
    }

    return res.json({
      message: 'Rekening penarikan berhasil dihapus'
    })
  } catch (error) {
    next(error)
  }
})
