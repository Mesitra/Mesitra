/**
 * Unified Settlement & Platform Fee Calculator
 * Single authoritative source for financial distribution logic
 */

export const PLATFORM_FEE_RATE = 0.05

/**
 * Calculate settlement distribution for a completed/resolved order.
 * Uses stored Order.platformFee / netOwnerPayout if already settled.
 * 
 * @param {object} order - Order record with rentalCost, shippingCost, addonsCost, damageFee, depositAmount
 * @returns {object} { platformFee, netOwnerPayout, depositRefund, ownerPayout, renterRefund }
 */
export function calculateSettlement(order) {
  const rental = order.rentalCost || 0
  const shipping = order.shippingCost || 0
  const addons = order.addonsCost || 0
  const damage = order.damageFee || 0
  const deposit = order.depositAmount || 0

  // If already settled, use stored values
  if (order.platformFee > 0 && order.netOwnerPayout > 0) {
    return {
      platformFee: order.platformFee,
      netOwnerPayout: order.netOwnerPayout,
      depositRefund: Math.max(0, deposit - damage),
      ownerPayout: order.netOwnerPayout,
      renterRefund: Math.max(0, deposit - damage)
    }
  }

  // Fresh calculation
  const platformFee = calculatePlatformFee(rental)
  const netRentalIncome = Math.max(0, rental - platformFee)
  const ownerPayout = netRentalIncome + shipping + addons + damage
  const renterRefund = Math.max(0, deposit - damage)

  return {
    platformFee,
    netOwnerPayout: ownerPayout,
    depositRefund: renterRefund,
    ownerPayout,
    renterRefund
  }
}

/**
 * Calculate platform fee: 5% from net rental income.
 * 
 * @param {number} rentalCost - Base rental cost
 * @returns {number} Platform fee amount (rounded)
 */
export function calculatePlatformFee(rentalCost) {
  return Math.round((rentalCost || 0) * PLATFORM_FEE_RATE)
}
