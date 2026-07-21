import { Beef, Search, SlidersHorizontal, Pencil, Check, X } from 'lucide-react'
import { useState } from 'react'
import useCattle from '../hooks/useCattle.js'
import usePaddocks from '../hooks/usePaddocks.js'

export default function CattlePage() {
  const { cattle, updateAnimal, updateCattle } = useCattle()
  const { paddocks } = usePaddocks()
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState(null)

  // State for form edits
  const [category, setCategory] = useState('')
  const [weight, setWeight] = useState('')
  const [cc, setCc] = useState('')
  const [status, setStatus] = useState('')
  const [paddock, setPaddock] = useState('')

  // State for bulk selection
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkCategory, setBulkCategory] = useState('')

  const CATEGORIES = ['Vaca', 'Vaquilla', 'Novillo', 'Toro', 'Ternero/Ternera']

  const STATUS_OPTIONS = [
    { value: 'L', label: 'L: Lactando (produciendo leche)' },
    { value: 'P', label: 'P: Preñada / Gestante' },
    { value: 'B', label: 'B: Seca / Vacía' },
    { value: 'N', label: 'N: Normal / No gestante ni lactante' },
    { value: 'P/L', label: 'P/L: Preñada y Lactando simultáneamente' },
    { value: 'B/L', label: 'B/L: Seca y Lactando (o transiciones)' },
    { value: 'N/P', label: 'N/P: No lactante y Preñada' },
    { value: 'DESCONOCIDO', label: 'DESCONOCIDO: Sin registro de estado' }
  ]

  const filtered = cattle.filter((animal) =>
    Object.values(animal).some((value) =>
      String(value).toLowerCase().includes(query.toLowerCase())
    )
  )

  function startEdit(animal) {
    setEditingId(animal.id)
    setCategory(CATEGORIES.includes(animal.category) ? animal.category : CATEGORIES[0])
    setWeight(animal.weight === '-' ? '' : animal.weight)
    setCc(animal.cc === '-' ? '' : animal.cc)
    setStatus(animal.status)
    setPaddock(animal.paddock)
  }

  function handleSave(id) {
    updateAnimal({
      id,
      category: category,
      weight: weight.trim() || '-',
      cc: cc.trim() || '-',
      status: status || 'DESCONOCIDO',
      paddock: paddock
    })
    setEditingId(null)
  }

  function handleCancel() {
    setEditingId(null)
  }

  function handleSelectRow(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((animal) => animal.id))
    }
  }

  function handleBulkCategoryApply() {
    if (!bulkCategory) return
    const updatedCattle = cattle.map((animal) => {
      if (selectedIds.includes(animal.id)) {
        return { ...animal, category: bulkCategory }
      }
      return animal
    })
    updateCattle(updatedCattle)
    setSelectedIds([])
    setBulkCategory('')
  }

  return (
    <div className="min-h-full px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <header><p className="text-[10px] font-bold uppercase tracking-[.22em] text-stone-400">Rodeo</p><h1 className="mt-1 font-display text-2xl text-white">Todo el ganado</h1><p className="mt-1 text-[11px] text-stone-500 font-medium">Registro individual de animales del establecimiento.</p></header>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <label className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-white/[.07] bg-[#161619] px-3.5"><Search size={14} className="text-stone-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar caravana..." className="w-full bg-transparent py-3 text-[12px] text-white outline-none placeholder:text-stone-750" /></label>
          <button className="grid size-10 place-items-center rounded-lg border border-white/[.07] bg-[#161619] text-stone-400"><SlidersHorizontal size={14} /></button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 px-3.5">
            <span className="text-[11px] text-emerald-400 font-semibold">{selectedIds.length} seleccionados</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="rounded border border-white/[.08] bg-[#0b0b0c] px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-stone-500"
            >
              <option value="">Cambiar Categoría...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={handleBulkCategoryApply}
              disabled={!bulkCategory}
              className="rounded bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              Aplicar
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-stone-400 hover:text-white"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-white/[.06] bg-[#161619]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-white/[.06] text-[10px] uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                    className="rounded border-white/[.1] bg-[#0b0b0c] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Caravana</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Peso Vivo</th>
                <th className="px-4 py-3 font-semibold">Condición Corporal <span className="text-stone-600 font-normal lowercase">(1 al 5)</span></th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Potrero</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.05]">
              {filtered.map((animal) => {
                const isEditing = animal.id === editingId
                const isSelected = selectedIds.includes(animal.id)
                const currentStatusOption = STATUS_OPTIONS.find(opt => opt.value === animal.status)
                return (
                  <tr key={animal.id} className={`text-[12px] transition ${isSelected ? 'bg-emerald-500/[0.02] text-stone-300' : 'text-stone-400'}`}>
                    <td className="px-5 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(animal.id)}
                        className="rounded border-white/[.1] bg-[#0b0b0c] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 font-bold text-stone-200">
                        <Beef size={14} className="text-stone-400" />
                        {animal.id}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white outline-none focus:border-stone-500"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      ) : (
                        animal.category
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="Ej: 380 kg"
                          className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white outline-none focus:border-stone-500"
                        />
                      ) : (
                        animal.weight
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          value={cc}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || (Number(val) >= 1 && Number(val) <= 5) || val === '-') {
                              setCc(val)
                            }
                          }}
                          placeholder="1.0 - 5.0"
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white outline-none focus:border-stone-500"
                        />
                      ) : (
                        animal.cc
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isEditing ? (
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white outline-none focus:border-stone-500 text-[11px]"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          title={currentStatusOption ? currentStatusOption.label : animal.status}
                          className="rounded-full bg-white/[.05] px-2.5 py-1 text-[10px] font-semibold text-stone-300 cursor-help"
                        >
                          {animal.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isEditing ? (
                        <select
                          value={paddock}
                          onChange={(e) => setPaddock(e.target.value)}
                          className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white outline-none focus:border-stone-500"
                        >
                          {paddocks.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        animal.paddock
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleSave(animal.id)}
                            className="grid size-7 place-items-center rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            title="Guardar"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="grid size-7 place-items-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Cancelar"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(animal)}
                          className="grid size-7 place-items-center rounded bg-white/[.04] text-stone-400 hover:bg-white/[.08] hover:text-white"
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-12 text-center text-[12px] text-stone-500">No se encontraron animales.</p>}
      </section>
      <p className="mt-3 text-[10px] text-stone-600">Gestión de datos de caravanas en memoria local (sincronizada con potreros).</p>
    </div>
  )
}
