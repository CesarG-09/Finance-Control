import { useEffect, useMemo, useState } from 'react';

import TransactionForm from '../components/transactions/TransactionForm';
import { useAuth } from '../context/AuthContext';
import { getAccountsByClientId } from '../services/accountService';
import {
  createTransaction,
  deactivateTransaction,
  getActiveSubcategories,
  getActiveTransactionsByAccountId,
  getActiveTypeTransactions,
  updateTransaction,
} from '../services/transactionService';

function formatCurrency(value) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
}

function isIncomeTransaction(transaction) {
  return transaction.transaction_type?.ty_name?.toLowerCase() === 'entrada';
}

function formatTransactionAmount(transaction) {
  const amount = formatCurrency(transaction.tr_amount);

  return isIncomeTransaction(transaction) ? `+${amount}` : `-${amount}`;
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

function TransactionCard({ transaction, onEdit, onDelete }) {
  return (
    <article className="transaction-card">
      <div className="transaction-card-header">
        <div>
          <h3>{transaction.tr_name}</h3>
          <p>{formatDate(transaction.tr_date)}</p>
        </div>

        <span
          className={`status-tag ${
            isIncomeTransaction(transaction) ? 'income' : 'expense'
          }`}
        >
          {transaction.transaction_type?.ty_name || 'Sin tipo'}
        </span>
      </div>

      <div className="transaction-card-body">
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
        <strong
          className={
            isIncomeTransaction(transaction) ? 'amount-positive' : 'amount-negative'
          }
        >
          {formatTransactionAmount(transaction)}
        </strong>

        <div className="transaction-actions">
          <button type="button" onClick={() => onEdit(transaction)}>
            Editar
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(transaction)}
          >
            Eliminar
          </button>
        </div>
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
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clientId = clientProfile?.cl_id;

  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.ac_is_active),
    [accounts]
  );

  const selectedAccount = useMemo(
    () =>
      activeAccounts.find(
        (account) => String(account.ac_id) === String(selectedAccountId)
      ),
    [activeAccounts, selectedAccountId]
  );

  const transactionCount = transactions.length;

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadTransactionsData();
  }, [clientId]);

  async function loadTransactionsData(preferredAccountId = selectedAccountId) {
    try {
      setLoading(true);
      setError('');

      const [accountsData, typeTransactionsData, subcategoriesData] =
        await Promise.all([
          getAccountsByClientId(clientId),
          getActiveTypeTransactions(),
          getActiveSubcategories(),
        ]);

      const activeAccountsData = accountsData.filter(
        (account) => account.ac_is_active
      );

      const accountExists = activeAccountsData.some(
        (account) => String(account.ac_id) === String(preferredAccountId)
      );

      const nextSelectedAccountId = accountExists
        ? String(preferredAccountId)
        : activeAccountsData[0]?.ac_id
          ? String(activeAccountsData[0].ac_id)
          : '';

      const transactionsData = nextSelectedAccountId
        ? await getActiveTransactionsByAccountId(nextSelectedAccountId)
        : [];

      setAccounts(accountsData);
      setTypeTransactions(typeTransactionsData);
      setSubcategories(subcategoriesData);
      setSelectedAccountId(nextSelectedAccountId);
      setTransactions(transactionsData);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectedAccountChange(event) {
    const accountId = event.target.value;

    setSelectedAccountId(accountId);
    setEditingTransaction(null);
    setSuccess('');
    setError('');

    await loadTransactionsData(accountId);
  }

  async function handleSubmit(formData) {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        ...formData,
        ac_id: selectedAccountId,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.tr_id, payload);
        setSuccess('Transacción actualizada correctamente. El balance se ajusta vía trigger.');
      } else {
        await createTransaction(payload);
        setSuccess('Transacción registrada correctamente. El balance se actualiza vía trigger.');
      }

      setEditingTransaction(null);
      await loadTransactionsData(selectedAccountId);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(transaction) {
    const confirmed = window.confirm(
      `¿Deseas eliminar la transacción "${transaction.tr_name}"? No se borrará físicamente, solo se desactivará.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await deactivateTransaction(transaction.tr_id);

      setSuccess('Transacción eliminada correctamente. El balance fue revertido vía trigger.');
      setEditingTransaction(null);
      await loadTransactionsData(selectedAccountId);
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
          <p>
            Selecciona una cuenta para registrar y consultar sus transacciones.
          </p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="info-message">{success}</p>}

      <section className="panel transactions-summary-panel">
        <div className="transactions-account-selector">
          <div>
            <h2>{selectedAccount?.ac_name || 'Selecciona una cuenta'}</h2>
            <p>Cuenta activa para registrar y visualizar transacciones.</p>
          </div>

          <select
            value={selectedAccountId}
            onChange={handleSelectedAccountChange}
            disabled={activeAccounts.length === 0 || saving}
          >
            <option value="">Elegir cuenta</option>
            {activeAccounts.map((account) => (
              <option key={account.ac_id} value={account.ac_id}>
                {account.ac_name}
              </option>
            ))}
          </select>
        </div>

        <div className="transactions-summary-card">
          <span>Cantidad de transacciones</span>
          <strong>{transactionCount}</strong>
        </div>

        <div className="transactions-summary-card">
          <span>Balance actual</span>
          <strong>
            {selectedAccount ? formatCurrency(selectedAccount.ac_balance) : formatCurrency(0)}
          </strong>
        </div>
      </section>

      <div className="transactions-layout">
        <section className="panel transaction-form-panel">
          <h2>{editingTransaction ? 'Editar transacción' : 'Nueva transacción'}</h2>

          <div className="transaction-form-scroll">
            <TransactionForm
              typeTransactions={typeTransactions}
              subcategories={subcategories}
              selectedAccountId={selectedAccountId}
              selectedAccountName={selectedAccount?.ac_name || ''}
              initialData={editingTransaction}
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
            />
          </div>
        </section>

        <section className="panel transactions-section">
          <div className="transactions-list-header">
            <h2>Transacciones de la cuenta</h2>
            <p>
              Solo se muestran transacciones activas de la cuenta seleccionada.
            </p>
          </div>

          <div className="transactions-scroll-list">
            {!selectedAccountId ? (
              <p className="empty-message">
                Selecciona una cuenta para ver sus transacciones.
              </p>
            ) : transactions.length === 0 ? (
              <p className="empty-message">
                Esta cuenta aún no tiene transacciones activas.
              </p>
            ) : (
              transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.tr_id}
                  transaction={transaction}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}