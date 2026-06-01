import { useEffect, useMemo, useState } from 'react';

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

function emptyRow() {
  return {
    key: Math.random().toString(36).slice(2),
    label: '',
    amount: '',
    rtr_id: '',
    sct_id: '',
    notes: '',
  };
}

function rowFromItem(item) {
  return {
    key: String(item.bfi_id),
    label: item.bfi_label ?? '',
    amount: item.bfi_amount != null ? String(item.bfi_amount) : '',
    rtr_id: item.rtr_id ? String(item.rtr_id) : '',
    sct_id: item.sct_id ? String(item.sct_id) : '',
    notes: item.bfi_notes ?? '',
  };
}

export default function FixedItemsList({
  kind,
  items,
  recurring,
  subcategories,
  typeId,
  saving,
  onSave,
}) {
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (items && items.length > 0) {
      setRows(items.map(rowFromItem));
    } else {
      setRows([]);
    }
    setDirty(false);
  }, [items]);

  const filteredRecurring = useMemo(
    () => (recurring ?? []).filter((r) => Number(r.ty_id) === Number(typeId)),
    [recurring, typeId]
  );

  const filteredSubcategories = useMemo(
    () => (subcategories ?? []).filter((s) => s.category?.ct_name !== 'Transferencias'),
    [subcategories]
  );

  function update(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setDirty(true);
  }

  function handleRecurringSelect(key, rtrId) {
    if (!rtrId) {
      update(key, 'rtr_id', '');
      return;
    }
    const rtr = filteredRecurring.find((r) => String(r.rtr_id) === String(rtrId));
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              rtr_id: String(rtrId),
              label: r.label || rtr?.rtr_name || '',
              amount: r.amount || (rtr?.rtr_estimated_amount != null ? String(rtr.rtr_estimated_amount) : ''),
            }
          : r
      )
    );
    setDirty(true);
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
    setDirty(true);
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setDirty(true);
  }

  // Cargar desde recurrentes: añade ítems para los recurrentes activos que no estén ya en la lista
  function loadFromRecurring() {
    const existingRtrIds = new Set(rows.map((r) => r.rtr_id).filter(Boolean));
    const newRows = filteredRecurring
      .filter((r) => !existingRtrIds.has(String(r.rtr_id)))
      .map((r) => ({
        key: Math.random().toString(36).slice(2),
        label: r.rtr_name || '',
        amount: r.rtr_estimated_amount != null ? String(r.rtr_estimated_amount) : '',
        rtr_id: String(r.rtr_id),
        sct_id: '',
        notes: '',
      }));
    if (newRows.length === 0) return;
    setRows((prev) => [...prev, ...newRows]);
    setDirty(true);
  }

  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
    [rows]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = rows
      .filter((r) => String(r.label).trim() !== '')
      .map((r) => ({
        label: r.label,
        amount: r.amount,
        rtr_id: r.rtr_id || null,
        sct_id: r.sct_id || null,
        notes: r.notes || null,
      }));
    await onSave(payload);
    setDirty(false);
  }

  const isIncome = kind === 'income';
  const accentClass = isIncome ? 'is-income' : 'is-expense';
  const noun = isIncome ? 'ingresos' : 'gastos';
  const example = isIncome ? 'Salario, Renta, …' : 'Internet, Renta, Préstamo…';

  return (
    <form className={`form fixed-form ${accentClass}`} onSubmit={handleSubmit}>
      <header className="fixed-form-head">
        <div>
          <small>Total {noun} fijos</small>
          <strong className={isIncome ? 'is-positive' : 'is-negative'}>
            {formatCurrency(total)}
          </strong>
          <span className="fixed-form-count">{rows.length} ítem(s)</span>
        </div>

        <div className="fixed-form-actions">
          {filteredRecurring.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={loadFromRecurring}
              disabled={saving}
              title={`Importa ${filteredRecurring.length} recurrente(s) activos`}
            >
              ⤵ Cargar desde recurrentes
            </button>
          )}
          <button type="button" className="secondary-button" onClick={addRow} disabled={saving}>
            + Agregar
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="fixed-empty">
          <p>Aún no has agregado {noun} fijos.</p>
          <small>Ejemplos: {example}</small>
          <div className="fixed-empty-actions">
            <button type="button" className="secondary-button" onClick={addRow} disabled={saving}>
              + Crear el primero
            </button>
            {filteredRecurring.length > 0 && (
              <button type="button" className="secondary-button" onClick={loadFromRecurring} disabled={saving}>
                ⤵ Importar desde recurrentes
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed-list">
          {rows.map((row, idx) => {
            const linked = filteredRecurring.find((r) => String(r.rtr_id) === String(row.rtr_id));
            return (
              <div key={row.key} className={`fixed-item ${accentClass}`}>
                <div className="fixed-item-line-main">
                  <div className="fixed-item-label-wrap">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => update(row.key, 'label', e.target.value)}
                      placeholder={isIncome ? `Ítem ${idx + 1} (ej: Salario)` : `Ítem ${idx + 1} (ej: Internet)`}
                      disabled={saving}
                      className="fixed-item-label"
                    />
                    {linked && (
                      <span className="fixed-item-tag" title={`Vinculado a recurrente: ${linked.rtr_name}`}>
                        🔁 {linked.frequency?.fr_name || 'Recurrente'}
                      </span>
                    )}
                  </div>

                  <div className="amount-input-wrap fixed-item-amount">
                    <span className="currency-prefix">$</span>
                    <input
                      type="number"
                      value={row.amount}
                      onChange={(e) => update(row.key, 'amount', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      disabled={saving}
                      className="amount-number-input"
                    />
                  </div>

                  <button
                    type="button"
                    className="fixed-item-remove"
                    onClick={() => removeRow(row.key)}
                    disabled={saving}
                    title="Eliminar ítem"
                  >
                    ✕
                  </button>
                </div>

                <div className="fixed-item-line-meta">
                  <select
                    value={row.rtr_id}
                    onChange={(e) => handleRecurringSelect(row.key, e.target.value)}
                    disabled={saving || filteredRecurring.length === 0}
                    className="fixed-item-select"
                    title="Vincular a recurrente"
                  >
                    <option value="">
                      {filteredRecurring.length === 0
                        ? 'Sin recurrentes disponibles'
                        : '— Sin vincular —'}
                    </option>
                    {filteredRecurring.map((r) => (
                      <option key={r.rtr_id} value={r.rtr_id}>
                        🔁 {r.rtr_name}
                        {r.frequency?.fr_name ? ` · ${r.frequency.fr_name}` : ''}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.sct_id}
                    onChange={(e) => update(row.key, 'sct_id', e.target.value)}
                    disabled={saving}
                    className="fixed-item-select"
                    title="Subcategoría"
                  >
                    <option value="">— Sin categoría —</option>
                    {filteredSubcategories.map((s) => (
                      <option key={s.sct_id} value={s.sct_id}>
                        {s.category?.ct_name ? `${s.category.ct_name} · ` : ''}{s.sct_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <div className="form-actions fixed-form-submit">
          <small className={dirty ? 'dirty-tag' : 'saved-tag'}>
            {dirty ? '● Cambios sin guardar' : '✓ Guardado'}
          </small>
          <button type="submit" disabled={saving || !dirty}>
            {saving ? 'Guardando...' : `Guardar ${noun} fijos`}
          </button>
        </div>
      )}
    </form>
  );
}
