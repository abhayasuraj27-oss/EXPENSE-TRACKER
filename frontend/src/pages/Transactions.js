import React, { useMemo, useEffect, useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { expenseAPI } from '../services/api';

const Transactions = () => {
  const { transactions, selectedTransactions, toggleMyItem, clearMyItems, commitMyItems, clearAllTransactions, dispatch, setTransactions, addDeletedTransactions, removeDeletedTransaction, deletedTransactions } = useExpense();
  const { isAuthenticated } = useAuth();
  const [editMode, setEditMode] = useState(false);

  // On logout, ensure UI list is emptied (session resets)
  useEffect(() => {
    if (!isAuthenticated && transactions.length > 0) {
      dispatch({ type: 'SET_TRANSACTIONS', payload: [] });
      dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
      dispatch({ type: 'COMMIT_SELECTED_TRANSACTIONS', payload: [] });
    }
  }, [isAuthenticated]);

  const rowKey = (t) => (t && (t.id ?? `${t.date}|${t.description}|${t.amount}`));
  const isSelected = (t) => selectedTransactions.some((x) => rowKey(x) === rowKey(t));

  // Hide items that are selected or already committed from the main list
  const visibleTransactions = useMemo(() => {
    const keyOf = (t) => rowKey(t);
    const selectedKeys = new Set(selectedTransactions.map(keyOf));
    // committedTransactions lives in context, but we can derive hidden set from selected+remaining
    return transactions.filter((t) => !selectedKeys.has(keyOf(t)));
  }, [transactions, selectedTransactions]);

  // Show all selected items in the UI for immediate feedback
  const selectedTotal = useMemo(
    () => selectedTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [selectedTransactions]
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Transactions</h2>
        <button
          onClick={async () => {
            if (window.confirm('This will delete ALL transactions from the database. Continue?')) {
              await clearAllTransactions();
            }
          }}
          className="btn-danger shadow-lg ring-1 ring-red-500/20 hover:ring-red-500/30 transition"
        >
          Clear Transactions
        </button>
      </div>
      <div className="mt-4 card p-0 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 sticky top-0 z-10 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800 dark:divide-gray-700">
              {visibleTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No transactions yet.</td>
                </tr>
              )}
              {visibleTransactions.map((t) => (
                <tr key={rowKey(t)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => toggleMyItem(t)}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isSelected(t)}
                      onChange={() => toggleMyItem(t)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.date}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.description}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.category}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">${t.amount?.toFixed ? t.amount.toFixed(2) : t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Items</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300">Selected: {selectedTransactions.length}</span>
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total: ${selectedTotal.toFixed(2)}</span>
            <button onClick={clearMyItems} className="btn-secondary">Clear</button>
            <button onClick={commitMyItems} className="btn-primary">
              Done
            </button>
            <button
              disabled={false}
              onClick={async () => {
                if (!editMode) {
                  // Enter edit mode: load DB items into My Items (non-destructive to session list)
                  try {
                    const res = await expenseAPI.getTransactions();
                    const dbItems = Array.isArray(res.data) ? res.data : [];
                    // Merge unique by key into selectedTransactions
                    const keyOf = (t) => (t && (t.id ?? `${t.date}|${t.description}|${t.amount}`));
                    const existing = new Set(selectedTransactions.map(keyOf));
                    const toAdd = dbItems.filter((t) => !existing.has(keyOf(t)));
                    toAdd.forEach((t) => dispatch({ type: 'TOGGLE_SELECTED_TRANSACTION', payload: t }));
                    setEditMode(true);
                  } catch (e) {}
                } else {
                  // Exit edit mode: clear edit selections so remaining DB items are not held in My Items
                  dispatch({ type: 'CLEAR_SELECTED_TRANSACTIONS' });
                  setEditMode(false);
                }
              }}
              className={`btn-secondary`}
            >
              {editMode ? 'Close Edit' : 'Edit'}
            </button>
          </div>
        </div>
        <div className="mt-3 card p-0 overflow-hidden">
          <div className="overflow-x-auto max-h-[40vh]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 sticky top-0 z-10 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800 dark:divide-gray-700">
                {selectedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No items selected.</td>
                  </tr>
                )}
                {selectedTransactions.map((t) => (
                  <tr key={`my-${rowKey(t)}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.date}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.description}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.category}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">${t.amount?.toFixed ? t.amount.toFixed(2) : t.amount}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      {!editMode && (
                        <button onClick={() => toggleMyItem(t)} className="btn-secondary">Remove</button>
                      )}
                      {editMode && t.id && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this item from database?')) return;
                            try {
                              // Stash a copy into session deleted list first
                              addDeletedTransactions([t]);
                              await expenseAPI.deleteTransaction(t.id);
                              // Remove from selected and keep hidden from transactions list
                              dispatch({ type: 'TOGGLE_SELECTED_TRANSACTION', payload: t });
                              // also remove from session transactions if present
                              setTransactions(transactions.filter((x) => rowKey(x) !== rowKey(t)));
                            } catch (e) {}
                          }}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deleted Items (session-only, visible only when there are deletions) */}
        {deletedTransactions && deletedTransactions.length > 0 && (
          <div className="mt-6 card p-0 overflow-hidden">
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium">Deleted This Session</div>
            <div className="overflow-x-auto max-h-[30vh]">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 sticky top-0 z-10 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Amount</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800 dark:divide-gray-700">
                  {deletedTransactions.map((t, i) => (
                    <tr key={`del-${rowKey(t)}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.description}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{t.category}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">${t.amount?.toFixed ? t.amount.toFixed(2) : t.amount}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => removeDeletedTransaction(i)}
                            className="btn-secondary"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={async () => {
                              // Recreate the transaction in DB for current user
                              const payload = {
                                date: t.date,
                                description: t.description,
                                amount: t.amount,
                                category: t.category,
                                source: t.source || 'manual_restore'
                              };
                              try {
                                const res = await expenseAPI.createTransaction(payload);
                                const restored = res?.data || payload;
                                // Add to My Items as selected
                                dispatch({ type: 'TOGGLE_SELECTED_TRANSACTION', payload: restored });
                                removeDeletedTransaction(i);
                              } catch (e) {}
                            }}
                            className="btn-primary"
                          >
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;


