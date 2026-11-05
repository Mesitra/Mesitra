import React from 'react'
import EquipmentFormModal from './EquipmentFormModal'

/**
 * Wrapper ModalKelolaAlat yang mendelegasikan implementasi ke EquipmentFormModal.
 */
export default function ModalKelolaAlat({
  isOpen,
  equipment,
  onClose,
  onUpdate,
  onDelete
}) {
  return (
    <EquipmentFormModal
      isOpen={isOpen}
      equipment={equipment}
      mode="edit"
      onClose={onClose}
      onSubmit={onUpdate ? (data) => onUpdate(equipment?.id, data) : undefined}
      onDelete={onDelete}
    />
  )
}
