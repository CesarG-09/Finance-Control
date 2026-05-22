import { useEffect, useMemo, useRef, useState } from 'react';

import TransactionForm from '../components/transactions/TransactionForm';
import RecurringTransactionForm from '../components/recurring/RecurringTransactionForm';
import RecurringTransactionList from '../components/recurring/RecurringTransactionList';
import EditRecurrenceDialog from '../components/recurring/EditRecurrenceDialog';
import { useAuth } from '../context/AuthContext';
import { getAccountsByClientId } from '../services/accountService';
import ConfirmModal from '../components/ui/ConfirmModal';
import { SearchBox } from '../components/ui/SearchBox';
import { useDebounce } from '../hooks/useDebounce';
import { searchMovements } from '../services/filterService';
import {
  createTransaction,
  deactivateTransaction,
  getActiveSubcategories,
  getAccountTransactionsWithInitialBalance,
  getActiveTypeTransactions,
  updateTransaction,
} from '../services/transactionService';
import {
  createRecurringTransaction,
  deactivateRecurringTransaction,
  generatePendingTransactions,
  getFrequencies,
  getActiveRecurringTransactions,
  updateRecurringTransaction,
} from '../services/recurringTransactionService';

function formatCurrency(value) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
}

function isIncomeTransaction(transaction) {
  if (transaction.movement_source === 'initial_balance') {
    return true;
  }

  return transaction.transaction_type?.ty_name?.toLowerCase() === 'entrada';
}

function formatTransactionAmount(transaction) {
  if (transaction.movement_source === 'initial_balance') {
    return `+${formatCurrency(transaction.abh_change_amount)}`;
  }

  const amount = formatCurrency(transaction.tr_amount);

  return isIncomeTransaction(transaction) ? `+${amount}` : `-${amount}`;
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

function formatTime(value) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function getActiveRelation(transaction) {
  return transaction.subcategories_transaction?.find((item) => item.st_is_active);
}

function getTransactionCategory(transaction) {
  if (transaction.movement_source === 'initial_balance') {
    return 'Balance inicial';
  }

  const relation = getActiveRelation(transaction);
  const categoryName = relation?.subcategory?.category?.ct_name;
  const subcategoryName = relation?.subcategory?.sct_name;

  if (!categoryName && !subcategoryName) {
    return 'Sin categoría';
  }

  return `${categoryName || 'Sin categoría'} - ${subcategoryName || 'Sin subcategoría'}`;
}

function TransactionCard({ transaction, onEdit, onDelete }) {
  const isInitialBalance = transaction.movement_source === 'initial_balance';

  return (
    <article
      className={`transaction-card ${
        isInitialBalance ? 'transaction-card-initial-balance' : ''
      }`}
    >
      <div className="transaction-card-header">
        <div>
          <h3>{isInitialBalance ? 'Balance inicial' : transaction.tr_name}</h3>
          <p>
            {formatDate(transaction.tr_date || transaction.created_at?.slice(0, 10))}
            {formatTime(transaction.tr_time) && (
              <span className="transaction-time-tag">{formatTime(transaction.tr_time)}</span>
            )}
          </p>
        </div>

        <span className={`status-tag ${isInitialBalance ? 'initial' : isIncomeTransaction(transaction) ? 'income' : 'expense'}`}>
          {isInitialBalance
            ? 'Inicial'
            : transaction.transaction_type?.ty_name || 'Sin tipo'}
        </span>
      </div>

      <div className="transaction-card-body">
        <p>
          <strong>Categoría:</strong> {getTransactionCategory(transaction)}
        </p>

        <p>
          <strong>Descripción:</strong>{' '}
          {isInitialBalance
            ? transaction.abh_description || 'Balance inicial de la cuenta'
            : transaction.tr_description || 'Sin descripción'}
        </p>
      </div>

      <div className="transaction-card-footer">
        <strong className={isInitialBalance ? 'amount-neutral' : isIncomeTransaction(transaction) ? 'amount-positive' : 'amount-negative'}>
          {formatTransactionAmount(transaction)}
        </strong>

        {!isInitialBalance && (
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
        )}
      </div>
    </article>
  );
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getTransactionTypeName(typeTransactions, typeId) {
  const selectedType = typeTransactions.find(
    (typeTransaction) => String(typeTransaction.ty_id) === String(typeId)
  );

  return normalizeText(selectedType?.ty_name);
}

function getSignedEffectByType(typeTransactions, typeId, amount) {
  const typeName = getTransactionTypeName(typeTransactions, typeId);

  if (typeName === 'salida') {
    return Number(amount) * -1;
  }

  return Number(amount);
}

function isCreditCardAccount(account) {
  const accountTypeName = normalizeText(account?.account_type?.ta_name);

  return accountTypeName === 'tarjeta de credito' || accountTypeName === 'tarjeta de crédito';
}

export default function TransactionsPage() {
  const { clientProfile } = useAuth();

  const [confirmDeleteTransaction, setConfirmDeleteTransaction] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [typeTransactions, setTypeTransactions] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingRecurringTransaction, setEditingRecurringTransaction] = useState(null);
  const [creatingRecurringTransaction, setCreatingRecurringTransaction] = useState(false);
  const [showRecurringEditDialog, setShowRecurringEditDialog] = useState(false);
  const [pendingRecurringFormData, setPendingRecurringFormData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');
  const [activeTab, setActiveTab] = useState('transactions');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const messageRef = useRef(null);

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

  const filteredTransactions = useMemo(() => {
    const list = debouncedSearchTerm
      ? searchMovements(transactions, debouncedSearchTerm)
      : transactions;

    return [...list].sort((a, b) => {
      const dateA = a.tr_date ? String(a.tr_date).slice(0, 10) : a.created_at?.slice(0, 10) ?? '';
      const dateB = b.tr_date ? String(b.tr_date).slice(0, 10) : b.created_at?.slice(0, 10) ?? '';

      if (dateA !== dateB) {
        return sortDirection === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      }

      const timeA = a.tr_time ?? '00:00:00';
      const timeB = b.tr_time ?? '00:00:00';

      if (timeA !== timeB) {
        return sortDirection === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
      }

      const createdA = new Date(a.created_at ?? 0).getTime();
      const createdB = new Date(b.created_at ?? 0).getTime();
      return sortDirection === 'asc' ? createdA - createdB : createdB - createdA;
    });
  }, [transactions, debouncedSearchTerm, sortDirection]);

  const transactionCount = transactions.filter(
    (transaction) => transaction.movement_source !== 'initial_balance'
  ).length;

  useEffect(() => {
    if (!clientId) {
      return;
    }

    loadTransactionsData();
  }, [clientId]);

  useEffect(() => {
    if (!error && !success) return;

    messageRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [error, success]);

  async function loadTransactionsData(preferredAccountId = selectedAccountId) {
    try {
      setLoading(true);
      setError('');

      const [accountsData, typeTransactionsData, subcategoriesData, frequenciesData, recurringTransactionsData] =
        await Promise.all([
          getAccountsByClientId(clientId),
          getActiveTypeTransactions(),
          getActiveSubcategories(),
          getFrequencies(),
          getActiveRecurringTransactions(),
        ]);

      // Generate pending recurring transactions
      await generatePendingTransactions();

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
        ? await getAccountTransactionsWithInitialBalance(nextSelectedAccountId)
        : [];

      setAccounts(accountsData);
      setTypeTransactions(typeTransactionsData);
      setSubcategories(subcategoriesData);
      setFrequencies(frequenciesData);
      setRecurringTransactions(recurringTransactionsData);
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

 function validateBalanceBeforeSave(formData) {
  if (!selectedAccount) {
    return 'Debes seleccionar una cuenta válida.';
  }

  const amount = Number(formData.tr_amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'El monto debe ser mayor a 0.';
  }

  if (isCreditCardAccount(selectedAccount)) {
    return '';
  }

  const currentBalance = Number(selectedAccount.ac_balance ?? 0);

  const oldEffect = editingTransaction
    ? getSignedEffectByType(
        typeTransactions,
        editingTransaction.ty_id,
        editingTransaction.tr_amount
      )
    : 0;

  const newEffect = getSignedEffectByType(
    typeTransactions,
    formData.ty_id,
    formData.tr_amount
  );

  const balanceBeforeTransaction = currentBalance - oldEffect;
  const resultingBalance = balanceBeforeTransaction + newEffect;

  if (resultingBalance < 0) {
    return `No puedes registrar esta salida porque dejaría la cuenta en negativo. Saldo disponible: ${formatCurrency(balanceBeforeTransaction)}. Monto solicitado: ${formatCurrency(amount)}.`;
  }

  return '';
}

async function handleSubmit(formData) {
  // If editing a recurring transaction instance, show the choice dialog
  if (editingTransaction && editingTransaction.rtr_id) {
    setPendingRecurringFormData(formData);
    setShowRecurringEditDialog(true);
    return;
  }

  const balanceValidationError = validateBalanceBeforeSave(formData);

  if (balanceValidationError) {
    setError(balanceValidationError);
    setSuccess('');
    return;
  }

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

function handleDelete(transaction) {
  setConfirmDeleteTransaction(transaction);
}

async function handleConfirmDeleteTransaction() {
  if (!confirmDeleteTransaction) return;

  try {
    setSaving(true);
    setError('');
    setSuccess('');

    await deactivateTransaction(confirmDeleteTransaction.tr_id);

    setSuccess('Transacción eliminada correctamente. El balance fue revertido vía trigger.');
    setEditingTransaction(null);
    setConfirmDeleteTransaction(null);
    await loadTransactionsData(selectedAccountId);
  } catch (currentError) {
    setError(currentError.message);
  } finally {
    setSaving(false);
  }
}

function handleCancelDeleteTransaction() {
  if (saving) return;
  setConfirmDeleteTransaction(null);
}

function handleEdit(transaction) {
  setEditingTransaction(transaction);
  setError('');
  setSuccess('');
}

function handleCancelEdit() {
  setEditingTransaction(null);
  setShowRecurringEditDialog(false);
  setPendingRecurringFormData(null);
  setError('');
  setSuccess('');
}

async function handleRecurringEditChoice(choice) {
  const { updateRecurringTransactionInstanceOnly, updateRecurringTransactionAndFuture } = await import(
    '../services/transactionService'
  );

  try {
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      ...pendingRecurringFormData,
      ac_id: selectedAccountId,
    };

    if (choice === 'single') {
      await updateRecurringTransactionInstanceOnly(editingTransaction.tr_id, payload);
      setSuccess('Transacción actualizada (solo esta instancia). El balance se ajusta vía trigger.');
    } else if (choice === 'future') {
      await updateRecurringTransactionAndFuture(
        editingTransaction.tr_id,
        editingTransaction.rtr_id,
        payload,
        editingTransaction.tr_date
      );
      setSuccess('Transacción recurrente y futuras instancias actualizadas. El balance se ajusta vía trigger.');
    }

    setEditingTransaction(null);
    setShowRecurringEditDialog(false);
    setPendingRecurringFormData(null);
    await loadTransactionsData(selectedAccountId);
  } catch (currentError) {
    setError(currentError.message);
  } finally {
    setSaving(false);
  }
}

async function handleRecurringTransactionSubmit(formData) {
  try {
    setSaving(true);
    setError('');
    setSuccess('');

    if (editingRecurringTransaction) {
      await updateRecurringTransaction(editingRecurringTransaction.rtr_id, formData);
      setSuccess('Transacción recurrente actualizada correctamente.');
    } else {
      await createRecurringTransaction(formData);
      setSuccess('Transacción recurrente creada correctamente.');
    }

    setEditingRecurringTransaction(null);
    setCreatingRecurringTransaction(false);
    await loadTransactionsData();
  } catch (currentError) {
    setError(currentError.message);
  } finally {
    setSaving(false);
  }
}

function handleRecurringTransactionEdit(rtr) {
  setEditingRecurringTransaction(rtr);
  setError('');
  setSuccess('');
}

function handleCancelRecurringEdit() {
  setEditingRecurringTransaction(null);
  setCreatingRecurringTransaction(false);
  setError('');
  setSuccess('');
}

async function handleRecurringTransactionDeactivate(rtrId) {
  try {
    setSaving(true);
    setError('');
    setSuccess('');

    await deactivateRecurringTransaction(rtrId);
    setSuccess('Transacción recurrente desactivada correctamente.');
    await loadTransactionsData();
  } catch (currentError) {
    setError(currentError.message);
  } finally {
    setSaving(false);
  }
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


      <div ref={messageRef}>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="info-message">{success}</p>}
      </div>

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

      <div className="transactions-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transacciones
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'recurring' ? 'active' : ''}`}
          onClick={() => setActiveTab('recurring')}
        >
          Transacciones Recurrentes
        </button>
      </div>

      {activeTab === 'transactions' && (
        <div className="transactions-layout">
          <section className="panel transaction-form-panel">
            <h2>{editingTransaction ? 'Editar transacción' : 'Nueva transacción'}</h2>

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
          </section>

          <section className="panel transactions-section">
          <div className="transactions-list-header">
            <div>
              <h2>Transacciones de la cuenta</h2>
              <p>
                Solo se muestran transacciones activas de la cuenta seleccionada.
              </p>
            </div>

            {transactions.length > 0 && (
              <button
                type="button"
                className="sort-toggle-btn"
                onClick={() => setSortDirection((d) => d === 'desc' ? 'asc' : 'desc')}
                title={sortDirection === 'desc' ? 'Orden: más recientes primero' : 'Orden: más antiguos primero'}
              >
                {sortDirection === 'desc' ? '↓ Más recientes' : '↑ Más antiguos'}
              </button>
            )}
          </div>

          {selectedAccountId && transactions.length > 0 && (
            <div className="transactions-search-container">
              <SearchBox
                placeholder="Buscar por descripción o categoría..."
                value={searchTerm}
                onSearchChange={setSearchTerm}
                debounceDelay={300}
                clearable={true}
              />
              {debouncedSearchTerm && (
                <small className="search-results-count">
                  Mostrando {filteredTransactions.length} de {transactions.length} transacciones
                </small>
              )}
            </div>
          )}

          <div className="transactions-scroll-list">
            {!selectedAccountId ? (
              <p className="empty-message">
                Selecciona una cuenta para ver sus transacciones.
              </p>
            ) : transactions.length === 0 ? (
              <p className="empty-message">
                Esta cuenta aún no tiene transacciones activas.
              </p>
            ) : filteredTransactions.length === 0 ? (
              <p className="empty-message">
                No hay transacciones que coincidan con la búsqueda.
              </p>
            ) : (
              filteredTransactions.map((transaction) => (
                <TransactionCard
                  key={`${transaction.movement_source}-${transaction.tr_id || transaction.abh_id}`}
                  transaction={transaction}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </section>
      </div>
      )}

      {activeTab === 'recurring' && (
        <div className="transactions-layout">
          {creatingRecurringTransaction || editingRecurringTransaction ? (
            <section className="panel transaction-form-panel">
              <h2>
                {editingRecurringTransaction
                  ? 'Editar transacción recurrente'
                  : 'Nueva transacción recurrente'}
              </h2>

              <RecurringTransactionForm
                accounts={activeAccounts}
                typeTransactions={typeTransactions}
                frequencies={frequencies}
                subcategories={subcategories}
                initialData={editingRecurringTransaction}
                saving={saving}
                onSubmit={handleRecurringTransactionSubmit}
                onCancel={handleCancelRecurringEdit}
              />
            </section>
          ) : (
            <section className="panel transactions-section" style={{ width: '100%' }}>
              <RecurringTransactionList
                recurringTransactions={recurringTransactions}
                onEdit={handleRecurringTransactionEdit}
                onDeactivate={handleRecurringTransactionDeactivate}
                onCreateNew={() => setCreatingRecurringTransaction(true)}
                loading={saving}
              />
            </section>
          )}
        </div>
      )}

      {showRecurringEditDialog && editingTransaction?.rtr_id && (
        <EditRecurrenceDialog
          transactionName={editingTransaction.tr_name}
          onChoice={handleRecurringEditChoice}
          onCancel={handleCancelEdit}
          loading={saving}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteTransaction)}
        title="Eliminar transacción"
        message={`¿Deseas eliminar la transacción "${confirmDeleteTransaction?.tr_name}"?`}
        confirmText="Eliminar"
        danger
        loading={saving}
        onConfirm={handleConfirmDeleteTransaction}
        onCancel={handleCancelDeleteTransaction}
      />

    </section>
  );
}
