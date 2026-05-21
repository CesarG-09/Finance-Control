import { Link } from 'react-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import {
  getDashboardSummary,
  getMovementCategory,
  getMovementSignedAmount,
  getMonthMovementsByClientId,
} from '../services/dashboardService';
import { ComparisonSection } from '../components/dashboard/ComparisonSection';
import { HealthScore } from '../components/dashboard/HealthScore';
import { compareMovements } from '../services/analysisService';
import { getTopCategories, calculateHealthScore } from '../services/chartService';

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
  if (!value) return '-';
  const s = String(value);
  const dateStr = s.includes('T') || s.includes(' ') ? s : `${s}T00:00:00`;
  return new Intl.DateTimeFormat('es-PA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(dateStr));
}

export default function DashboardPage() {
  const { clientProfile } = useAuth();

  const [summary, setSummary] = useState({
    balanceTotal: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlyNet: 0,
    latestMovements: [],
  });

  const [comparison, setComparison] = useState({
    current: { income: 0, expenses: 0, net: 0, count: 0 },
    previous: { income: 0, expenses: 0, net: 0, count: 0 },
  });

  const [topCategories, setTopCategories] = useState([]);
  const [healthScore, setHealthScore] = useState(75);
  const [currentMovements, setCurrentMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const clientId = clientProfile?.cl_id;

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadDashboard();
  }, [clientId]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      // Get current month data
      const dashboardData = await getDashboardSummary(clientId);
      setSummary(dashboardData);

      // Get movements for comparisons and analysis
      const currentDate = new Date();
      const currentMovements = await getMonthMovementsByClientId(clientId, {
        sortDirection: 'desc',
      });
      setCurrentMovements(currentMovements);

      // Get previous month data
      const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
      const previousMonthStr = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
      const previousMovements = await getMonthMovementsByClientId(clientId, {
        month: previousMonthStr,
        sortDirection: 'desc',
      });

      // Calculate comparisons
      const comparisonData = compareMovements(currentMovements, previousMovements);
      setComparison(comparisonData);

      // Calculate top categories
      const categories = getTopCategories(currentMovements, 3);
      setTopCategories(categories);

      // Calculate health score
      const score = calculateHealthScore(currentMovements);
      setHealthScore(score);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p>Cargando dashboard...</p>;
  }

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen general de tus finanzas personales del mes actual.</p>
        </div>

        <Link to="/movimientos" className="button-link">
          Ver movimientos
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      <section className="dashboard-cards-grid">
        <article className="dashboard-card">
          <span>Balance total actual</span>
          <strong>{formatCurrency(summary.balanceTotal)}</strong>
          <small>Suma de cuentas activas</small>
        </article>

        <article className="dashboard-card">
          <span>Entradas del mes</span>
          <strong className="amount-positive">
            {formatCurrency(summary.monthlyIncome)}
          </strong>
          <small>Transacciones activas tipo Entrada</small>
        </article>

        <article className="dashboard-card">
          <span>Salidas del mes</span>
          <strong className="amount-negative">
            {formatCurrency(summary.monthlyExpense)}
          </strong>
          <small>Transacciones activas tipo Salida</small>
        </article>

        <article className="dashboard-card">
          <span>Neto del mes</span>
          <strong
            className={
              summary.monthlyNet >= 0 ? 'amount-positive' : 'amount-negative'
            }
          >
            {formatCurrency(summary.monthlyNet)}
          </strong>
          <small>Entradas menos salidas</small>
        </article>
      </section>

      <ComparisonSection
        current={comparison.current}
        previous={comparison.previous}
        topCategories={topCategories}
      />

      <HealthScore score={healthScore} movements={currentMovements} />

      <section className="panel dashboard-table-panel">
        <div className="section-header">
          <div>
            <h2>Últimos movimientos del mes</h2>
            <p>Se muestran las últimas transacciones activas del mes actual.</p>
          </div>
        </div>

        {summary.latestMovements.length === 0 ? (
          <p className="empty-message">No hay movimientos registrados este mes.</p>
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
                {summary.latestMovements.map((movement, index) => {
                  const signedAmount = getMovementSignedAmount(movement);
                  const movementKey =
                    movement.tr_id ??
                    movement.abh_id ??
                    `${movement.movement_source ?? 'movement'}-${movement.created_at ?? movement.tr_date ?? index}`;

                  return (
                    <tr key={movementKey}>
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