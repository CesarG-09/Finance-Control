import { useEffect, useMemo, useState } from 'react';

import TransactionForm from '../components/transactions/TransactionForm';
import { useAuth } from '../context/AuthContext';
import { getAccountsByClientId } from '../services/accountService';
import {
  createTransaction,
  deactivateTransaction,
  getActiveSubcategories,
  getActiveTypeTransactions,
  getTransactionsByAccountIds,
  updateTransaction,
} from '../services/transactionService';

function formatCurrency(value) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
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

function getActiveRelation(transaction) {
  return transaction.subcategories_transaction?.find((item) => item.st_is_active);
}

function getTransactionCategory(transaction) {
  const relation = getActiveRelation(transaction);
  const categoryName = relation?.subcategory?.category?.ct_name;
  const subcategoryName = relation?.subcategory?.sct_name;

  if (!categoryName && !subcategoryName) {
    return 'Sin categoría';
  }

  return `${categoryName || 'Sin categoría'} - ${subcategoryName || 'Sin subcategoría'}`;
}

function TransactionCard({ transaction, onEdit, onDeactivate }) {
  const isActive = transaction.tr_is_active;
  const typeName = transaction.transaction_type?.ty_name || 'Sin tipo';

  return (
    <article className="transaction-card">
      <div className="transaction-card-header">
        <div>
          <h3>{transaction.tr_name}</h3>
          <p>{formatDate(transaction.tr_date)}</p>
        </div>

        <span className={isActive ? 'status-tag active' : 'status-tag inactive'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div className="transaction-card-body">
        <p>
          <strong>Cuenta:</strong> {transaction.account?.ac_name || 'Sin cuenta'}
        </p>
        <p>
          <strong>Tipo:</strong> {typeName}
        </p>
        <p>
          <strong>Categoría:</strong> {getTransactionCategory(transaction)}
        </p>

        {transaction.tr_description && (
          <p>
            <strong>Descripción:</strong> {transaction.tr_description}
          </p>
        )}
      </div>

      <div className="transaction-card-footer">
        <strong>{formatCurrency(transaction.tr_amount)}</strong>

        {isActive && (
          <div className="transaction-actions">
            <button type="button" onClick={() => onEdit(transaction)}>
              Editar
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => onDeactivate(transaction)}
            >
              Desactivar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function TransactionsPage() {
  const { clientProfile } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [typeTransactions, setTypeTransactions] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clientId = clientProfile?.cl_id;

  const activeTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.tr_is_active),
    [transactions]
  );

  const inactiveTransactions = useMemo(
    () => transactions.filter((transaction) => !transaction.tr_is_active),
    [transactions]
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.ac_is_active),
    [accounts]
  );

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadTransactionsData();
  }, [clientId]);

  async function loadTransactionsData() {
    try {
      setLoading(true);
      setError('');

      const [accountsData, typeTransactionsData, subcategoriesData] =
        await Promise.all([
          getAccountsByClientId(clientId),
          getActiveTypeTransactions(),
          getActiveSubcategories(),
        ]);

      const accountIds = accountsData.map((account) => account.ac_id);
      const transactionsData = await getTransactionsByAccountIds(accountIds);

      setAccounts(accountsData);
      setTypeTransactions(typeTransactionsData);
      setSubcategories(subcategoriesData);
      setTransactions(transactionsData);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(formData) {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      if (editingTransaction) {
        await updateTransaction(editingTransaction.tr_id, formData);
        setSuccess('Transacción actualizada correctamente. El balance se ajusta vía trigger.');
      } else {
        await createTransaction(formData);
        setSuccess('Transacción registrada correctamente. El balance se actualiza vía trigger.');
      }

      setEditingTransaction(null);
      await loadTransactionsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(transaction) {
    const confirmed = window.confirm(
      `¿Deseas desactivar la transacción "${transaction.tr_name}"? El balance será revertido automáticamente.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await deactivateTransaction(transaction.tr_id);

      setSuccess('Transacción desactivada correctamente. El balance fue revertido vía trigger.');
      setEditingTransaction(null);
      await loadTransactionsData();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(transaction) {
    setEditingTransaction(transaction);
    setError('');
    setSuccess('');
  }

  function handleCancelEdit() {
    setEditingTransaction(null);
    setError('');
    setSuccess('');
  }

  if (loading) {
    return <p>Cargando transacciones...</p>;
  }

  return (
    <section className="transactions-page">
      <div className="page-header">
        <div>
          <h1>Transacciones</h1>
          <p>Registra entradas y salidas. El balance se actualiza automáticamente desde la base de datos.</p>
        </div>

        <div className="summary-card">
          <span>Cuentas activas</span>
          <strong>{activeAccounts.length}</strong>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="info-message">{success}</p>}

      <div className="transactions-layout">
        <section className="panel transaction-form-panel">
          <h2>{editingTransaction ? 'Editar transacción' : 'Nueva transacción'}</h2>

          <TransactionForm
            accounts={accounts}
            typeTransactions={typeTransactions}
            subcategories={subcategories}
            initialData={editingTransaction}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={handleCancelEdit}
          />
        </section>

        <div className="transactions-groups">
          <section className="panel transactions-section">
            <div className="section-header">
              <h2>Transacciones activas</h2>
              <span>{activeTransactions.length}</span>
            </div>

            <div className="transactions-scroll-list">
              {activeTransactions.length === 0 ? (
                <p className="empty-message">Aún no tienes transacciones activas.</p>
              ) : (
                activeTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.tr_id}
                    transaction={transaction}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
                  />
                ))
              )}
            </div>
          </section>

          <section className="panel transactions-section">
            <div className="section-header">
              <h2>Transacciones inactivas</h2>
              <span>{inactiveTransactions.length}</span>
            </div>

            <div className="transactions-scroll-list">
              {inactiveTransactions.length === 0 ? (
                <p className="empty-message">No tienes transacciones inactivas.</p>
              ) : (
                inactiveTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.tr_id}
                    transaction={transaction}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}