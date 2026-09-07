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
  createCattleBatch,
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
  { value: 'DESCONOCIDO', label: 'DESCONOCIDO: Sin registro de estado', fullText: '-' },
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
    const matchesPaddock =
      !filterPaddockId ||
      (filterPaddockId === 'unassigned'
        ? animal.paddockId == null
        : String(animal.paddockId) === filterPaddockId);
    const matchesStatus = !filterStatus || animal.status === filterStatus;
    return matchesQuery && matchesCategory && matchesPaddock && matchesStatus;
  });

  async function reloadAll() {
    await Promise.all([reloadCattle(), reloadPaddocks()]);
  }

  async function handleAddCustomCattle({ paddockId: targetPaddockId, animals }) {
    setMutating(true);
    setActionError('');
    let createdCount = 0;
    try {
      if (targetPaddockId) {
        await createCattleBatch(targetPaddockId, animals);
        createdCount = animals.length;
      } else {
        for (const payload of animals) {
          await createCattleForEstancia(estanciaId, payload);
          createdCount += 1;
        }
      }
      await reloadAll();
      setIsModalOpen(false);
    } catch (err) {
      if (createdCount > 0) await reloadAll().catch(() => {});
      const message = createdCount > 0
        ? `Se registraron ${createdCount} ${createdCount === 1 ? 'animal' : 'animales'}, pero el lote quedó incompleto. Revisá el rodeo antes de reintentar.`
        : err.message || 'No se pudo agregar el ganado.';
      setActionError(message);
      throw new Error(message, { cause: err });
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
    const filteredIds = filtered.map((animal) => animal.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (allFilteredSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...filteredIds])]);
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
    <div className="app-page min-h-full text-sm">
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

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Todo el ganado</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Registro individual de animales del establecimiento.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={mutating}
          className="app-button-primary w-full disabled:opacity-50 sm:w-auto">
          <Plus size={16} aria-hidden="true" /> Agregar ganado
        </button>
      </header>

      {actionError && (
        <p className="app-error mt-4" role="alert">
          {actionError}
        </p>
      )}
      {cattleError && (
        <p className="app-error mt-4" role="alert">
          {cattleError}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <label className="relative flex max-w-xl flex-1 items-center">
            <Search size={14} className="pointer-events-none absolute left-3 text-[var(--text-muted)]" aria-hidden="true" />
            <span className="sr-only">Buscar ganado</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar caravana..."
              className="app-field pl-9"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            aria-label="Mostrar filtros de ganado"
            aria-expanded={showFilterPanel}
            className={`app-icon-button relative shrink-0 ${
              showFilterPanel || hasActiveFilters
                ? 'border-brand-400/40 bg-brand-500/10 text-brand-400'
                : 'border-[var(--border)] bg-forest-900 text-[var(--text-soft)] hover:text-[var(--text)]'
            }`}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-brand-400" />
            )}
          </button>
        </div>

        {showFilterPanel && (
          <div className="app-panel-muted grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="cattle-filter-category" className="app-label">Categoría</label>
              <select
                id="cattle-filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="app-field">
                <option value="">Todas las categorías</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cattle-filter-paddock" className="app-label">Potrero</label>
              <select
                id="cattle-filter-paddock"
                value={filterPaddockId}
                onChange={(e) => setFilterPaddockId(e.target.value)}
                className="app-field">
                <option value="">Todos los potreros</option>
                <option value="unassigned">Sin asignar</option>
                {paddocks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cattle-filter-status" className="app-label">Estado reproductivo</label>
              <select
                id="cattle-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="app-field">
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
                className="app-button-ghost mt-auto self-end">
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="app-panel-muted flex flex-wrap items-center gap-2.5 p-3" aria-label="Acciones masivas">
            <span className="text-xs font-semibold text-brand-400">
              {selectedIds.length} seleccionados
            </span>
            <select
              aria-label="Nueva categoría para la selección"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              disabled={mutating}
              className="app-field min-w-48 flex-1 sm:flex-none">
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
              className="app-button-primary disabled:opacity-50">
              Aplicar
            </button>
            <button
              onClick={() => navigate('/traslado', { state: { animalIds: selectedIds } })}
              disabled={mutating}
              className="app-button-secondary disabled:opacity-50"
              aria-label={`Trasladar ${selectedIds.length} animales seleccionados`}>
              <ArrowLeftRight size={13} /> Trasladar
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={mutating}
              className="flex min-h-11 items-center gap-1 rounded border border-danger-400/30 bg-danger-400/20 px-3 py-1.5 text-xs font-bold text-danger-400 hover:bg-danger-400/30 disabled:opacity-50"
              aria-label={`Eliminar ${selectedIds.length} animales seleccionados`}>
              <Trash2 size={13} /> Eliminar seleccionados
            </button>
            <button
              onClick={() => setSelectedIds([])}
              disabled={mutating}
              className="app-button-ghost text-xs">
              Limpiar
            </button>
          </div>
        )}
      </div>

      <section className="app-panel mt-4 overflow-hidden" aria-busy={loading}>
        {loading ? (
          <div className="app-empty flex gap-2" role="status">
            <LoaderCircle size={16} className="animate-spin" /> Cargando ganado...
          </div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} aria-label="Tabla de ganado; desplazable horizontalmente en pantallas pequeñas">
            <table className="w-full text-left md:min-w-[800px]">
              <caption className="sr-only">Ganado filtrado y acciones por animal</caption>
              <thead className="max-md:sr-only">
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-soft)]">
                  <th className="px-5 py-3.5 w-10">
                    <label className="inline-flex size-11 items-center justify-center">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos los animales filtrados"
                        checked={filtered.length > 0 && filtered.every((animal) => selectedIds.includes(animal.id))}
                        onChange={handleSelectAll}
                        className="size-5 rounded border-[var(--border-strong)] bg-forest-950 text-brand-500 focus:ring-[var(--focus)]"
                      />
                    </label>
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Caravana</th>
                  <th className="px-4 py-3.5 font-semibold">Categoría</th>
                  <th className="px-4 py-3.5 font-semibold">Peso Vivo</th>
                  <th className="px-4 py-3.5 font-semibold">
                    Condición Corporal{' '}
                    <span className="font-normal lowercase text-[var(--text-muted)]">(1 al 5)</span>
                  </th>
                  <th className="px-5 py-3.5 font-semibold">Estado</th>
                  <th className="px-4 py-3.5 font-semibold">Potrero</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100/[.05] max-md:block max-md:divide-y-0 max-md:space-y-2 max-md:p-2">
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
                      className={`text-[13.5px] text-[var(--text-soft)] transition-colors max-md:grid max-md:grid-cols-[2.75rem_minmax(0,1fr)_auto] max-md:items-center max-md:gap-y-3 max-md:rounded-xl max-md:border max-md:border-[var(--border)] max-md:p-4 ${isSelected ? 'bg-brand-500/[.12]' : 'max-md:bg-[var(--surface-muted)]'}`}>
                      <td className="w-10 px-5 py-4 max-md:p-0">
                        <label className="inline-flex size-11 items-center justify-center">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar animal ${animal.caravana}`}
                            checked={isSelected}
                            onChange={() => handleSelectRow(animal.id)}
                            className="size-5 rounded border-[var(--border-strong)] bg-forest-950 text-brand-500 focus:ring-[var(--focus)]"
                          />
                        </label>
                      </td>
                      <td className="px-5 py-4 max-md:p-0">
                        <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--text)]">
                          <Beef size={15} className="text-[var(--text-soft)]" />
                          {animal.caravana}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-md:col-span-3 max-md:grid max-md:grid-cols-[8rem_minmax(0,1fr)] max-md:items-center max-md:border-t max-md:border-[var(--border)] max-md:px-0 max-md:pb-0 max-md:pt-3">
                        <span className="hidden text-xs font-semibold text-[var(--text-muted)] max-md:block">Categoría</span>
                        {isEditing ? (
                          <select
                            value={category}
                            onChange={(e) => handleCategoryChangeInEdit(e.target.value)}
                            className="app-field min-h-11 px-2 py-1 text-[13px]">
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
                      <td className="px-4 py-4 max-md:col-span-3 max-md:grid max-md:grid-cols-[8rem_minmax(0,1fr)] max-md:items-center max-md:px-0 max-md:py-0">
                        <span className="hidden text-xs font-semibold text-[var(--text-muted)] max-md:block">Peso vivo</span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Ej: 380"
                            className="app-field min-h-11 px-2 py-1 text-[13px]"
                          />
                        ) : (
                          animal.weight
                        )}
                      </td>
                      <td className="px-4 py-4 max-md:col-span-3 max-md:grid max-md:grid-cols-[8rem_minmax(0,1fr)] max-md:items-center max-md:px-0 max-md:py-0">
                        <span className="hidden text-xs font-semibold text-[var(--text-muted)] max-md:block">Condición corporal</span>
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
                              className="app-field min-h-11 px-2 py-1 text-[13px]"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-[var(--text-muted)]">N/A</span>
                          )
                        ) : (
                          animal.cc
                        )}
                      </td>
                      <td className="px-5 py-4 max-md:col-span-3 max-md:grid max-md:grid-cols-[8rem_minmax(0,1fr)] max-md:items-center max-md:px-0 max-md:py-0">
                        <span className="hidden text-xs font-semibold text-[var(--text-muted)] max-md:block">Estado</span>
                        {isEditing ? (
                          category === 'VACA' ? (
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value)}
                              className="app-field min-h-11 px-2 py-1 text-xs">
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs font-semibold text-[var(--text-muted)]">N/A</span>
                          )
                        ) : (
                          <span
                            title={currentStatusOption ? currentStatusOption.label : animal.status}
                            className="rounded-full bg-sand-100/[.06] px-3 py-1 text-xs font-semibold text-[var(--text)]">
                            {currentStatusOption?.fullText || animal.status || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 max-md:col-span-3 max-md:grid max-md:grid-cols-[8rem_minmax(0,1fr)] max-md:items-center max-md:px-0 max-md:py-0">
                        <span className="hidden text-xs font-semibold text-[var(--text-muted)] max-md:block">Potrero</span>
                        {isEditing ? (
                          <select
                            value={paddockId}
                            onChange={(e) => setPaddockId(e.target.value)}
                            className="app-field min-h-11 px-2 py-1 text-[13px]">
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
                      <td className="px-4 py-4 text-right max-md:col-start-3 max-md:row-start-1 max-md:p-0">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSave(animal.id)}
                              disabled={mutating}
                              className="grid size-11 place-items-center rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 disabled:opacity-50"
                              aria-label={`Guardar cambios de ${animal.caravana}`}>
                              {mutating ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={mutating}
                              className="grid size-11 place-items-center rounded bg-danger-400/10 text-danger-400 hover:bg-danger-400/20 disabled:opacity-50"
                              aria-label={`Cancelar edición de ${animal.caravana}`}>
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(animal)}
                              disabled={mutating}
                              className="grid size-11 place-items-center rounded bg-sand-100/[.04] text-[var(--text-soft)] hover:bg-sand-100/[.08] hover:text-[var(--text)] disabled:opacity-50"
                              aria-label={`Editar animal ${animal.caravana}`}>
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteOne(animal.id)}
                              disabled={mutating}
                              className="grid size-11 place-items-center rounded bg-danger-400/10 text-danger-400 hover:bg-danger-400/20 disabled:opacity-50"
                              aria-label={`Eliminar animal ${animal.caravana}`}>
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
          <div className="app-empty">
            <div>
              <Beef size={24} className="mx-auto mb-2" aria-hidden="true" />
              <p className="font-semibold text-[var(--text-soft)]">
                {cattle.length === 0 ? 'Todavía no hay ganado registrado.' : 'No hay animales que coincidan con la búsqueda.'}
              </p>
              {cattle.length > 0 && <p className="mt-1 text-xs">Probá cambiando la búsqueda o limpiando los filtros.</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
