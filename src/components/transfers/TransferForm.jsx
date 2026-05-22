import { useEffect, useMemo, useState } from 'react';

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getNowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const emptyForm = {
  originAcId: '',
  destAcId: '',
  amount: '',
  date: getTodayDate(),
  time: getNowTime(),
  description: '',
};

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' })
    .format(Number(value ?? 0));
}

function getAvailable(account) {
  if (!account) return 0;
  return Number(account.ac_balance ?? 0);
}

export default function TransferForm({ accounts, saving, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.ac_is_active),
    [accounts]
  );

  const origin = activeAccounts.find((a) => String(a.ac_id) === String(form.originAcId));
  const dest = activeAccounts.find((a) => String(a.ac_id) === String(form.destAcId));

  useEffect(() => {
    setForm(emptyForm);
    setError('');
  }, [accounts]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.originAcId) { setError('Selecciona la cuenta origen.'); return; }
    if (!form.destAcId) { setError('Selecciona la cuenta destino.'); return; }
    if (String(form.originAcId) === String(form.destAcId)) {
      setError('La cuenta origen y destino deben ser diferentes.');
      return;
    }

    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('El monto debe ser mayor a 0.');
      return;
    }

    const available = getAvailable(origin);
    if (amt > available) {
      setError(
        Number(origin?.ta_id) === 1
          ? 'El monto excede el crédito disponible de la tarjeta origen.'
          : 'El monto excede el saldo disponible de la cuenta origen.'
      );
      return;
    }

    if (!form.date) { setError('La fecha es obligatoria.'); return; }

    try {
      await onSubmit({
        originAcId: Number(form.originAcId),
        destAcId: Number(form.destAcId),
        amount: amt,
        date: form.date,
        time: form.time,
        description: form.description,
      });
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="form transfer-form" onSubmit={handleSubmit}>
      {error && <p className="error-message">{error}</p>}

      <div className="account-form-two-col">
        <label>
          <span className="label-row">
            Cuenta origen
            <span className="required-tag">Obligatorio</span>
          </span>
          <select
            name="originAcId"
            value={form.originAcId}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecciona</option>
            {activeAccounts.map((a) => (
              <option key={a.ac_id} value={a.ac_id}>
                {a.ac_name} ({formatCurrency(a.ac_balance)})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="label-row">
            Cuenta destino
            <span className="required-tag">Obligatorio</span>
          </span>
          <select
            name="destAcId"
            value={form.destAcId}
            onChange={handleChange}
            disabled={saving}
          >
            <option value="">Selecciona</option>
            {activeAccounts
              .filter((a) => String(a.ac_id) !== String(form.originAcId))
              .map((a) => (
                <option key={a.ac_id} value={a.ac_id}>
                  {a.ac_name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label>
        <span className="label-row">
          Monto
          <span className="required-tag">Obligatorio</span>
        </span>
        <div className="amount-input-wrap">
          <span className="currency-prefix">$</span>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            placeholder="0.00"
            disabled={saving}
            className="amount-number-input"
          />
        </div>
        {origin && (
          <small className="field-help">
            Disponible en origen: {formatCurrency(getAvailable(origin))}
          </small>
        )}
      </label>

      <div className="form-field">
        <span className="label-row">
          Fecha y hora
          <span className="required-tag">Obligatorio</span>
        </span>
        <div className="date-input-wrap">
          <input type="date" name="date" value={form.date} onChange={handleChange} disabled={saving} />
          <input type="time" name="time" value={form.time} onChange={handleChange} disabled={saving} className="time-input" />
        </div>
      </div>

      <label>
        <span className="label-row">
          Descripción
          <span className="optional-tag">Opcional</span>
        </span>
        <input
          type="text"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Detalle de la transferencia"
          disabled={saving}
          autoComplete="off"
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Transfiriendo...' : 'Transferir'}
        </button>
        {onCancel && (
          <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
      </div>

      {origin && dest && (
        <p className="info-message">
          ↔ Mover {form.amount ? formatCurrency(form.amount) : '—'} desde <strong>{origin.ac_name}</strong> a <strong>{dest.ac_name}</strong>
        </p>
      )}
    </form>
  );
}
