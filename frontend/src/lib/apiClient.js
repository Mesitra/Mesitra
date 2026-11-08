const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  // Auth
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me',
  
  // Admin KYC
  adminSubmissions: '/api/admin/submissions',
  adminSubmission: (id) => `/api/admin/submissions/${id}`,
  adminSubmissionApprove: (id) => `/api/admin/submissions/${id}/approve`,
  adminSubmissionRevision: (id) => `/api/admin/submissions/${id}/revision`,
  adminSubmissionReject: (id) => `/api/admin/submissions/${id}/reject`,
  
  // Admin Finansial
  adminFinancialOverview: '/api/admin/financial/overview',
  adminWithdrawals: '/api/admin/withdrawals',
  adminWithdrawal: (id) => `/api/admin/withdrawals/${id}`,
  adminWithdrawalApprove: (id) => `/api/admin/withdrawals/${id}/approve`,
  adminWithdrawalReject: (id) => `/api/admin/withdrawals/${id}/reject`,
  
  // Admin Disputes
  adminDisputes: '/api/admin/disputes',
  adminDispute: (id) => `/api/admin/disputes/${id}`,
  adminDisputeResolve: (id) => `/api/admin/disputes/${id}/resolve`,
  
  // Admin Moderation
  adminEquipments: '/api/admin/equipments',
  adminEquipmentTakedown: (id) => `/api/admin/equipments/${id}/takedown`,
  adminEquipmentRestore: (id) => `/api/admin/equipments/${id}/restore`,
  adminReviews: '/api/admin/reviews',
  adminReviewDelete: (id) => `/api/admin/reviews/${id}/delete`
}

/**
 * HTTP request helper dengan token admin otomatis.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token')
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }
  
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, { ...options, headers })
  
  const data = await response.json().catch(() => ({}))
  
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Request gagal')
    error.code = data?.error?.code
    error.status = response.status
    throw error
  }
  
  return data
}

export { API_BASE_URL }
