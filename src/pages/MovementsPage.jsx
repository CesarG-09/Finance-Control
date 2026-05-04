import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { getAccountsByClientId } from '../services/accountService';
import { getActiveTypeTransactions } from '../services/transactionService';
import {
  getMovementCategory,
  getMovementSignedAmount,
  getMonthMovementsByClientId,
} from '../services/dashboardService';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value ?? 0));
}

function formatSignedCurrency(value) {
  const numericValue = Number(value ?? 0);
  const sign = numericValue >= 0 ? '+' : '-';

  return `${sign}${formatCurrency(Math.abs(numericValue))}`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-PA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}

export default function MovementsPage() {
  const { clientProfile } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [typeTransactions, setTypeTransactions] = useState([]);
  const [movements, setMovements] = useState([]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const [filters, setFilters] = useState({
    accountId: '',
    typeId: '',
    month: currentMonth,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const clientId = clientProfile?.cl_id;

  const totals = useMemo(() => {
    return movements.reduce(
      (accumulator, movement) => {
        const signedAmount = getMovementSignedAmount(movement);

        if (signedAmount >= 0) {
          accumulator.income += signedAmount;
        } else {
          accumulator.expense += Math.abs(signedAmount);
        }

        accumulator.net += signedAmount;

        return accumulator;
      },
      {
        income: 0,
        expense: 0,
        net: 0,
      }
    );
  }, [movements]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadInitialData();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadMovements();
  }, [clientId, filters.accountId, filters.typeId, filters.month]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError('');

      const [accountsData, typeTransactionsData] = await Promise.all([
        getAccountsByClientId(clientId),
        getActiveTypeTransactions(),
      ]);

      setAccounts(accountsData);
      setTypeTransactions(typeTransactionsData);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements() {
    try {
      setLoading(true);
      setError('');

      const movementsData = await getMonthMovementsByClientId(clientId, filters);
      setMovements(movementsData);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function handleClearFilters() {
    setFilters({
      accountId: '',
      typeId: '',
      month: currentMonth,
    });
  }

  return (
    <section className="movements-page">
      <div className="page-header">
        <div>
          <h1>Movimientos</h1>
          <p>Consulta las transacciones activas por mes, cuenta y tipo.</p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <section className="movements-summary-grid">
        <article className="dashboard-card">
          <span>Entradas filtradas</span>
          <strong className="amount-positive">{formatCurrency(totals.income)}</strong>
        </article>

        <article className="dashboard-card">
          <span>Salidas filtradas</span>
          <strong className="amount-negative">{formatCurrency(totals.expense)}</strong>
        </article>

        <article className="dashboard-card">
          <span>Neto filtrado</span>
          <strong className={totals.net >= 0 ? 'amount-positive' : 'amount-negative'}>
            {formatCurrency(totals.net)}
          </strong>
        </article>

        <article className="dashboard-card">
          <span>Cantidad de movimientos</span>
          <strong>{movements.length}</strong>
        </article>
      </section>

      <section className="panel movements-filters-panel">
        <h2>Filtros básicos</h2>

        <div className="filters-grid movements-filters-grid">
          <label className="filter-field filter-field-month">
            Mes
            <input
              type="month"
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
            />
          </label>

          <label className="filter-field filter-field-account">
            Cuenta
            <select
              name="accountId"
              value={filters.accountId}
              onChange={handleFilterChange}
            >
              <option value="">Todas las cuentas</option>
              {accounts.map((account) => (
                <option key={account.ac_id} value={account.ac_id}>
                  {account.ac_name}
                  {!account.ac_is_active ? ' (inactiva)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field filter-field-type">
            Tipo
            <select
              name="typeId"
              value={filters.typeId}
              onChange={handleFilterChange}
            >
              <option value="">Entrada y Salida</option>
              {typeTransactions.map((typeTransaction) => (
                <option key={typeTransaction.ty_id} value={typeTransaction.ty_id}>
                  {typeTransaction.ty_name}
                </option>
              ))}
            </select>
          </label>

          <div className="filters-actions movements-filter-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearFilters}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      <section className="panel movements-table-panel">
        <div className="section-header">
          <div>
            <h2>Tabla de movimientos</h2>
            <p>Solo se muestran movimientos activos según los filtros seleccionados.</p>
          </div>
        </div>

        {loading ? (
          <p>Cargando movimientos...</p>
        ) : movements.length === 0 ? (
          <p className="empty-message">
            No hay movimientos para los filtros seleccionados.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="movements-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cuenta</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => {
                  const signedAmount = getMovementSignedAmount(movement);

                  return (
                    <tr key={movement.tr_id}>
                      <td>{formatDate(movement.tr_date)}</td>
                      <td>{movement.account?.ac_name || 'Sin cuenta'}</td>
                      <td>{movement.transaction_type?.ty_name || 'Sin tipo'}</td>
                      <td>{getMovementCategory(movement)}</td>
                      <td>{movement.tr_description || movement.tr_name}</td>
                      <td>
                        <strong
                          className={
                            signedAmount >= 0
                              ? 'amount-positive'
                              : 'amount-negative'
                          }
                        >
                          {formatSignedCurrency(signedAmount)}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}