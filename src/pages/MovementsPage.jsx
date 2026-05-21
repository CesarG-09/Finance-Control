import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { getAccountsByClientId } from '../services/accountService';
import { getActiveTypeTransactions } from '../services/transactionService';
import {
  getMovementCategory,
  getMovementSignedAmount,
  getMonthMovementsByClientId,
  getMonthRange,
} from '../services/dashboardService';
import { SearchBox } from '../components/ui/SearchBox';
import { DateRangeSelector } from '../components/ui/DateRangeSelector';
import { PillTag } from '../components/ui/PillTag';
import { useDebounce } from '../hooks/useDebounce';
import { filterByAmountRange, searchMovements } from '../services/filterService';

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
    sortDirection: 'desc',
  });

  const [advancedFilters, setAdvancedFilters] = useState({
    searchTerm: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const debouncedSearchTerm = useDebounce(advancedFilters.searchTerm, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const clientId = clientProfile?.cl_id;

  // Apply advanced filters to movements
  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    // Apply search filter
    if (debouncedSearchTerm) {
      filtered = searchMovements(filtered, debouncedSearchTerm);
    }

    // Apply amount range filter
    const minAmount = advancedFilters.minAmount
      ? parseFloat(advancedFilters.minAmount)
      : null;
    const maxAmount = advancedFilters.maxAmount
      ? parseFloat(advancedFilters.maxAmount)
      : null;

    if (minAmount !== null || maxAmount !== null) {
      filtered = filterByAmountRange(filtered, minAmount, maxAmount);
    }

    // Apply date range filter (if using advanced date picker)
    if (advancedFilters.startDate || advancedFilters.endDate) {
      filtered = filtered.filter((m) => {
        const date = m.tr_date || m.created_at?.slice(0, 10);
        if (advancedFilters.startDate && date < advancedFilters.startDate)
          return false;
        if (advancedFilters.endDate && date > advancedFilters.endDate)
          return false;
        return true;
      });
    }

    return filtered;
  }, [movements, debouncedSearchTerm, advancedFilters]);

  const totals = useMemo(() => {
    return filteredMovements.reduce(
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
  }, [filteredMovements]);

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
  }, [clientId, filters.accountId, filters.typeId, filters.month, filters.sortDirection]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError('');

      const [accountsData, typeTransactionsData] = await Promise.all([
        getAccountsByClientId(clientId),
        getActiveTypeTransactions(),
      ]);

      setAccounts(accountsData.filter((account) => account.ac_is_active));
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
      sortDirection: 'desc',
    });
    setAdvancedFilters({
      searchTerm: '',
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: '',
    });
  }

  function handleAdvancedFilterChange(newFilters) {
    setAdvancedFilters(newFilters);
  }

  function hasActiveAdvancedFilters() {
    return (
      advancedFilters.searchTerm ||
      advancedFilters.minAmount ||
      advancedFilters.maxAmount ||
      advancedFilters.startDate ||
      advancedFilters.endDate
    );
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
              <option value="">Todas las cuentas activas</option>
              {accounts.map((account) => (
                <option key={account.ac_id} value={account.ac_id}>
                  {account.ac_name}
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

          <label className="filter-field filter-field-order">
            Orden
            <select
              name="sortDirection"
              value={filters.sortDirection}
              onChange={handleFilterChange}
            >
              <option value="desc">Más recientes primero</option>
              <option value="asc">Más antiguos primero</option>
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

      {/* Advanced Filters Section */}
      <section className="panel movements-advanced-filters-panel">
        <div className="advanced-filters-header">
          <button
            type="button"
            className="advanced-filters-toggle"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            aria-expanded={showAdvancedFilters}
          >
            <span className="toggle-chevron">{showAdvancedFilters ? '▼' : '▶'}</span>
            Filtros avanzados
            {hasActiveAdvancedFilters() && (
              <span className="active-filter-badge">{Object.values(advancedFilters).filter(v => v).length}</span>
            )}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="advanced-filters-content">
            <div className="advanced-filters-grid">
              <div className="search-filter-container">
                <label>Buscar por descripción o categoría</label>
                <SearchBox
                  placeholder="Ej: Comida, Salario..."
                  value={advancedFilters.searchTerm}
                  onSearchChange={(value) =>
                    handleAdvancedFilterChange({
                      ...advancedFilters,
                      searchTerm: value,
                    })
                  }
                  debounceDelay={300}
                  clearable={true}
                />
              </div>

              <div className="amount-filters-row">
                <div className="amount-filter">
                  <label htmlFor="min-amount">Monto mínimo</label>
                  <input
                    id="min-amount"
                    type="number"
                    placeholder="0.00"
                    value={advancedFilters.minAmount}
                    onChange={(e) =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        minAmount: e.target.value,
                      })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="amount-filter">
                  <label htmlFor="max-amount">Monto máximo</label>
                  <input
                    id="max-amount"
                    type="number"
                    placeholder="9999.99"
                    value={advancedFilters.maxAmount}
                    onChange={(e) =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        maxAmount: e.target.value,
                      })
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="date-filters-container">
                <DateRangeSelector
                  startDate={advancedFilters.startDate}
                  endDate={advancedFilters.endDate}
                  onDateChange={(start, end) =>
                    handleAdvancedFilterChange({
                      ...advancedFilters,
                      startDate: start,
                      endDate: end,
                    })
                  }
                  label="Rango de fechas personalizado"
                />
              </div>
            </div>

            {hasActiveAdvancedFilters() && (
              <div className="active-filters-tags">
                {advancedFilters.searchTerm && (
                  <PillTag
                    label={`Busca: "${advancedFilters.searchTerm}"`}
                    onRemove={() =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        searchTerm: '',
                      })
                    }
                  />
                )}
                {advancedFilters.minAmount && (
                  <PillTag
                    label={`Mín: $${advancedFilters.minAmount}`}
                    onRemove={() =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        minAmount: '',
                      })
                    }
                  />
                )}
                {advancedFilters.maxAmount && (
                  <PillTag
                    label={`Máx: $${advancedFilters.maxAmount}`}
                    onRemove={() =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        maxAmount: '',
                      })
                    }
                  />
                )}
                {advancedFilters.startDate && (
                  <PillTag
                    label={`Desde: ${advancedFilters.startDate}`}
                    onRemove={() =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        startDate: '',
                      })
                    }
                  />
                )}
                {advancedFilters.endDate && (
                  <PillTag
                    label={`Hasta: ${advancedFilters.endDate}`}
                    onRemove={() =>
                      handleAdvancedFilterChange({
                        ...advancedFilters,
                        endDate: '',
                      })
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
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
        ) : filteredMovements.length === 0 ? (
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
                {filteredMovements.map((movement) => {
                  const signedAmount = getMovementSignedAmount(movement);

                  return (
                    <tr
                      key={`${movement.movement_source}-${movement.tr_id || movement.abh_id}`}
                      className={movement.movement_source === 'initial_balance' ? 'initial-balance-row' : ''}
                    >
                      <td>{formatDate(movement.tr_date || movement.created_at?.slice(0, 10))}</td>
                      <td>{movement.account?.ac_name || 'Sin cuenta'}</td>
                      <td>
                        {movement.movement_source === 'initial_balance'
                          ? 'Inicial'
                          : movement.transaction_type?.ty_name || 'Sin tipo'}
                      </td>
                      <td>{getMovementCategory(movement)}</td>
                      <td>
                        {movement.movement_source === 'initial_balance'
                          ? movement.abh_description || 'Balance inicial de la cuenta'
                          : movement.tr_description || movement.tr_name}
                      </td>
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