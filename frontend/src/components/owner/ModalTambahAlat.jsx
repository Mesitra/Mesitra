import React from 'react'
import EquipmentFormModal from './EquipmentFormModal'

/**
 * Wrapper ModalTambahAlat yang mendelegasikan implementasi ke EquipmentFormModal.
 */
export default function ModalTambahAlat({ isOpen, onClose, onSubmit }) {
  return (
    <EquipmentFormModal
      isOpen={isOpen}
      onClose={onClose}
      mode="create"
      onSubmit={onSubmit}
    />
  )
}
