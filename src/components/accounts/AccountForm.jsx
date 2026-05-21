import { useEffect, useState } from 'react';

const emptyForm = {
  ac_name: '',
  ta_id: '',
  ac_description: '',
  ac_balance: '0',
};

function getAccountIcon(typeName) {
  const n = (typeName || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('ahorr')) return '🏦';
  if (n.includes('tarjeta')) return '💳';
  if (n.includes('efectivo')) return '💵';
  if (n.includes('inversi')) return '📈';
  return '🤑';
}

function formatPreviewBalance(raw) {
  const num = Number(raw ?? 0);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(num);
}

export default function AccountForm({
  typeAccounts,
  initialData,
  saving,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData);

  const selectedType = typeAccounts.find((t) => String(t.ta_id) === String(form.ta_id));

  useEffect(() => {
    if (initialData) {
      setForm({
        ac_name: initialData.ac_name ?? '',
        ta_id: initialData.ta_id ? String(initialData.ta_id) : '',
        ac_description: initialData.ac_description ?? '',
        ac_balance: String(initialData.ac_balance ?? 0),
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [initialData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.ac_name.trim()) {
      setError('El nombre de la cuenta es obligatorio.');
      return;
    }

    if (!form.ta_id) {
      setError('Debes seleccionar un tipo de cuenta.');
      return;
    }

    if (!isEditing) {
      const balance = Number(form.ac_balance);
      if (!Number.isFinite(balance)) {
        setError('El balance inicial debe ser un número válido.');
        return;
      }
      if (balance < 0) {
        setError('El balance inicial no puede ser negativo.');
        return;
      }
    }

    await onSubmit(form);

    if (!isEditing) {
      setForm(emptyForm);
    }
  }

  return (
    <div className="account-form-layout">
      {/* Live preview */}
      <div className="account-form-preview">
        <p className="preview-label">Vista previa</p>
        <div className={`account-preview-card ${form.ta_id ? 'has-type' : ''}`}>
          <div className="preview-icon-row">
            <span className="preview-type-icon">
              {getAccountIcon(selectedType?.ta_name)}
            </span>
            <span className="preview-type-name">
              {selectedType?.ta_name || 'Tipo de cuenta'}
            </span>
          </div>

          <p className="preview-name">
            {form.ac_name.trim() || 'Nombre de la cuenta'}
          </p>

          {form.ac_description && (
            <p className="preview-description">{form.ac_description}</p>
          )}

          {!isEditing && (
            <div className="preview-balance">
              <small>Balance inicial</small>
              <strong>{formatPreviewBalance(form.ac_balance)}</strong>
            </div>
          )}

          {isEditing && (
            <div className="preview-balance">
              <small>Balance actual</small>
              <strong>{formatPreviewBalance(initialData?.ac_balance)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form className="form account-form" onSubmit={handleSubmit}>
        {error && <p className="error-message">{error}</p>}

        <div className="account-form-section">
          <p className="account-form-section-title">Datos básicos</p>

          <label>
            <span className="label-row">
              Nombre de cuenta
              <span className="required-tag">Obligatorio</span>
            </span>
            <input
              type="text"
              name="ac_name"
              value={form.ac_name}
              onChange={handleChange}
              placeholder="Ej: Cuenta de ahorros principal"
              autoComplete="off"
            />
          </label>

          <label>
            <span className="label-row">
              Descripción
              <span className="optional-tag">Opcional</span>
            </span>
            <input
              type="text"
              name="ac_description"
              value={form.ac_description}
              onChange={handleChange}
              placeholder="Ej: Cuenta para gastos mensuales"
              autoComplete="off"
            />
          </label>
        </div>

        <div className="account-form-section">
          <p className="account-form-section-title">Saldo</p>
          {!isEditing && (
            <label>
              <span className="label-row">
                Balance inicial
                <span className="required-tag">Obligatorio</span>
              </span>
              <input
                type="number"
                name="ac_balance"
                value={form.ac_balance}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              <small className="field-help">Solo se usa al crear la cuenta. Luego se actualiza con movimientos.</small>
            </label>
          )}
        </div>

        <div className="account-form-section">
          <p className="account-form-section-title">Tipo y estado</p>

          <label>
            <span className="label-row">
              Tipo de cuenta
              <span className="required-tag">Obligatorio</span>
            </span>
            <select name="ta_id" value={form.ta_id} onChange={handleChange}>
              <option value="">Selecciona un tipo</option>
              {typeAccounts.map((typeAccount) => (
                <option key={typeAccount.ta_id} value={typeAccount.ta_id}>
                  {typeAccount.ta_name}
                </option>
              ))}
            </select>
            <small className="field-help">El tipo ayuda a clasificar reportes y métricas automáticamente.</small>
          </label>
        </div>

        {isEditing && (
          <p className="info-message">
            El balance no se edita desde aquí. Se actualiza automáticamente con cada movimiento.
          </p>
        )}

        <div className="form-actions account-form-actions">
          {isEditing && (
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          )}

          {!isEditing && (
            <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)} disabled={saving}>
              Limpiar
            </button>
          )}

          <button type="submit" className="primary-action" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>
  );
}
