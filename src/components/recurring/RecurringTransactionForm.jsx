import { useEffect, useMemo, useState } from 'react';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  ac_id: '',
  ty_id: '',
  fr_id: '',
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

function getActiveSubcategoriesData(recurringTransaction) {
  const activeRelations = recurringTransaction?.recurrent_transaction_subcategory?.filter(
    (item) => item.rts_is_active
  ) ?? [];

  return activeRelations.map(rel => rel.sct_id);
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
    () => typeTransactions.find((t) => String(t.ty_id) === String(form.ty_id)),
    [typeTransactions, form.ty_id]
  );

  const isIncome = selectedType
    ? selectedType.ty_name?.toLowerCase() === 'entrada'
    : null;

  const categories = useMemo(() => {
    const map = new Map();
    subcategories.forEach((s) => {
      const cat = s.category;
      if (cat?.ct_id) map.set(String(cat.ct_id), { ct_id: cat.ct_id, ct_name: cat.ct_name });
    });
    return Array.from(map.values()).sort((a, b) => a.ct_name.localeCompare(b.ct_name));
  }, [subcategories]);

  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => String(s.ct_id) === String(form.ct_id)),
    [subcategories, form.ct_id]
  );

  const selectedFrequency = useMemo(
    () => frequencies.find((f) => String(f.fr_id) === String(form.fr_id)),
    [frequencies, form.fr_id]
  );

  const showReferenceDayInput = useMemo(() => {
    const freqName = selectedFrequency?.fr_name;
    return freqName && ['Semanal', 'Mensual', 'Anual'].includes(freqName);
  }, [selectedFrequency]);

  useEffect(() => {
    if (initialData) {
      const sctIds = getActiveSubcategoriesData(initialData);
      const finishDate = initialData.rtr_finish_date ? String(initialData.rtr_finish_date).slice(0, 10) : '';

      setForm({
        ac_id: initialData.ac_id ? String(initialData.ac_id) : '',
        ty_id: initialData.ty_id ? String(initialData.ty_id) : '',
        fr_id: initialData.fr_id ? String(initialData.fr_id) : '',
        ct_id: sctIds.length > 0 ? String(sctIds[0]) : '',
        sct_ids: sctIds.map(id => String(id)),
        rtr_name: initialData.rtr_name ?? '',
        rtr_description: initialData.rtr_description ?? '',
        rtr_estimated_amount: String(initialData.rtr_estimated_amount ?? ''),
        rtr_reference_day: String(initialData.rtr_reference_day ?? ''),
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

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleCategoryChange(event) {
    setForm((prev) => ({ ...prev, ct_id: event.target.value, sct_ids: [] }));
  }

  function handleSubcategoryToggle(sctId) {
    setForm((prev) => {
      const sctIdStr = String(sctId);
      const newSctIds = prev.sct_ids.includes(sctIdStr)
        ? prev.sct_ids.filter(id => id !== sctIdStr)
        : [...prev.sct_ids, sctIdStr];
      return { ...prev, sct_ids: newSctIds };
    });
  }

  function handleTypeSelect(typeId) {
    setForm((prev) => ({ ...prev, ty_id: String(typeId) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.ac_id) { setError('Selecciona una cuenta.'); return; }
    if (!form.ty_id) { setError('Selecciona Entrada o Salida.'); return; }
    if (!form.fr_id) { setError('Selecciona una frecuencia.'); return; }
    if (!form.rtr_name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.rtr_start_date) { setError('La fecha de inicio es obligatoria.'); return; }

    if (showReferenceDayInput && !form.rtr_reference_day) {
      setError('Selecciona un día de referencia.');
      return;
    }

    if (form.sct_ids.length === 0) { setError('Selecciona al menos una subcategoría.'); return; }

    const amount = Number(form.rtr_estimated_amount);
    if (!Number.isFinite(amount)) { setError('El monto debe ser un número válido.'); return; }
    if (amount <= 0) { setError('El monto debe ser mayor a 0.'); return; }

    if (form.hasFinishDate && !form.rtr_finish_date) {
      setError('Especifica una fecha de fin.');
      return;
    }

    const payload = {
      ac_id: form.ac_id,
      ty_id: form.ty_id,
      fr_id: form.fr_id,
      rtr_name: form.rtr_name.trim(),
      rtr_description: form.rtr_description?.trim() || null,
      rtr_estimated_amount: amount,
      rtr_reference_day: form.rtr_reference_day ? Number(form.rtr_reference_day) : 1,
      rtr_start_date: form.rtr_start_date,
      rtr_finish_date: form.hasFinishDate ? form.rtr_finish_date : null,
      sct_ids: form.sct_ids.map(id => Number(id)),
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
        <select
          name="ac_id"
          value={form.ac_id}
          onChange={handleChange}
          disabled={saving}
        >
          <option value="">Selecciona una cuenta</option>
          {accounts.map((acc) => (
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
          {typeTransactions.map((t) => {
            const isSelected = String(t.ty_id) === String(form.ty_id);
            const isEntry = t.ty_name?.toLowerCase() === 'entrada';

            return (
              <button
                key={t.ty_id}
                type="button"
                className={`type-option-button ${
                  isSelected
                    ? isEntry
                      ? 'selected-income'
                      : 'selected-expense'
                    : 'unselected'
                }`}
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
        <select
          name="fr_id"
          value={form.fr_id}
          onChange={handleChange}
          disabled={saving}
        >
          <option value="">Selecciona una frecuencia</option>
          {frequencies.map((freq) => (
            <option key={freq.fr_id} value={freq.fr_id}>{freq.fr_name}</option>
          ))}
        </select>
      </label>

      {/* Día de referencia (condicional) */}
      {showReferenceDayInput && (
        <label>
          <span className="label-row">
            Día de referencia
            <span className="required-tag">Obligatorio</span>
          </span>
          <input
            type="number"
            name="rtr_reference_day"
            value={form.rtr_reference_day}
            onChange={handleChange}
            min="0"
            max="31"
            placeholder={selectedFrequency?.fr_name === 'Semanal' ? '0-6 (dom-sab)' : '1-31'}
            disabled={saving}
          />
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
        <select
          name="ct_id"
          value={form.ct_id}
          onChange={handleCategoryChange}
          disabled={saving}
        >
          <option value="">Selecciona</option>
          {categories.map((cat) => (
            <option key={cat.ct_id} value={cat.ct_id}>{cat.ct_name}</option>
          ))}
        </select>
      </label>

      {/* Subcategorías múltiples */}
      {form.ct_id && (
        <fieldset>
          <legend>
            <span className="label-row">
              Subcategorías
              <span className="required-tag">Obligatorio (al menos una)</span>
            </span>
          </legend>
          <div className="checkbox-group">
            {filteredSubcategories.map((s) => (
              <label key={s.sct_id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.sct_ids.includes(String(s.sct_id))}
                  onChange={() => handleSubcategoryToggle(s.sct_id)}
                  disabled={saving}
                />
                <span>{s.sct_name}</span>
              </label>
            ))}
          </div>
        </fieldset>
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
          placeholder="Ej: Pago de servicios, Salario mensual"
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

      {/* Fecha de fin (opcional) */}
      <div className="form-field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="hasFinishDate"
            checked={form.hasFinishDate}
            onChange={handleChange}
            disabled={saving}
          />
          <span>¿Agregar fecha de fin?</span>
        </label>

        {form.hasFinishDate && (
          <label>
            <span className="label-row">
              Fecha de fin
              <span className="required-tag">Obligatorio</span>
            </span>
            <input
              type="date"
              name="rtr_finish_date"
              value={form.rtr_finish_date}
              onChange={handleChange}
              disabled={saving}
            />
          </label>
        )}
      </div>

      {/* Botones */}
      <div className="form-buttons">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
