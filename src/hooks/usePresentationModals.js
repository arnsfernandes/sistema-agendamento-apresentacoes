import { useState, useCallback } from 'react'

export default function usePresentationModals() {
  const [showAddPresentationModal, setShowAddPresentationModal] = useState(false)
  const [showEditPresentationModal, setShowEditPresentationModal] = useState(false)
  const [presentationModalInitialDate, setPresentationModalInitialDate] = useState('')

  const openPresentationModal = useCallback((initialDate = '') => {
    setPresentationModalInitialDate(initialDate)
    setShowAddPresentationModal(true)
  }, [])

  const closePresentationModal = useCallback(() => {
    setShowAddPresentationModal(false)
    setPresentationModalInitialDate('')
  }, [])

  const openEditPresentationModal = useCallback(() => {
    setShowEditPresentationModal(true)
  }, [])

  const closeEditPresentationModal = useCallback(() => {
    setShowEditPresentationModal(false)
  }, [])

  return {
    showAddPresentationModal,
    setShowAddPresentationModal,
    showEditPresentationModal,
    setShowEditPresentationModal,
    presentationModalInitialDate,
    openPresentationModal,
    closePresentationModal,
    openEditPresentationModal,
    closeEditPresentationModal
  }
}
