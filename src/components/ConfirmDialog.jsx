import { useEffect, useId, useRef } from 'react'
import { AlertTriangle, LoaderCircle, X } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const loadingRef = useRef(loading)
  const onCancelRef = useRef(onCancel)
  const titleId = useId()
  const descriptionId = useId()
  loadingRef.current = loading
  onCancelRef.current = onCancel

  useEffect(() => {
    if (!isOpen) return undefined

    const previouslyFocused = document.activeElement
    cancelRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loadingRef.current) {
        event.preventDefault()
        onCancelRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descriptionId : undefined}
        className="app-panel w-full max-w-sm p-6 text-sand-200 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${danger ? 'bg-danger-400/10 text-danger-400' : 'bg-brand-500/15 text-brand-400'}`}>
              <AlertTriangle size={17} aria-hidden="true" />
            </span>
            <h2 id={titleId} className="text-base font-bold text-sand-100">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar diálogo"
            onClick={onCancel}
            disabled={loading}
            className="app-icon-button !min-h-9 !w-9 disabled:opacity-40">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {message && <p id={descriptionId} className="mt-4 text-sm leading-6 text-sand-300">{message}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-sand-100/10 pt-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="app-button-secondary disabled:opacity-40">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`app-button-primary disabled:opacity-60 ${danger ? '!border-danger-400/40 !bg-danger-400 !text-forest-950' : ''}`}>
            {loading && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
