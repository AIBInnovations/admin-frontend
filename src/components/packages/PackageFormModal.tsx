import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Package, PackageFormData } from '@/services/packages.service'

interface PackageFormModalProps {
  open: boolean
  onClose: () => void
  /** The editor page saves by itself; kept so existing callers compile. */
  onSubmit?: (data: PackageFormData) => Promise<void>
  pkg?: Package | null
  mode: 'create' | 'edit'
  defaultSubjectId?: string
}

/**
 * The package form is a page now (PackageEditorPage). This keeps callers that
 * still "open" it working: opening goes to the page.
 */
export function PackageFormModal({ open, onClose, pkg, mode, defaultSubjectId }: PackageFormModalProps) {
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    onClose()
    navigate(mode === 'edit' && pkg ? `/content/packages/${pkg._id}/edit` : `/content/packages/new${defaultSubjectId ? `?subject=${defaultSubjectId}` : ''}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return null
}
