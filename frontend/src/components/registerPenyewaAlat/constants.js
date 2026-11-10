import { readDraft } from '../../lib/registration'

export const SECTORS = [
  'Kuliner & Kopi',
  'Konveksi & Garmen',
  'Packaging & Percetakan',
  'Pertanian & Pengolahan Pangan',
  'Pertukangan & Kayu',
  'Elektronik & Perbaikan',
  'Lainnya'
]

export const POWER_CAPACITIES = ['900 W', '1300 W', '2200 W', '> 3500 W']

export const BANKS = [
  'BCA — Bank Central Asia',
  'Mandiri — Bank Mandiri',
  'BRI — Bank Rakyat Indonesia',
  'BNI — Bank Negara Indonesia',
  'BSI — Bank Syariah Indonesia',
  'CIMB Niaga',
  'Permata Bank'
]

export const INITIAL_FORM = {
  // Step 1: Buat Akun
  fullName: '',
  businessName: '',
  businessSector: 'Kuliner & Kopi',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',

  // Step 2: Identitas & KTP
  nik: '',
  ktpName: '',
  birthPlace: '',
  birthDate: '',
  ktpFile: null,
  selfieFile: null,

  // Step 3: Profil UMKM
  customSector: '',
  startYear: '',
  nib: '',
  powerCapacity: '1300 W',
  customPower: '',
  isManualPower: false,
  frontPhoto: null,
  productionPhoto: null,
  businessDesc: '',

  // Step 4: Alamat & Rekening
  address: '',
  city: '',
  district: '',
  postalCode: '',
  landmark: '',
  gpsCoords: '-6.2601, 106.8135',
  bankName: 'BCA — Bank Central Asia',
  bankAccount: '',
  bankAccountHolder: '',
  confirmAccountOwner: false,
  confirmDeduction: false,

  // Step 5: Persetujuan akhir
  agreeTruth: false,
  agreeTerms: false
}

/**
 * Ambil checkpoint draft dari localStorage (`mesitra_draft_penyewa`).
 * @returns {object|null} formData terakhir yang tersimpan
 */
export function getStoredDraft() {
  const draft = readDraft('PENYEWA')
  if (!draft) return null

  const form = draft.formData && typeof draft.formData === 'object' ? draft.formData : null
  return form && Object.keys(form).length > 0 ? form : null
}
