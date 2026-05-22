import { useEffect, useState } from 'react';

const CREDIT_CARD_TA_ID = '1';

const emptyForm = {
  ac_name: '',
  ta_id: '',
  ac_description: '',
  ac_balance: '0',
  // Campos de Tarjeta de Crédito
  acc_credit_limit: '',
  acc_debt_amount: '0',
  acc_cut_day: '',
  acc_pay_day: '',
  acc_interest_rate: '0',
};

function getAccountIcon(typeName) {
  const n = (typeName || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('ahorr')) return '🏦';
  if (n.includes('tarjeta')) return '💳';
  if (n.includes('efectivo')) return '💵';
  if (n.includes('inversi')) return '📈';
  return '🤑';
}

function formatCurrency(raw) {
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
  const isCreditCard = String(form.ta_id) === CREDIT_CARD_TA_ID;

  const selectedType = typeAccounts.find((t) => String(t.ta_id) === String(form.ta_id));

  const creditLimitNum = Number(form.acc_credit_limit);
  const debtAmountNum = Number(form.acc_debt_amount);
  const availableCredit =
    Number.isFinite(creditLimitNum) && Number.isFinite(debtAmountNum)
      ? Math.max(creditLimitNum - debtAmountNum, 0)
      : 0;

  useEffect(() => {
    if (initialData) {
      const card = initialData.account_card ?? null;
      setForm({
        ac_name: initialData.ac_name ?? '',
        ta_id: initialData.ta_id ? String(initialData.ta_id) : '',
        ac_description: initialData.ac_description ?? '',
        ac_balance: String(initialData.ac_balance ?? 0),
        acc_credit_limit: card?.acc_credit_limit != null ? String(card.acc_credit_limit) : '',
        acc_debt_amount: card?.acc_debt_amount != null ? String(card.acc_debt_amount) : '0',
        acc_cut_day: card?.acc_cut_day != null ? String(card.acc_cut_day) : '',
        acc_pay_day: card?.acc_pay_day != null ? String(card.acc_pay_day) : '',
        acc_interest_rate: card?.acc_interest_rate != null ? String(card.acc_interest_rate) : '0',
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

    if (isCreditCard) {
      const limit = Number(form.acc_credit_limit);
      if (!Number.isFinite(limit) || limit <= 0) {
        setError('El límite de crédito debe ser mayor a 0.');
        return;
      }
      if (!isEditing) {
        const debt = Number(form.acc_debt_amount);
        if (!Number.isFinite(debt) || debt < 0) {
          setError('La deuda inicial no puede ser negativa.');
          return;
        }
        if (debt > limit) {
          setError('La deuda inicial no puede exceder el límite de crédito.');
          return;
        }
      }
      const cut = Number(form.acc_cut_day);
      const pay = Number(form.acc_pay_day);
      if (!Number.isInteger(cut) || cut < 1 || cut > 31) {
        setError('Día de corte inválido (1-31).');
        return;
      }
      if (!Number.isInteger(pay) || pay < 1 || pay > 31) {
        setError('Día de pago inválido (1-31).');
        return;
      }
      const rate = Number(form.acc_interest_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        setError('Tasa de interés inválida (0-100).');
        return;
      }
    } else if (!isEditing) {
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

          {isCreditCard ? (
            <div className="preview-balance">
              <small>Crédito disponible inicial</small>
              <strong>{formatCurrency(availableCredit)}</strong>
            </div>
          ) : !isEditing ? (
            <div className="preview-balance">
              <small>Balance inicial</small>
              <strong>{formatCurrency(form.ac_balance)}</strong>
            </div>
          ) : (
            <div className="preview-balance">
              <small>Balance actual</small>
              <strong>{formatCurrency(initialData?.ac_balance)}</strong>
            </div>
          )}
        </div>
      </div>

      <form className="form account-form" onSubmit={handleSubmit}>
        {error && <p className="error-message">{error}</p>}

        <div className="account-form-section">
          <p className="account-form-section-title">Información de la cuenta</p>

          <div className="account-form-two-col">
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
                placeholder="Ej: Cuenta de ahorros"
                autoComplete="off"
              />
            </label>

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
            </label>
          </div>

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

        {isCreditCard && (
          <fieldset className="account-form-section">
            <legend className="account-form-section-title">Datos de la tarjeta de crédito</legend>

            <div className="account-form-two-col">
              <label>
                <span className="label-row">
                  Límite de crédito
                  <span className="required-tag">Obligatorio</span>
                </span>
                <input
                  type="number"
                  name="acc_credit_limit"
                  value={form.acc_credit_limit}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                />
              </label>

              {!isEditing && (
                <label>
                  <span className="label-row">
                    Deuda actual inicial
                    <span className="optional-tag">Opcional</span>
                  </span>
                  <input
                    type="number"
                    name="acc_debt_amount"
                    value={form.acc_debt_amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </label>
              )}
            </div>

            <div className="account-form-two-col">
              <label>
                <span className="label-row">
                  Día de corte
                  <span className="required-tag">Obligatorio</span>
                </span>
                <input
                  type="number"
                  name="acc_cut_day"
                  value={form.acc_cut_day}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  placeholder="1-31"
                />
              </label>

              <label>
                <span className="label-row">
                  Día de pago
                  <span className="required-tag">Obligatorio</span>
                </span>
                <input
                  type="number"
                  name="acc_pay_day"
                  value={form.acc_pay_day}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  placeholder="1-31"
                />
              </label>
            </div>

            <label>
              <span className="label-row">
                Tasa de interés anual (%)
                <span className="optional-tag">Opcional</span>
              </span>
              <input
                type="number"
                name="acc_interest_rate"
                value={form.acc_interest_rate}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
              />
            </label>

            <small className="field-help">
              El balance inicial se calcula como límite − deuda. La deuda se ajusta automáticamente con cada movimiento.
            </small>
          </fieldset>
        )}

        {!isCreditCard && !isEditing && (
          <div className="account-form-section">
            <p className="account-form-section-title">Balance inicial</p>
            <label>
              <span className="label-row">
                Monto inicial
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
              <small className="field-help">Se registra automáticamente en el historial. No puede modificarse luego.</small>
            </label>
          </div>
        )}

        {isEditing && !isCreditCard && (
          <p className="info-message">
            El balance no se edita desde aquí. Se actualiza automáticamente con cada movimiento.
          </p>
        )}

        <div className="form-actions account-form-actions">
          {isEditing ? (
            <button
              type="button"
              className="account-form-ghost-btn"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              className="account-form-ghost-btn"
              onClick={() => setForm(emptyForm)}
              disabled={saving}
            >
              Limpiar campos
            </button>
          )}

          <button type="submit" className="account-form-submit-btn" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>
  );
}
