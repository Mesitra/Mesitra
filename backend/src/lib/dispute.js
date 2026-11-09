/**
 * Dispute Ticket Creation & Management
 * Ensures unique ticket numbers and upserts to prevent duplicates
 */

import { prisma } from './prisma.js'

/**
 * Generate unique dispute ticket number: DSP-YYMMDD-XXXX
 */
export function generateTicketNumber() {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 9000) + 1000)
  return `DSP-${yy}${mm}${dd}-${seq}`
}

/**
 * Ensure dispute ticket exists for an order.
 * Upserts ticket to prevent duplicates (orderId is unique constraint).
 * 
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - Prisma transaction client
 * @param {object} order - Order record with equipment relation (must include equipment.ownerId)
 * @param {object} params - { claimAmount, disputeReason, ownerPhotos, initiatedById, initiatedByRole }
 * @returns {Promise<object>} DisputeTicket record
 */
export async function ensureDisputeTicket(tx, order, params) {
  const {
    claimAmount = 0,
    disputeReason = '',
    ownerPhotos = null,
    initiatedById = null,
    initiatedByRole = null
  } = params

  // Check if ticket already exists
  const existing = await tx.disputeTicket.findUnique({
    where: { orderId: order.id }
  })

  if (existing) {
    return existing
  }

  // Ensure we have equipment.ownerId
  const ownerId = order.equipment?.ownerId || order.equipmentId
  if (!ownerId) {
    throw new Error('Cannot create dispute ticket: equipment.ownerId is missing. Ensure order includes equipment relation.')
  }

  // Create new ticket
  return tx.disputeTicket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      orderId: order.id,
      renterId: order.userId,
      ownerId,
      claimAmount,
      disputeReason,
      ownerPhotos,
      initiatedById,
      initiatedByRole,
      status: 'OPEN'
    }
  })
}
