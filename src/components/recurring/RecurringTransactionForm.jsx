import { useEffect, useMemo, useState } from 'react';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const WEEK_DAYS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const FREQ_INFO = {
  Diaria:    { icon: '📅', hint: 'Se generará una transacción cada día.' },
  Semanal:   { icon: '📅', hint: 'Se generará una transacción cada semana el día seleccionado.' },
  Quincenal: { icon: '📅', hint: 'Se generará una transacción cada 15 días desde la fecha de inicio.' },
  Mensual:   { icon: '📅', hint: 'Se generará el día indicado de cada mes.' },
  Anual:     { icon: '📅', hint: 'Se generará cada año en la misma fecha de inicio.' },
};

const emptyForm = {
  ac_id: '',
  ty_id: '',
  fr_id: '',
  fr_name: '',
  ct_id: '',
  sct_ids: [],
  rtr_name: '',
  rtr_description: '',
  rtr_estimated_amount: '',
  rtr_reference_day: '',
  rtr_start_date: getTodayDate(),
  rtr_finish_date: '',
  hasFinishDate: false,
};

function getActiveSubcategoryIds(recurringTransaction) {
  return (recurringTransaction?.recurrent_transaction_subcategory ?? [])
    .filter(r => r.rts_is_active)
    .map(r => String(r.sct_id));
}

export default function RecurringTransactionForm({
  accounts,
  typeTransactions,
  frequencies,
  subcategories,
  initialData,
  saving,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData);

  const selectedType = useMemo(
    () => typeTransactions.find(t => String(t.ty_id) === String(form.ty_id)),
    [typeTransactions, form.ty_id]
  );
  const isIncome = selectedType ? selectedType.ty_name?.toLowerCase() === 'entrada' : null;

  const categories = useMemo(() => {
    const map = new Map();
    subcategories.forEach(s => {
      const cat = s.category;
      if (cat?.ct_id) map.set(String(cat.ct_id), { ct_id: cat.ct_id, ct_name: cat.ct_name });
    });
    return Array.from(map.values()).sort((a, b) => a.ct_name.localeCompare(b.ct_name));
  }, [subcategories]);

  const filteredSubcategories = useMemo(
    () => subcategories.filter(s => String(s.ct_id) === String(form.ct_id)),
    [subcategories, form.ct_id]
  );

  const selectedFreq = useMemo(
    () => frequencies.find(f => String(f.fr_id) === String(form.fr_id)),
    [frequencies, form.fr_id]
  );

  const freqName = selectedFreq?.fr_name ?? '';
  const needsWeekDay  = freqName === 'Semanal';
  const needsMonthDay = freqName === 'Mensual';
  const freqInfo = FREQ_INFO[freqName];

  useEffect(() => {
    if (initialData) {
      const sctIds = getActiveSubcategoryIds(initialData);
      const freqObj = frequencies.find(f => String(f.fr_id) === String(initialData.fr_id));
      const freqN = freqObj?.fr_name ?? '';
      const finishDate = initialData.rtr_finish_date
        ? String(initialData.rtr_finish_date).slice(0, 10)
        : '';

      setForm({
        ac_id: initialData.ac_id ? String(initialData.ac_id) : '',
        ty_id: initialData.ty_id ? String(initialData.ty_id) : '',
        fr_id: initialData.fr_id ? String(initialData.fr_id) : '',
        fr_name: freqN,
        ct_id: '',
        sct_ids: sctIds,
        rtr_name: initialData.rtr_name ?? '',
        rtr_description: initialData.rtr_description ?? '',
        rtr_estimated_amount: String(initialData.rtr_estimated_amount ?? ''),
        rtr_reference_day: initialData.rtr_reference_day != null
          ? String(initialData.rtr_reference_day)
          : '',
        rtr_start_date: initialData.rtr_start_date
          ? String(initialData.rtr_start_date).slice(0, 10)
          : getTodayDate(),
        rtr_finish_date: finishDate,
        hasFinishDate: Boolean(finishDate),
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [initialData]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleFreqChange(e) {
    const id = e.target.value;
    const obj = frequencies.find(f => String(f.fr_id) === id);
    setForm(prev => ({
      ...prev,
      fr_id: id,
      fr_name: obj?.fr_name ?? '',
      rtr_reference_day: '',
    }));
  }

  function handleCategoryChange(e) {
    setForm(prev => ({ ...prev, ct_id: e.target.value, sct_ids: [] }));
  }

  function handleSubcategoryToggle(sctId) {
    const s = String(sctId);
    setForm(prev => ({
      ...prev,
      sct_ids: prev.sct_ids.includes(s)
        ? prev.sct_ids.filter(id => id !== s)
        : [...prev.sct_ids, s],
    }));
  }

  function handleTypeSelect(typeId) {
    setForm(prev => ({ ...prev, ty_id: String(typeId) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.ac_id) { setError('Selecciona una cuenta.'); return; }
    if (!form.ty_id) { setError('Selecciona Entrada o Salida.'); return; }
    if (!form.fr_id) { setError('Selecciona una frecuencia.'); return; }
    if (!form.rtr_name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.rtr_start_date) { setError('La fecha de inicio es obligatoria.'); return; }
    if (needsWeekDay && !form.rtr_reference_day) { setError('Selecciona el día de la semana.'); return; }
    if (needsMonthDay && !form.rtr_reference_day) { setError('Selecciona el día del mes.'); return; }
    if (form.sct_ids.length === 0) { setError('Selecciona al menos una subcategoría.'); return; }

    const amount = Number(form.rtr_estimated_amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError('El monto debe ser mayor a 0.'); return; }
    if (form.hasFinishDate && !form.rtr_finish_date) { setError('Especifica una fecha de fin.'); return; }

    const payload = {
      ac_id: form.ac_id,
      ty_id: form.ty_id,
      fr_id: form.fr_id,
      fr_name: freqName,
      rtr_name: form.rtr_name.trim(),
      rtr_description: form.rtr_description?.trim() || null,
      rtr_estimated_amount: amount,
      rtr_reference_day: form.rtr_reference_day !== '' ? Number(form.rtr_reference_day) : 1,
      rtr_start_date: form.rtr_start_date,
      rtr_finish_date: form.hasFinishDate ? form.rtr_finish_date : null,
      sct_ids: form.sct_ids.map(Number),
    };

    await onSubmit(payload);
    if (!isEditing) setForm(emptyForm);
  }

  return (
    <form className="form recurring-transaction-form" onSubmit={handleSubmit}>
      {error && <p className="error-message">{error}</p>}

      {/* Cuenta */}
      <label>
        <span className="label-row">
          Cuenta
          <span className="required-tag">Obligatorio</span>
        </span>
        <select name="ac_id" value={form.ac_id} onChange={handleChange} disabled={saving}>
          <option value="">Selecciona una cuenta</option>
          {accounts.map(acc => (
            <option key={acc.ac_id} value={acc.ac_id}>{acc.ac_name}</option>
          ))}
        </select>
      </label>

      {/* Tipo */}
      <div className="form-field">
        <span className="label-row">
          Tipo de movimiento
          <span className="required-tag">Obligatorio</span>
        </span>
        <div className="transaction-type-buttons">
          {typeTransactions.map(t => {
            const sel = String(t.ty_id) === String(form.ty_id);
            const isEntry = t.ty_name?.toLowerCase() === 'entrada';
            return (
              <button
                key={t.ty_id}
                type="button"
                className={`type-option-button ${sel ? (isEntry ? 'selected-income' : 'selected-expense') : 'unselected'}`}
                onClick={() => handleTypeSelect(t.ty_id)}
                disabled={saving}
              >
                <span className="type-btn-icon">{isEntry ? '↑' : '↓'}</span>
                {t.ty_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Frecuencia */}
      <label>
        <span className="label-row">
          Frecuencia
          <span className="required-tag">Obligatorio</span>
        </span>
        <select name="fr_id" value={form.fr_id} onChange={handleFreqChange} disabled={saving}>
          <option value="">Selecciona una frecuencia</option>
          {frequencies.map(f => (
            <option key={f.fr_id} value={f.fr_id}>{f.fr_name}</option>
          ))}
        </select>
        {freqInfo && (
          <p className="rtr-freq-hint">{freqInfo.hint}</p>
        )}
      </label>

      {/* Día de la semana — solo Semanal */}
      {needsWeekDay && (
        <label>
          <span className="label-row">
            Día de la semana
            <span className="required-tag">Obligatorio</span>
          </span>
          <select
            name="rtr_reference_day"
            value={form.rtr_reference_day}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecciona un día</option>
            {WEEK_DAYS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
      )}

      {/* Día del mes — solo Mensual */}
      {needsMonthDay && (
        <label>
          <span className="label-row">
            Día del mes
            <span className="required-tag">Obligatorio</span>
          </span>
          <select
            name="rtr_reference_day"
            value={form.rtr_reference_day}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecciona un día</option>
            {MONTH_DAYS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
      )}

      {/* Monto */}
      <label className={`amount-label-field ${form.ty_id ? `amount-${isIncome ? 'income' : 'expense'}` : ''}`}>
        <span className="label-row">
          Monto estimado
          <span className="required-tag">Obligatorio</span>
        </span>
        <div className="amount-input-wrap">
          <span className="currency-prefix">$</span>
          <input
            type="number"
            name="rtr_estimated_amount"
            value={form.rtr_estimated_amount}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            placeholder="0.00"
            disabled={saving}
            className="amount-number-input"
          />
        </div>
      </label>

      {/* Categoría */}
      <label>
        <span className="label-row">
          Categoría
          <span className="required-tag">Obligatorio</span>
        </span>
        <select name="ct_id" value={form.ct_id} onChange={handleCategoryChange} disabled={saving}>
          <option value="">Selecciona</option>
          {categories.map(cat => (
            <option key={cat.ct_id} value={cat.ct_id}>{cat.ct_name}</option>
          ))}
        </select>
      </label>

      {/* Subcategorías */}
      {form.ct_id && (
        <div className="form-field">
          <span className="label-row">
            Subcategorías
            <span className="required-tag">Al menos una</span>
          </span>
          {filteredSubcategories.length === 0 ? (
            <p className="rtr-empty-hint">No hay subcategorías disponibles.</p>
          ) : (
            <div className="rtr-subcategory-chips">
              {filteredSubcategories.map(s => {
                const selected = form.sct_ids.includes(String(s.sct_id));
                return (
                  <button
                    key={s.sct_id}
                    type="button"
                    className={`rtr-chip ${selected ? 'rtr-chip--selected' : ''}`}
                    onClick={() => handleSubcategoryToggle(s.sct_id)}
                    disabled={saving}
                  >
                    {selected && <span className="rtr-chip-check">✓</span>}
                    {s.sct_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Nombre */}
      <label>
        <span className="label-row">
          Nombre
          <span className="required-tag">Obligatorio</span>
        </span>
        <input
          type="text"
          name="rtr_name"
          value={form.rtr_name}
          onChange={handleChange}
          placeholder="Ej: Pago de luz, Salario mensual"
          disabled={saving}
          autoComplete="off"
        />
      </label>

      {/* Descripción */}
      <label>
        <span className="label-row">
          Descripción
          <span className="optional-tag">Opcional</span>
        </span>
        <input
          type="text"
          name="rtr_description"
          value={form.rtr_description}
          onChange={handleChange}
          placeholder="Detalle adicional"
          disabled={saving}
          autoComplete="off"
        />
      </label>

      {/* Fecha de inicio */}
      <label>
        <span className="label-row">
          Fecha de inicio
          <span className="required-tag">Obligatorio</span>
        </span>
        <input
          type="date"
          name="rtr_start_date"
          value={form.rtr_start_date}
          onChange={handleChange}
          disabled={saving}
        />
      </label>

      {/* Fecha de fin opcional */}
      <div className="form-field rtr-finish-date-field">
        <label className="rtr-toggle-label">
          <input
            type="checkbox"
            name="hasFinishDate"
            checked={form.hasFinishDate}
            onChange={handleChange}
            disabled={saving}
            className="rtr-toggle-checkbox"
          />
          <span>¿Agregar fecha de fin?</span>
        </label>

        {form.hasFinishDate && (
          <label style={{ marginTop: 10 }}>
            <span className="label-row">
              Fecha de fin
              <span className="required-tag">Obligatorio</span>
            </span>
            <input
              type="date"
              name="rtr_finish_date"
              value={form.rtr_finish_date}
              onChange={handleChange}
              min={form.rtr_start_date}
              disabled={saving}
            />
          </label>
        )}
      </div>

      {/* Botones */}
      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : isEditing ? 'Actualizar' : 'Crear'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="secondary-button">
          Cancelar
        </button>
      </div>
    </form>
  );
}
