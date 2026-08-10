import { Beef, Search, SlidersHorizontal, Pencil, Check, X, Plus, Trash2, LoaderCircle, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCattle from '../hooks/useCattle.js';
import usePaddocks from '../hooks/usePaddocks.js';
import { useAuth } from '../context/AuthContext.jsx';
import AddCattleModal from '../components/AddCattleModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  CATEGORY_OPTIONS,
  CATEGORY_UI_TO_API,
  buildCattlePatchPayload,
  parseWeightKg,
  withAnimalCounts,
} from '../services/mappers.js';
import {
  assignCattle,
  bulkDeleteCattle,
  bulkUpdateCategory,
  createCattleForEstancia,
  createCattleForPaddock,
  deleteCattle,
  relocateCattle,
  updateCattle,
} from '../services/cattleService.js';
import { ApiError } from '../services/api.js';

const STATUS_OPTIONS = [
  { value: 'L', label: 'L: Lactando (produciendo leche)', fullText: 'Lactando' },
  { value: 'P', label: 'P: Preñada / Gestante', fullText: 'Preñada' },
  { value: 'B', label: 'B: Seca / Vacía', fullText: 'Seca' },
  { value: 'N', label: 'N: Normal / No gestante ni lactante', fullText: 'Normal' },
  { value: 'P/L', label: 'P/L: Preñada y Lactando simultáneamente', fullText: 'Preñada y Lactando' },
  { value: 'B/L', label: 'B/L: Seca y Lactando (o transiciones)', fullText: 'Seca y Lactando' },
  { value: 'N/P', label: 'N/P: No lactante y Preñada', fullText: 'Preñada (no lactante)' },
  { value: 'DESCONOCIDO', label: 'DESCONOCIDO: Sin registro de estado', fullText: 'Desconocido' },
];

export default function CattlePage() {
  const navigate = useNavigate();
  const { estanciaId } = useAuth();
  const { cattle, loading: cattleLoading, error: cattleError, reload: reloadCattle } = useCattle(estanciaId);
  const { paddocks, loading: paddocksLoading, reload: reloadPaddocks } = usePaddocks(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);

  const [query, setQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaddockId, setFilterPaddockId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingOriginal, setEditingOriginal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState('');

  // Edit form state
  const [category, setCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [cc, setCc] = useState('');
  const [status, setStatus] = useState('');
  const [paddockId, setPaddockId] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');

  // Confirm dialogs
  const [confirmDelete, setConfirmDelete] = useState(null); // { id } | null
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const loading = cattleLoading || paddocksLoading;

  const hasActiveFilters = Boolean(filterCategory || filterPaddockId || filterStatus);

  const filtered = cattle.filter((animal) => {
    const matchesQuery = !query || Object.values(animal).some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
    const matchesCategory = !filterCategory || (CATEGORY_UI_TO_API[animal.category] ?? animal.category) === filterCategory;
    const matchesPaddock = !filterPaddockId || (filterPaddockId === 'unassigned' ? !animal.paddockId : animal.paddockId === filterPaddockId);
    const matchesStatus = !filterStatus || animal.status === filterStatus;
    return matchesQuery && matchesCategory && matchesPaddock && matchesStatus;
  });

  async function reloadAll() {
    await Promise.all([reloadCattle(), reloadPaddocks()]);
  }

  async function handleAddCustomCattle({ paddockId: targetPaddockId, animals }) {
    setMutating(true);
    setActionError('');
    try {
      for (const payload of animals) {
        if (targetPaddockId) {
          await createCattleForPaddock(targetPaddockId, payload);
        } else {
          await createCattleForEstancia(estanciaId, payload);
        }
      }
      await reloadAll();
    } catch (err) {
      setActionError(err.message || 'No se pudo agregar el ganado.');
    } finally {
      setMutating(false);
    }
  }

  function startEdit(animal) {
    setEditingId(animal.id);
    setEditingOriginal(animal);
    setCategory(CATEGORY_UI_TO_API[animal.category] ?? animal.category);
    setWeight(animal.weight === '-' ? '' : String(parseWeightKg(animal.weight) ?? ''));
    setCc(animal.cc === '-' ? '' : String(animal.cc));
    setStatus(animal.status);
    setPaddockId(animal.paddockId != null ? String(animal.paddockId) : '');
    setActionError('');
  }

  function handleCategoryChangeInEdit(newCategory) {
    setCategory(newCategory);
    if (newCategory !== 'VACA') {
      setCc('');
      setStatus('DESCONOCIDO');
    } else if (status === 'DESCONOCIDO') {
      setStatus('N');
    }
  }

  function handleCancel() {
    setEditingId(null);
    setEditingOriginal(null);
  }

  async function handleSave(id) {
    if (!editingOriginal) return;
    setMutating(true);
    setActionError('');
    try {
      const originalCategoryApi = CATEGORY_UI_TO_API[editingOriginal.category] ?? editingOriginal.category;
      const originalWeight = parseWeightKg(editingOriginal.weight);
      const originalCc = editingOriginal.cc === '-' ? '' : String(editingOriginal.cc);
      const isVaca = category === 'VACA';

      const attributesChanged =
        category !== originalCategoryApi ||
        parseWeightKg(weight) !== originalWeight ||
        (isVaca && (cc !== originalCc || status !== editingOriginal.status));

      const newPaddockId = paddockId ? Number(paddockId) : null;
      const originalPaddockId = editingOriginal.paddockId ?? null;

      if (newPaddockId !== originalPaddockId && newPaddockId !== null) {
        if (originalPaddockId === null) {
          await assignCattle({ id_potrero: newPaddockId, id_ganado: [id] });
        } else {
          await relocateCattle(originalPaddockId, {
            id_potrero_destino: newPaddockId,
            id_ganado: [id],
            fecha_movimiento: new Date().toISOString(),
          });
        }
      }

      if (attributesChanged) {
        await updateCattle(
          id,
          buildCattlePatchPayload({ category, weight, cc: isVaca ? cc : '', status: isVaca ? status : 'DESCONOCIDO' })
        );
      }

      await reloadAll();
      setEditingId(null);
      setEditingOriginal(null);
    } catch (err) {
      setActionError(err.message || 'No se pudo guardar los cambios.');
    } finally {
      setMutating(false);
    }
  }

  function handleDeleteOne(id) {
    setConfirmDelete({ id });
  }

  async function confirmDeleteOne() {
    if (!confirmDelete) return;
    setMutating(true);
    setActionError('');
    try {
      await deleteCattle(confirmDelete.id);
      await reloadAll();
      setSelectedIds((prev) => prev.filter((item) => item !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setActionError(err.message || 'No se pudo eliminar el animal.');
    } finally {
      setMutating(false);
    }
  }

  async function confirmBulkDeleteAction() {
    setMutating(true);
    setActionError('');
    try {
      await bulkDeleteCattle(selectedIds);
      await reloadAll();
      setSelectedIds([]);
      setConfirmBulkDelete(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setActionError('No se pudo completar la baja masiva: algunos animales no existen. La operación se revirtió por completo.');
      } else {
        setActionError(err.message || 'No se pudo eliminar los animales seleccionados.');
      }
      setConfirmBulkDelete(false);
    } finally {
      setMutating(false);
    }
  }

  function handleSelectRow(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function handleSelectAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((animal) => animal.id));
    }
  }

  async function handleBulkCategoryApply() {
    if (!bulkCategory) return;
    setMutating(true);
    setActionError('');
    try {
      await bulkUpdateCategory(selectedIds.map((id) => ({ id_ganado: id, categoria: bulkCategory })));
      await reloadAll();
      setSelectedIds([]);
      setBulkCategory('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setActionError('No se pudo aplicar el cambio masivo: algunos animales no existen. La operación se revirtió por completo.');
      } else {
        setActionError(err.message || 'No se pudo cambiar la categoría de los animales seleccionados.');
      }
    } finally {
      setMutating(false);
    }
  }

  return (
    <div className="min-h-full px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <AddCattleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCustomCattle}
        paddocks={paddocksWithCounts}
        existingCaravanas={cattle.map((c) => c.caravana)}
        cattle={cattle}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Eliminar animal"
        message="¿Estás seguro de que querés eliminar este animal del rodeo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={mutating}
        onConfirm={confirmDeleteOne}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        title="Eliminar animales seleccionados"
        message={`¿Estás seguro de que querés eliminar los ${selectedIds.length} animales seleccionados? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={mutating}
        onConfirm={confirmBulkDeleteAction}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-stone-400">Rodeo</p>
          <h1 className="mt-1 font-display text-2xl text-white">Todo el ganado</h1>
          <p className="mt-1 text-[11px] text-stone-500 font-medium">
            Registro individual de animales del establecimiento.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={mutating}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-[11px] font-bold text-black hover:bg-emerald-400 shadow-lg disabled:opacity-50">
          <Plus size={15} /> Agregar Ganado
        </button>
      </header>

      {actionError && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-[11px] font-semibold text-red-400">
          {actionError}
        </p>
      )}
      {cattleError && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-[11px] font-semibold text-red-400">
          {cattleError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <label className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-white/[.07] bg-[#161619] px-3.5">
            <Search size={14} className="text-stone-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar caravana..."
              className="w-full bg-transparent py-3 text-[12px] text-white outline-none placeholder:text-stone-750"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className={`relative grid size-10 place-items-center rounded-lg border transition-colors ${
              showFilterPanel || hasActiveFilters
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-white/[.07] bg-[#161619] text-stone-400 hover:text-white'
            }`}
            title="Filtrar ganado">
            <SlidersHorizontal size={14} />
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {showFilterPanel && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/[.08] bg-[#161619] p-3.5 text-[11px] text-stone-300">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Categoría</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500">
                <option value="">Todas las categorías</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Potrero</label>
              <select
                value={filterPaddockId}
                onChange={(e) => setFilterPaddockId(e.target.value)}
                className="rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500">
                <option value="">Todos los potreros</option>
                <option value="unassigned">Sin asignar</option>
                {paddocks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Estado Reproductivo</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500">
                <option value="">Todos los estados</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterCategory('');
                  setFilterPaddockId('');
                  setFilterStatus('');
                }}
                className="mt-auto rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-[11px] font-semibold text-stone-400 hover:bg-white/[.08] hover:text-white">
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 px-3.5">
            <span className="text-[11px] text-emerald-400 font-semibold">
              {selectedIds.length} seleccionados
            </span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              disabled={mutating}
              className="rounded border border-white/[.08] bg-[#0b0b0c] px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-stone-500">
              <option value="">Cambiar Categoría...</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkCategoryApply}
              disabled={!bulkCategory || mutating}
              className="rounded bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-50">
              Aplicar
            </button>
            <button
              onClick={() => navigate('/traslado', { state: { animalIds: selectedIds } })}
              disabled={mutating}
              className="flex items-center gap-1 rounded bg-white/[.06] border border-white/[.08] px-3 py-1.5 text-[11px] font-bold text-stone-200 hover:bg-white/[.1] disabled:opacity-50"
              title="Trasladar seleccionados">
              <ArrowLeftRight size={13} /> Trasladar
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={mutating}
              className="flex items-center gap-1 rounded bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/30 disabled:opacity-50"
              title="Eliminar seleccionados">
              <Trash2 size={13} /> Eliminar seleccionados
            </button>
            <button
              onClick={() => setSelectedIds([])}
              disabled={mutating}
              className="text-[11px] text-stone-400 hover:text-white">
              Limpiar
            </button>
          </div>
        )}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-white/[.06] bg-[#161619]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-stone-500">
            <LoaderCircle size={16} className="animate-spin" /> Cargando ganado...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-white/[.06] text-[12px] uppercase tracking-wider text-stone-400">
                  <th className="px-5 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={handleSelectAll}
                      className="rounded border-white/[.1] bg-[#0b0b0c] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                    />
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Caravana</th>
                  <th className="px-4 py-3.5 font-semibold">Categoría</th>
                  <th className="px-4 py-3.5 font-semibold">Peso Vivo</th>
                  <th className="px-4 py-3.5 font-semibold">
                    Condición Corporal{' '}
                    <span className="text-stone-500 font-normal lowercase">(1 al 5)</span>
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-4 py-3.5 font-semibold">Potrero</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.05]">
                {filtered.map((animal) => {
                  const isEditing = animal.id === editingId;
                  const isSelected = selectedIds.includes(animal.id);
                  const currentStatusOption = STATUS_OPTIONS.find((opt) => opt.value === animal.status);
                  const paddockOptions = animal.paddockId == null
                    ? [{ id: '', name: 'Sin potrero' }, ...paddocksWithCounts]
                    : paddocksWithCounts;
                  return (
                    <tr
                      key={animal.id}
                      className={`text-[13.5px] transition ${isSelected ? 'bg-emerald-500/[0.02] text-stone-300' : 'text-stone-300'}`}>
                      <td className="px-5 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(animal.id)}
                          className="rounded border-white/[.1] bg-[#0b0b0c] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-2 font-bold text-white text-[14px]">
                          <Beef size={15} className="text-stone-400" />
                          {animal.caravana}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <select
                            value={category}
                            onChange={(e) => handleCategoryChangeInEdit(e.target.value)}
                            className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white text-[13px] outline-none focus:border-stone-500">
                            {CATEGORY_OPTIONS.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          animal.category
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Ej: 380"
                            className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white text-[13px] outline-none focus:border-stone-500"
                          />
                        ) : (
                          animal.weight
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isEditing ? (
                          category === 'VACA' ? (
                            <input
                              value={cc}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (Number(val) >= 1 && Number(val) <= 5)) {
                                  setCc(val);
                                }
                              }}
                              placeholder="1.0 - 5.0"
                              type="number"
                              min="1"
                              max="5"
                              step="0.1"
                              className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white text-[13px] outline-none focus:border-stone-500"
                            />
                          ) : (
                            <span className="text-stone-500 font-semibold text-[12px]">N/A</span>
                          )
                        ) : (
                          animal.cc
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          category === 'VACA' ? (
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value)}
                              className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white outline-none focus:border-stone-500 text-[12px]">
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-stone-500 font-semibold text-[12px]">N/A</span>
                          )
                        ) : (
                          <span
                            title={currentStatusOption ? currentStatusOption.label : animal.status}
                            className="rounded-full bg-white/[.06] px-3 py-1 text-[11.5px] font-semibold text-stone-200">
                            {currentStatusOption?.fullText || animal.status || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <select
                            value={paddockId}
                            onChange={(e) => setPaddockId(e.target.value)}
                            className="w-full rounded border border-white/[.08] bg-[#0b0b0c] px-2 py-1 text-white text-[13px] outline-none focus:border-stone-500">
                            {paddockOptions.map((p) => (
                              <option key={p.id} value={p.id}>
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
                              disabled={mutating}
                              className="grid size-7 place-items-center rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                              title="Guardar">
                              {mutating ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={mutating}
                              className="grid size-7 place-items-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                              title="Cancelar">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(animal)}
                              disabled={mutating}
                              className="grid size-7 place-items-center rounded bg-white/[.04] text-stone-400 hover:bg-white/[.08] hover:text-white disabled:opacity-50"
                              title="Editar">
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteOne(animal.id)}
                              disabled={mutating}
                              className="grid size-7 place-items-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                              title="Eliminar animal">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-12 text-center text-[12px] text-stone-500">
            No se encontraron animales.
          </p>
        )}
      </section>
    </div>
  );
}
