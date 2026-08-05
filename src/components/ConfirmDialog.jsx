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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#161619] p-6 text-stone-300 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg ${danger ? 'bg-red-500/10 text-red-400' : 'bg-white/[.05] text-stone-300'}`}>
              <AlertTriangle size={16} />
            </span>
            <h3 className="font-display text-base text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-white/[.05] hover:text-white disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        {message && <p className="mt-4 text-[12px] leading-5 text-stone-400">{message}</p>}

        <div className="mt-6 flex justify-end gap-2.5 border-t border-white/[.08] pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2.5 text-[12px] font-semibold text-stone-400 hover:bg-white/[.05] hover:text-white disabled:opacity-40">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[12px] font-bold disabled:opacity-60 ${danger ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}>
            {loading && <LoaderCircle size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
