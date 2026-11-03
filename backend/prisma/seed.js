import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

/**
 * Seeder MyRent.
 *
 * 1. Akun admin default (utama + template desain UI).
 * 2. Satu akun PEMILIK dummy yang dipakai pemilik data katalog alat.
 * 3. Lima unit alat berstatus TERSEDIA + satu unit DISEWA (kontrol status filter).
 *
 * Semua id ditulis eksplisit supaya seeder aman dijalankan berulang kali
 * (idempotent) — tidakMenduplikasi data katalog.
 */

const PEMILIK_ID = '11111111-1111-4111-8111-111111111111'
const PEMILIK_EMAIL = 'pemilik@myrent.com'
const PEMILIK_PASSWORD = 'Pemilik#Sewa2026'

const OWNER_ALT_ID = '33333333-3333-4333-8333-333333333333'

const PENYEWA_ID = '22222222-2222-4222-8222-222222222222'
const PENYEWA_EMAIL = 'penyewa@myrent.com'
const PENYEWA_PASSWORD = 'Penyewa#Sewa2026'

const EQUIPMENTS = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Espresso Machine La Marzocco GS3',
    category: 'Mesin Kopi',
    description:
      'Mesin espresso single group dengan boiler stainless, PID presisi, dan steam wand ganda untuk susu. Stabil untuk produksi 80-120 cangkir per hari. Sudah termasuk portafilter 58 mm, tamper, dan pitcher susu.',
    pricePerDay: 150000,
    deposit: 500000,
    powerWatt: 1500,
    weightKg: 45,
    dimensions: '58 × 49 × 41 cm',
    minRentDays: 1,
    maintenanceBufferDays: 1,
    location: 'Kec. Cilandak, Jakarta Selatan',
    distance: 2.4,
    status: 'TERSEDIA',
    condition: 'Prima',
    stock: 1,
    deliveryFee: 45000,
    accessories: ['Portafilter 58mm', 'Tamper Stainless', 'Milk Pitcher', 'Kabel Power'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Oven Deck Bakery 2 Pintu',
    category: 'Oven & Bakery',
    description:
      'Oven deck gas dengan dua pintu, stone deck, dan timer digital per kanal. Kapasitas 6 loyang 40 x 60 cm per siklus, cocok untuk roti, cake, dan pastry produksi harian.',
    pricePerDay: 210000,
    deposit: 750000,
    powerWatt: 1200,
    weightKg: 85,
    dimensions: '90 × 70 × 60 cm',
    minRentDays: 2,
    maintenanceBufferDays: 1,
    location: 'Kec. Kebayoran Baru, Jakarta Selatan',
    distance: 3.1,
    status: 'TERSEDIA',
    condition: 'Prima',
    stock: 1,
    deliveryFee: 50000,
    accessories: ['Loyang 40x60 (4 pcs)', 'Selang Gas Regulator', 'Sarung Tangan Panas', 'Timer Digital'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Mesin Kemasan Vakum Otomatis',
    category: 'Mesin Kemasan',
    description:
      'Mesin vakum untuk kemasan food grade dengan pompa dry oil-free, chamber 400 x 320 mm, dan seal dua sisi. Digunakan untuk mengawetkan produk setengah jadi seperti keripik dan kacang.',
    pricePerDay: 95000,
    deposit: 300000,
    powerWatt: 900,
    weightKg: 28,
    dimensions: '45 × 35 × 30 cm',
    minRentDays: 1,
    maintenanceBufferDays: 1,
    location: 'Kec. Tebet, Jakarta Selatan',
    distance: 1.2,
    status: 'TERSEDIA',
    condition: 'Terawat',
    stock: 2,
    deliveryFee: 45000,
    accessories: ['Kabel Power', 'Sample Kantong Vakum', 'Nozzle Vakum', 'Kawat Pemanas Cadangan'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Mesin Jahit Industri Juki DDL-8700',
    category: 'Konveksi',
    description:
      'Mesin jahit direct drive satu jarum dengan motor servo 550 W, 21 jenis pola jahitan, dan pedal elektronik. Cocok untuk produksi kemeja dan seragam UMKM.',
    pricePerDay: 75000,
    deposit: 400000,
    powerWatt: 400,
    weightKg: 12,
    dimensions: '55 × 25 × 35 cm',
    minRentDays: 3,
    maintenanceBufferDays: 2,
    location: 'Kec. Pasar Minggu, Jakarta Selatan',
    distance: 5.8,
    status: 'TERSEDIA',
    condition: 'Prima',
    stock: 1,
    deliveryFee: 35000,
    accessories: ['Pedal Servo', 'Jarum Organ DBx1 (10 pcs)', 'Minyak Pelumas 100ml', 'Spool Cadangan'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1528458876885-5b6eacdd3671?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    name: 'Mixer Planetary 20 Liter',
    category: 'Oven & Bakery',
    description:
      'Mixer planetary 20 liter dengan gearbox tiga kecepatan, pengaduk spiral, dan timer. Digunakan untuk adonan kue, roti, dan batch produksi hingga 20 kg per batch.',
    pricePerDay: 120000,
    deposit: 350000,
    powerWatt: 1100,
    weightKg: 24,
    dimensions: '40 × 30 × 55 cm',
    minRentDays: 1,
    maintenanceBufferDays: 1,
    location: 'Kec. Kebayoran Baru, Jakarta Selatan',
    distance: 4.0,
    status: 'TERSEDIA',
    condition: 'Prima',
    stock: 1,
    deliveryFee: 45000,
    accessories: ['Spiral Dough Hook', 'Whisk Ball', 'Flat Beater', 'Bowl Stainless 20L'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    name: 'Mesin Espresso Otomatis 2 Grup',
    category: 'Mesin Kopi',
    description:
      'Mesin espresso 2 grup dengan sistem PID dan dual boiler, stabil untuk produksi 150–200 cangkir per hari. Sudah termasuk portafilter, tamper, dan pitcher susu. Perawatan rutin dilakukan setiap 3 bulan oleh teknisi pemilik.',
    pricePerDay: 320000,
    deposit: 1200000,
    powerWatt: 2200,
    weightKg: 34,
    dimensions: '40 × 53 × 35 cm',
    minRentDays: 1,
    maintenanceBufferDays: 1,
    location: 'Kec. Cilandak, Jakarta Selatan',
    distance: 6.5,
    status: 'DISEWA',
    condition: 'Terawat',
    stock: 1,
    deliveryFee: 55000,
    accessories: ['Portafilter Double Spout (2 pcs)', 'Tamper 58mm', 'Knock Box', 'Pitcher Susu 600ml'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    ownerId: 'OWNER_ALT',
    name: 'Genset Silent Inverter 5000 Watt',
    category: 'Kelengkapan Usaha',
    description:
      'Genset silent inverter hemat bahan bakar dengan peredam suara ganda (< 65 dB). Daya stabil untuk menopang booth event kopi, oven listrik, atau emergency backup UMKM.',
    pricePerDay: 250000,
    deposit: 800000,
    powerWatt: 5000,
    weightKg: 42,
    dimensions: '60 × 45 × 50 cm',
    minRentDays: 1,
    maintenanceBufferDays: 1,
    location: 'Kec. Cilandak, Jakarta Selatan',
    distance: 1.8,
    status: 'TERSEDIA',
    condition: 'Prima',
    stock: 1,
    deliveryFee: 45000,
    accessories: ['Kabel Roll 25m', 'Corong Bensin', 'Kunci Busi', 'Manual Book'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    name: 'Coffee Grinder Review Test',
    category: 'Mesin Kopi',
    description:
      'Grinder kopi komersial dengan flat burr presisi tinggi dan mikro-kalibrasi tingkat kehalusan bubuk kopi. Cocok untuk espresso, manual brew, dan kebutuhan kafe harian.',
    pricePerDay: 50000,
    deposit: 100000,
    powerWatt: 300,
    weightKg: 5,
    dimensions: '20x15x30 cm',
    minRentDays: 1,
    maintenanceBufferDays: 1,
    location: 'Kec. Cilandak, Jakarta Selatan',
    distance: 1.0,
    status: 'TERSEDIA',
    condition: 'Prima',
    stock: 1,
    deliveryFee: 45000,
    accessories: ['Hopper Biji Kopi', 'Catch Cup Stainless', 'Kuas Pembersih', 'Kabel Power'],
    deliveryMethods: ['PICKUP', 'COURIER'],
    isDeleted: false,
    images: [
      'https://images.unsplash.com/photo-1589396575653-c09c794ff6a6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
    ]
  }
]

async function main() {
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin#Sewa2026'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  // 1. Akun Admin Default Utama
  const defaultAdmin = await prisma.user.upsert({
    where: { email: 'admin@myrent.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      fullName: 'Super Administrator MyRent',
      phone: '081234567890'
    },
    create: {
      email: 'admin@myrent.com',
      password: hashedPassword,
      role: 'ADMIN',
      fullName: 'Super Administrator MyRent',
      phone: '081234567890'
    }
  })

  // 2. Akun Admin Alternatif sesuai template desain UI (rani.admin@gmail.com)
  const templateAdmin = await prisma.user.upsert({
    where: { email: 'rani.admin@gmail.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      fullName: 'Rani Admin',
      phone: '081298765432'
    },
    create: {
      email: 'rani.admin@gmail.com',
      password: hashedPassword,
      role: 'ADMIN',
      fullName: 'Rani Admin',
      phone: '081298765432'
    }
  })

  // 3. Akun PEMILIK dummy — pemilik seluruh data katalog alat di bawah.
  const hashedPemilikPassword = await bcrypt.hash(PEMILIK_PASSWORD, 10)
  const pemilik = await prisma.user.upsert({
    where: { email: PEMILIK_EMAIL },
    update: {
      password: hashedPemilikPassword,
      role: 'PEMILIK',
      fullName: 'Kopi Senja Roastery',
      phone: '081211223344',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1001',
      kycData: {
        businessName: 'Kopi Senja Roastery',
        businessSector: 'Kuliner & Kopi',
        city: 'Jakarta Selatan',
        district: 'Kec. Cilandak',
        address: 'Jl. Raya Cilandak No. 12, Jakarta Selatan',
        startYear: '2019',
        powerCapacity: '> 3500 W',
        customPower: '5000',
        dayaListrik: 5000,
        profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        frontPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
      }
    },
    create: {
      id: PEMILIK_ID,
      email: PEMILIK_EMAIL,
      password: hashedPemilikPassword,
      role: 'PEMILIK',
      fullName: 'Kopi Senja Roastery',
      phone: '081211223344',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1001',
      kycData: {
        businessName: 'Kopi Senja Roastery',
        businessSector: 'Kuliner & Kopi',
        city: 'Jakarta Selatan',
        district: 'Kec. Cilandak',
        address: 'Jl. Raya Cilandak No. 12, Jakarta Selatan',
        startYear: '2019',
        powerCapacity: '> 3500 W',
        customPower: '5000',
        dayaListrik: 5000,
        profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        frontPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
      }
    }
  })

  // 3b. Akun Pemilik dummy alternatif (owner@myrent.com)
  const ownerAlt = await prisma.user.upsert({
    where: { email: 'owner@myrent.com' },
    update: {
      password: hashedPemilikPassword,
      role: 'PEMILIK',
      fullName: 'Mitra Owner MyRent',
      phone: '081299887755',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1005',
      kycData: {
        businessName: 'Mitra Owner MyRent',
        businessSector: 'Peralatan Usaha & Mesin',
        city: 'Jakarta Selatan',
        district: 'Kec. Cilandak',
        address: 'Jl. TB Simatupang No. 15, Jakarta Selatan',
        startYear: '2020',
        dayaListrik: 5500,
        profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        frontPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
      }
    },
    create: {
      id: OWNER_ALT_ID,
      email: 'owner@myrent.com',
      password: hashedPemilikPassword,
      role: 'PEMILIK',
      fullName: 'Mitra Owner MyRent',
      phone: '081299887755',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1005',
      kycData: {
        businessName: 'Mitra Owner MyRent',
        businessSector: 'Peralatan Usaha & Mesin',
        city: 'Jakarta Selatan',
        district: 'Kec. Cilandak',
        address: 'Jl. TB Simatupang No. 15, Jakarta Selatan',
        startYear: '2020',
        dayaListrik: 5500,
        profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        frontPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
      }
    }
  })

  // 4. Akun PENYEWA dummy — dipakai untuk mencoba alur beranda sewa & detail alat.
  const hashedPenyewaPassword = await bcrypt.hash(PENYEWA_PASSWORD, 10)
  const penyewa = await prisma.user.upsert({
    where: { email: PENYEWA_EMAIL },
    update: {
      password: hashedPenyewaPassword,
      role: 'PENYEWA',
      fullName: 'Budi Santoso',
      phone: '081233445566',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1002',
      kycData: {
        businessName: 'Warung Kopi Nusantara',
        businessSector: 'Kuliner & Kopi',
        city: 'Jakarta Selatan',
        district: 'Kec. Tebet',
        address: 'Jl. Tebet Barat Dalam No. 8, Jakarta Selatan',
        landmark: 'Sebelah Alfamart, depan gang kecil',
        startYear: '2021',
        powerCapacity: '1300 W',
        customPower: '',
        isManualPower: false,
        dayaListrik: 1300,
        bankName: 'Bank BCA',
        bankAccountNumber: '8720345612',
        bankAccountName: 'Budi Santoso'
      }
    },
    create: {
      id: PENYEWA_ID,
      email: PENYEWA_EMAIL,
      password: hashedPenyewaPassword,
      role: 'PENYEWA',
      fullName: 'Budi Santoso',
      phone: '081233445566',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1002',
      kycData: {
        businessName: 'Warung Kopi Nusantara',
        businessSector: 'Kuliner & Kopi',
        city: 'Jakarta Selatan',
        district: 'Kec. Tebet',
        address: 'Jl. Tebet Barat Dalam No. 8, Jakarta Selatan',
        landmark: 'Sebelah Alfamart, depan gang kecil',
        startYear: '2021',
        powerCapacity: '1300 W',
        customPower: '',
        isManualPower: false,
        dayaListrik: 1300,
        bankName: 'Bank BCA',
        bankAccountNumber: '8720345612',
        bankAccountName: 'Budi Santoso'
      }
    }
  })

  // 4b. Penyewa tambahan untuk ragam ulasan dan riwayat transaksi
  const PENYEWA_2_ID = '22222222-2222-4222-8222-222222222223'
  const PENYEWA_2_EMAIL = 'andini@myrent.com'
  const penyewa2 = await prisma.user.upsert({
    where: { email: PENYEWA_2_EMAIL },
    update: {
      fullName: 'Siti Andini',
      phone: '081234567891',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1003',
      kycData: {
        businessName: 'Dapur Roti Andini',
        businessSector: 'Oven & Bakery',
        city: 'Jakarta Selatan',
        district: 'Kec. Kebayoran Baru',
        address: 'Jl. Senopati Raya No. 45, Jakarta Selatan',
        dayaListrik: 2200
      }
    },
    create: {
      id: PENYEWA_2_ID,
      email: PENYEWA_2_EMAIL,
      password: hashedPenyewaPassword,
      role: 'PENYEWA',
      fullName: 'Siti Andini',
      phone: '081234567891',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1003',
      kycData: {
        businessName: 'Dapur Roti Andini',
        businessSector: 'Oven & Bakery',
        city: 'Jakarta Selatan',
        district: 'Kec. Kebayoran Baru',
        address: 'Jl. Senopati Raya No. 45, Jakarta Selatan',
        dayaListrik: 2200
      }
    }
  })

  const PENYEWA_3_ID = '22222222-2222-4222-8222-222222222224'
  const PENYEWA_3_EMAIL = 'pakhari@myrent.com'
  const penyewa3 = await prisma.user.upsert({
    where: { email: PENYEWA_3_EMAIL },
    update: {
      fullName: 'Hari Wibowo',
      phone: '081298765431',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1004',
      kycData: {
        businessName: 'Warung Sate Pak Hari',
        businessSector: 'Kuliner & Kopi',
        city: 'Jakarta Selatan',
        district: 'Kec. Tebet',
        address: 'Jl. Tebet Timur No. 18, Jakarta Selatan',
        dayaListrik: 1300
      }
    },
    create: {
      id: PENYEWA_3_ID,
      email: PENYEWA_3_EMAIL,
      password: hashedPenyewaPassword,
      role: 'PENYEWA',
      fullName: 'Hari Wibowo',
      phone: '081298765431',
      verificationStatus: 'DISETUJUI',
      submissionCode: 'VR-1004',
      kycData: {
        businessName: 'Warung Sate Pak Hari',
        businessSector: 'Kuliner & Kopi',
        city: 'Jakarta Selatan',
        district: 'Kec. Tebet',
        address: 'Jl. Tebet Timur No. 18, Jakarta Selatan',
        dayaListrik: 1300
      }
    }
  })

  // 5. Data alat milik akun PEMILIK di atas.
  for (const item of EQUIPMENTS) {
    const targetOwnerId = item.ownerId === 'OWNER_ALT' ? ownerAlt.id : (item.ownerId || pemilik.id)
    await prisma.equipment.upsert({
      where: { id: item.id },
      update: {
        ownerId: targetOwnerId,
        name: item.name,
        category: item.category,
        description: item.description,
        pricePerDay: item.pricePerDay,
        deposit: item.deposit,
        powerWatt: item.powerWatt,
        weightKg: item.weightKg,
        dimensions: item.dimensions,
        minRentDays: item.minRentDays,
        maintenanceBufferDays: item.maintenanceBufferDays,
        location: item.location,
        distance: item.distance,
        status: item.status,
        condition: item.condition,
        stock: item.stock ?? 1,
        deliveryFee: item.deliveryFee ?? 45000,
        accessories: item.accessories,
        deliveryMethods: item.deliveryMethods,
        isDeleted: item.isDeleted,
        images: item.images
      },
      create: {
        ...item,
        ownerId: targetOwnerId
      }
    })
  }

  // 6. Reset seluruh pesanan milik akun default penyewa@myrent.com
  //    Hapus terlebih dahulu ulasan terkait agar aman dari constraint foreign key
  await prisma.review.deleteMany({
    where: {
      OR: [
        { userId: penyewa.id },
        { order: { userId: penyewa.id } }
      ]
    }
  })
  await prisma.order.deleteMany({
    where: { userId: penyewa.id }
  })

  // 7. Data Order awal:
  //    - 4 data pesanan spesifik untuk penyewa@myrent.com mewakili 4 siklus status:
  //      1. MENUNGGU_KONFIRMASI (Baru checkout, menunggu ACC pemilik)
  //      2. SEWA_AKTIF (Pemilik sudah ACC, alat sedang digunakan + countdown timer)
  //      3. SELESAI (Masa sewa habis, BAST akhir tervalidasi)
  //      4. DITOLAK (Pemilik menolak pengajuan, deposit dikembalikan)
  //    - Pesanan pendukung untuk penyewa 2 & 3 agar katalog dan toko pemilik hidup.
  const now = new Date()
  const ORDER_SEEDS = [
    // ── 4 Pesanan Siklus Status Penyewa Default (penyewa@myrent.com) ───────────
    {
      id: 'b2000000-0000-4000-8000-000000000011',
      invoiceNumber: 'INV-2610-001',
      userId: penyewa.id,
      equipmentId: 'a1000000-0000-4000-8000-000000000001',
      startDate: new Date(now.getTime() + 1 * 86400000),
      endDate: new Date(now.getTime() + 4 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 450000,
      shippingCost: 45000,
      depositAmount: 500000,
      totalPaid: 995000,
      status: 'MENUNGGU_KONFIRMASI',
      paymentMethod: 'VA_BCA',
      paidAt: new Date(now.getTime() - 2 * 3600000),
      contractAgreedAt: new Date(now.getTime() - 2 * 3600000),
      renterNotes: 'Mohon konfirmasi ketersediaan unit untuk persiapan event pop-up kafe weekend ini.'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000012',
      invoiceNumber: 'INV-2610-002',
      userId: penyewa.id,
      equipmentId: 'a1000000-0000-4000-8000-000000000002',
      startDate: new Date(now.getTime() - 2 * 86400000),
      endDate: new Date(now.getTime() + 2 * 86400000),
      rentalDays: 4,
      deliveryMethod: 'PICKUP',
      rentalCost: 840000,
      shippingCost: 0,
      depositAmount: 750000,
      totalPaid: 1590000,
      status: 'SEWA_AKTIF',
      paymentMethod: 'QRIS',
      paidAt: new Date(now.getTime() - 3 * 86400000),
      contractAgreedAt: new Date(now.getTime() - 3 * 86400000),
      renterNotes: 'Unit diambil langsung di gudang pemilik oleh tim operasional kami.'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000013',
      invoiceNumber: 'INV-2610-003',
      userId: penyewa.id,
      equipmentId: 'a1000000-0000-4000-8000-000000000003',
      startDate: new Date(now.getTime() - 10 * 86400000),
      endDate: new Date(now.getTime() - 5 * 86400000),
      rentalDays: 5,
      deliveryMethod: 'COURIER',
      rentalCost: 475000,
      shippingCost: 35000,
      depositAmount: 300000,
      totalPaid: 810000,
      status: 'SELESAI',
      paymentMethod: 'VA_BCA',
      paidAt: new Date(now.getTime() - 11 * 86400000),
      contractAgreedAt: new Date(now.getTime() - 11 * 86400000),
      returnData: {
        checklist: { bodyClean: true, powerFunctional: true, accessoriesComplete: true },
        condition: 'BAIK',
        handoverPin: '782194',
        bastSubmittedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
        unitReceivedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
        inspectionApprovedAt: new Date(now.getTime() - 5 * 86400000 + 3600000).toISOString(),
        refundAmount: 300000,
        notes: 'Unit dikembalikan dalam kondisi prima dan bersih sesuai BAST awal.'
      },
      renterNotes: 'Digunakan untuk pengemasan batch produk kopi bubuk festival UMKM.'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000014',
      invoiceNumber: 'INV-2610-004',
      userId: penyewa.id,
      equipmentId: 'a1000000-0000-4000-8000-000000000004',
      startDate: new Date(now.getTime() - 3 * 86400000),
      endDate: new Date(now.getTime() + 1 * 86400000),
      rentalDays: 4,
      deliveryMethod: 'COURIER',
      rentalCost: 300000,
      shippingCost: 40000,
      depositAmount: 400000,
      totalPaid: 740000,
      status: 'DITOLAK',
      paymentMethod: 'EWALLET',
      paidAt: new Date(now.getTime() - 4 * 86400000),
      contractAgreedAt: new Date(now.getTime() - 4 * 86400000),
      disputeNote: 'Jadwal sewa bertabrakan dengan jadwal perawatan berkala unit mesin jahit. Seluruh pembayaran sewa dan deposit telah dikembalikan utuh ke saldo dompet.',
      renterNotes: 'Pengajuan sewa untuk kebutuhan mendesak produksi seragam.'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000015',
      invoiceNumber: 'INV-2610-005',
      userId: penyewa.id,
      equipmentId: 'a1000000-0000-4000-8000-000000000005',
      startDate: new Date(now.getTime() - 4 * 86400000),
      endDate: new Date(now.getTime() - 1 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 360000,
      shippingCost: 35000,
      depositAmount: 350000,
      totalPaid: 745000,
      status: 'INSPEKSI',
      paymentMethod: 'VA_BCA',
      paidAt: new Date(now.getTime() - 5 * 86400000),
      contractAgreedAt: new Date(now.getTime() - 5 * 86400000),
      initialBast: {
        photos: {
          front: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
          side: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          panel: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
        },
        notes: 'Serah terima awal unit Mixer Planetary 20L: unit mulus tanpa goresan, mangkok stainless dan 3 mata pengaduk lengkap.',
        checklist: {
          mesinMenyala: true,
          bodiMulus: true,
          mangkokStainless: true,
          pengadukLengkap: true
        },
        signedAt: new Date(now.getTime() - 4 * 86400000).toISOString()
      },
      returnData: {
        handoverPin: '849201',
        bastSubmittedAt: new Date(now.getTime() - 18 * 3600000).toISOString(),
        handedOverAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
        unitReceivedAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
        inspectionDeadline: new Date(now.getTime() + 42 * 3600000).toISOString(),
        photos: {
          front: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
          side: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
          panel: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
        },
        checklist: {
          mesinMenyala: true,
          bodiUtuh: true,
          komponenLengkap: true,
          kebersihanOk: true
        },
        condition: 'BAIK',
        conditionNotes: 'Unit bersih dan seluruh pengaduk dikembalikan lengkap. Siap diinspeksi pemilik.',
        notes: 'Penyewa telah submit BAST Akhir dan menyerahkan unit fisik. Menunggu pemilik menyelesaikan inspeksi.'
      },
      renterNotes: 'Digunakan untuk adonan roti manis batch festival UMKM.'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000016',
      invoiceNumber: 'INV-2610-006',
      userId: penyewa.id,
      equipmentId: 'a1000000-0000-4000-8000-000000000006',
      startDate: new Date(now.getTime() - 7 * 86400000),
      endDate: new Date(now.getTime() - 3 * 86400000),
      rentalDays: 4,
      deliveryMethod: 'PICKUP',
      rentalCost: 1280000,
      shippingCost: 0,
      depositAmount: 1200000,
      damageFee: 450000,
      totalPaid: 2480000,
      status: 'DISPUTE',
      paymentMethod: 'QRIS',
      paidAt: new Date(now.getTime() - 8 * 86400000),
      contractAgreedAt: new Date(now.getTime() - 8 * 86400000),
      disputeReason: 'Kabel power mesin kopi hilang dan bodi samping penyok parah',
      disputeNote: 'Kabel power mesin kopi hilang dan bodi samping penyok parah',
      ownerInspectionPhotos: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80'
      ],
      initialBast: {
        photos: {
          front: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
          side: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
          panel: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
        },
        notes: 'Kondisi mesin espresso 2 grup mulus 100%, bodi samping tanpa cacat, kabel power orisinal terpasang rapi, dan tekanan boiler stabil 9 bar.',
        checklist: {
          bodiMulus: true,
          kabelPowerAda: true,
          portafilterLengkap: true,
          tekananNormal: true
        },
        signedAt: new Date(now.getTime() - 7 * 86400000).toISOString()
      },
      returnData: {
        handoverPin: '528194',
        bastSubmittedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        unitReceivedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
        inspectedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
        disputedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
        ownerNotes: 'Kabel power mesin kopi hilang dan bodi samping penyok parah saat dibongkar di stan event.',
        damageFeeClaimed: 450000,
        photos: {
          front: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
          side: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
        },
        checklist: {
          mesinMenyala: true,
          bodiUtuh: false,
          komponenLengkap: false,
          kebersihanOk: true
        },
        conditionNotes: 'Mesin dipakai selama 4 hari event stan. Kabel power tertinggal di lokasi pameran dan bodi tersenggol saat loading.',
        notes: 'Pemilik menolak BAST akhir karena unit mengalami kerusakan fisik dan kehilangan aksesoris kabel power.'
      },
      renterNotes: 'Digunakan untuk stan kopi pop-up.'
    },

    // ── Pesanan Pendukung (Penyewa 2 & 3) untuk riwayat katalog alat ─────────
    {
      id: 'b2000000-0000-4000-8000-000000000002',
      invoiceNumber: 'INV-2406-021',
      userId: PENYEWA_2_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000002',
      startDate: new Date(now.getTime() + 3 * 86400000),
      endDate: new Date(now.getTime() + 7 * 86400000),
      rentalDays: 4,
      deliveryMethod: 'PICKUP',
      rentalCost: 840000,
      shippingCost: 0,
      depositAmount: 750000,
      totalPaid: 1590000,
      status: 'MENUNGGU_KONFIRMASI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000003',
      invoiceNumber: 'INV-2406-024',
      userId: PENYEWA_3_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000003',
      startDate: new Date(now.getTime() + 1 * 86400000),
      endDate: new Date(now.getTime() + 4 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 285000,
      shippingCost: 35000,
      depositAmount: 300000,
      totalPaid: 620000,
      status: 'DIKIRIM'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000007',
      invoiceNumber: 'INV-2405-082',
      userId: PENYEWA_3_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000003',
      startDate: new Date(now.getTime() - 25 * 86400000),
      endDate: new Date(now.getTime() - 21 * 86400000),
      rentalDays: 4,
      deliveryMethod: 'COURIER',
      rentalCost: 380000,
      shippingCost: 35000,
      depositAmount: 300000,
      totalPaid: 715000,
      status: 'SELESAI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000008',
      invoiceNumber: 'INV-2405-098',
      userId: PENYEWA_2_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000002',
      startDate: new Date(now.getTime() - 20 * 86400000),
      endDate: new Date(now.getTime() - 15 * 86400000),
      rentalDays: 5,
      deliveryMethod: 'PICKUP',
      rentalCost: 1050000,
      shippingCost: 0,
      depositAmount: 750000,
      totalPaid: 1800000,
      status: 'SELESAI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000009',
      invoiceNumber: 'INV-2405-071',
      userId: PENYEWA_2_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000001',
      startDate: new Date(now.getTime() - 18 * 86400000),
      endDate: new Date(now.getTime() - 15 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 450000,
      shippingCost: 45000,
      depositAmount: 500000,
      totalPaid: 995000,
      status: 'SELESAI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000010',
      invoiceNumber: 'INV-2405-075',
      userId: PENYEWA_2_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000004',
      startDate: new Date(now.getTime() - 16 * 86400000),
      endDate: new Date(now.getTime() - 12 * 86400000),
      rentalDays: 4,
      deliveryMethod: 'COURIER',
      rentalCost: 300000,
      shippingCost: 35000,
      depositAmount: 400000,
      totalPaid: 735000,
      status: 'SELESAI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000021',
      invoiceNumber: 'INV-2405-088',
      userId: PENYEWA_3_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000005',
      startDate: new Date(now.getTime() - 22 * 86400000),
      endDate: new Date(now.getTime() - 19 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'COURIER',
      rentalCost: 360000,
      shippingCost: 45000,
      depositAmount: 350000,
      totalPaid: 755000,
      status: 'SELESAI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000022',
      invoiceNumber: 'INV-2405-092',
      userId: PENYEWA_3_ID,
      equipmentId: 'a1000000-0000-4000-8000-000000000007',
      startDate: new Date(now.getTime() - 14 * 86400000),
      endDate: new Date(now.getTime() - 12 * 86400000),
      rentalDays: 2,
      deliveryMethod: 'PICKUP',
      rentalCost: 500000,
      shippingCost: 0,
      depositAmount: 800000,
      totalPaid: 1300000,
      status: 'SELESAI'
    },
    {
      id: 'b2000000-0000-4000-8000-000000000028',
      invoiceNumber: 'INV-2405-095',
      userId: PENYEWA_2_ID,
      equipmentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      startDate: new Date(now.getTime() - 15 * 86400000),
      endDate: new Date(now.getTime() - 12 * 86400000),
      rentalDays: 3,
      deliveryMethod: 'PICKUP',
      rentalCost: 150000,
      shippingCost: 0,
      depositAmount: 100000,
      totalPaid: 250000,
      status: 'SELESAI'
    }
  ]

  for (const order of ORDER_SEEDS) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {
        invoiceNumber: order.invoiceNumber,
        userId: order.userId,
        equipmentId: order.equipmentId,
        startDate: order.startDate,
        endDate: order.endDate,
        rentalDays: order.rentalDays,
        deliveryMethod: order.deliveryMethod,
        rentalCost: order.rentalCost,
        shippingCost: order.shippingCost,
        depositAmount: order.depositAmount,
        damageFee: order.damageFee ?? 0,
        lateFee: order.lateFee ?? 0,
        totalPaid: order.totalPaid,
        status: order.status,
        paymentMethod: order.paymentMethod ?? null,
        paidAt: order.paidAt ?? null,
        contractAgreedAt: order.contractAgreedAt ?? null,
        returnData: order.returnData ?? null,
        renterNotes: order.renterNotes ?? null,
        disputeNote: order.disputeNote ?? null,
        disputeReason: order.disputeReason ?? null
      },
      create: order
    })
  }

  // 8. Data Ulasan (Reviews) untuk toko Pemilik
  const REVIEW_SEEDS = [
    {
      id: 'c3000000-0000-4000-8000-000000000001',
      orderId: 'b2000000-0000-4000-8000-000000000009',
      equipmentId: 'a1000000-0000-4000-8000-000000000001',
      userId: PENYEWA_2_ID,
      rating: 5,
      comment:
        'Ekstraksi espresso sangat mantap, PID stabil dan steam wand bertenaga untuk pesanan kafe kami.',
      createdAt: new Date(now.getTime() - 14 * 86400000)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000002',
      orderId: 'b2000000-0000-4000-8000-000000000008',
      equipmentId: 'a1000000-0000-4000-8000-000000000002',
      userId: PENYEWA_2_ID,
      rating: 5,
      comment:
        'Oven deck bekerja sangat stabil, suhu presisi untuk pastry dan roti artisan kami. Sangat membantu lonjakan pesanan!',
      createdAt: new Date(now.getTime() - 14 * 86400000)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000003',
      orderId: 'b2000000-0000-4000-8000-000000000007',
      equipmentId: 'a1000000-0000-4000-8000-000000000003',
      userId: PENYEWA_3_ID,
      rating: 4,
      comment:
        'Mesin vakum food grade berkualitas dan pompa kering bersih. Membantu kemasan keripik kami jadi lebih higienis.',
      createdAt: new Date(now.getTime() - 20 * 86400000)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000004',
      orderId: 'b2000000-0000-4000-8000-000000000010',
      equipmentId: 'a1000000-0000-4000-8000-000000000004',
      userId: PENYEWA_2_ID,
      rating: 5,
      comment:
        'Mesin jahit sangat halus, motor direct drive hemat listrik dan jahitan presisi untuk seragam kerja.',
      createdAt: new Date(now.getTime() - 11 * 86400000)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000005',
      orderId: 'b2000000-0000-4000-8000-000000000021',
      equipmentId: 'a1000000-0000-4000-8000-000000000005',
      userId: PENYEWA_3_ID,
      rating: 5,
      comment:
        'Kapasitas 20 liter sangat pas untuk batch adonan roti manis. Gearbox kokoh dan tidak panas.',
      createdAt: new Date(now.getTime() - 18 * 86400000)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000007',
      orderId: 'b2000000-0000-4000-8000-000000000022',
      equipmentId: 'a1000000-0000-4000-8000-000000000007',
      userId: PENYEWA_3_ID,
      rating: 5,
      comment:
        'Genset silent handal dan tidak bising di lokasi booth outdoor. Konsumsi BBM irit dan daya stabil.',
      createdAt: new Date(now.getTime() - 10 * 86400000)
    },
    {
      id: 'c3000000-0000-4000-8000-000000000008',
      orderId: 'b2000000-0000-4000-8000-000000000028',
      equipmentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      userId: PENYEWA_2_ID,
      rating: 5,
      comment:
        'Hasil gilingan kopi sangat konsisten dan halus presisi untuk ekstraksi espresso kafe kami.',
      createdAt: new Date(now.getTime() - 10 * 86400000)
    }
  ]

  for (const review of REVIEW_SEEDS) {
    await prisma.review.upsert({
      where: { id: review.id },
      update: {
        orderId: review.orderId,
        equipmentId: review.equipmentId,
        userId: review.userId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      },
      create: review
    })
  }

  // 9. Sesi Percakapan Aktif Dua Arah (Penyewa <-> Pemilik) dengan Konteks Sengketa INV-2610-006
  const CONVERSATION_ID = 'c1000000-0000-4000-8000-000000000001'
  const activeConversation = await prisma.conversation.upsert({
    where: {
      renterId_ownerId: {
        renterId: penyewa.id,
        ownerId: pemilik.id
      }
    },
    update: {
      lastMessageAt: new Date(now.getTime() - 30 * 60000)
    },
    create: {
      id: CONVERSATION_ID,
      renterId: penyewa.id,
      ownerId: pemilik.id,
      lastMessageAt: new Date(now.getTime() - 30 * 60000)
    }
  })

  // Pesan kontekstual seputar klaim/sengketa pesanan INV-2610-006 (Mesin Espresso Otomatis 2 Grup)
  const CHAT_MESSAGES = [
    {
      id: 'm1000000-0000-4000-8000-000000000001',
      conversationId: activeConversation.id,
      senderId: penyewa.id,
      content:
        'Halo Pak, terkait klaim kerusakan kabel dan bodi pada pesanan INV-2610-006, apakah kita bisa diskusikan solusinya?',
      contextType: 'ORDER',
      contextData: {
        id: 'b2000000-0000-4000-8000-000000000016',
        invoiceNumber: 'INV-2610-006',
        status: 'DISPUTE',
        equipmentId: 'a1000000-0000-4000-8000-000000000006',
        equipmentName: 'Mesin Espresso Otomatis 2 Grup',
        equipmentImage:
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
        startDate: new Date(now.getTime() - 7 * 86400000).toISOString(),
        endDate: new Date(now.getTime() - 3 * 86400000).toISOString(),
        rentalDays: 4,
        totalPaid: 2480000,
        depositAmount: 1200000,
        damageFee: 450000,
        disputeReason: 'Kabel power mesin kopi hilang dan bodi samping penyok parah'
      },
      isRead: true,
      createdAt: new Date(now.getTime() - 120 * 60000)
    },
    {
      id: 'm1000000-0000-4000-8000-000000000002',
      conversationId: activeConversation.id,
      senderId: pemilik.id,
      content:
        'Halo Mas Budi, kami sudah cek fisik saat pengembalian dan lampirkan foto inspeksi. Kabel power memang hilang dan ada penyok di cover kiri.',
      contextType: null,
      contextData: null,
      isRead: true,
      createdAt: new Date(now.getTime() - 75 * 60000)
    },
    {
      id: 'm1000000-0000-4000-8000-000000000003',
      conversationId: activeConversation.id,
      senderId: penyewa.id,
      content:
        'Baik Pak, saya konfirmasi ke staf dapur saya. Untuk kabel kami siap ganti rugi, namun untuk penyok apakah bisa dicek kembali catatan BAST awal?',
      contextType: null,
      contextData: null,
      isRead: false,
      createdAt: new Date(now.getTime() - 30 * 60000)
    }
  ]

  for (const msg of CHAT_MESSAGES) {
    await prisma.message.upsert({
      where: { id: msg.id },
      update: {
        content: msg.content,
        contextType: msg.contextType,
        contextData: msg.contextData,
        isRead: msg.isRead,
        createdAt: msg.createdAt
      },
      create: msg
    })
  }

  console.log('✅ Database Seeder Berhasil:')
  console.log(`  - Admin Utama   : ${defaultAdmin.email} (Role: ${defaultAdmin.role})`)
  console.log(`  - Admin Template: ${templateAdmin.email} (Role: ${templateAdmin.role})`)
  console.log(`  - Pemilik Katalog: ${pemilik.email} (Role: ${pemilik.role})`)
  console.log(`  - Pemilik Dummy : ${ownerAlt.email} (Role: ${ownerAlt.role})`)
  console.log(`  - Penyewa Demo  : ${penyewa.email} (Role: ${penyewa.role}) [6 Order Siklus Status]`)
  console.log(`  - Penyewa Demo 2: ${penyewa2.email} (${penyewa2.kycData?.businessName})`)
  console.log(`  - Penyewa Demo 3: ${penyewa3.email} (${penyewa3.kycData?.businessName})`)
  console.log(`  - Password Admin : ${adminPassword}`)
  console.log(`  - Password Pemilik: ${PEMILIK_PASSWORD}`)
  console.log(`  - Password Penyewa: ${PENYEWA_PASSWORD}`)
  console.log(`  - Equipment     : ${EQUIPMENTS.length} unit (${EQUIPMENTS.filter((e) => e.status === 'TERSEDIA').length} TERSEDIA)`)
  console.log(`  - Orders Total  : ${ORDER_SEEDS.length} pesanan (6 pesanan khusus penyewa default)`)
  console.log(`  - Reviews       : ${REVIEW_SEEDS.length} ulasan pelanggan realistik`)
  console.log(`  - Active Chat   : Percakapan INV-2610-006 (${CHAT_MESSAGES.length} pesan kontekstual)`)
  console.log(`  - Lazy Chat Test: Pemilik ${ownerAlt.email} siap diuji untuk sesi lazy/ephemeral`)
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

