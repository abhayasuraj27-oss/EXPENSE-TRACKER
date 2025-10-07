import React, { useMemo, useState, useEffect } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { expenseAPI } from '../services/api';

const Dashboard = () => {
  const { analytics, myItemsThisMonthTotal } = useExpense();

  // Fixed month options with labels and numeric mm
  const monthOptions = useMemo(() => (
    [
      { label: 'January - 01', mm: 1 },
      { label: 'February - 02', mm: 2 },
      { label: 'March - 03', mm: 3 },
      { label: 'April - 04', mm: 4 },
      { label: 'May - 05', mm: 5 },
      { label: 'June - 06', mm: 6 },
      { label: 'July - 07', mm: 7 },
      { label: 'August - 08', mm: 8 },
      { label: 'September - 09', mm: 9 },
      { label: 'October - 10', mm: 10 },
      { label: 'November - 11', mm: 11 },
      { label: 'December - 12', mm: 12 },
    ]
  ), []);

  const currentY = new Date().getFullYear();
  const currentM = new Date().getMonth() + 1;
  const currentValue = String(currentM).padStart(2, '0');

  const [selectedMonthValue, setSelectedMonthValue] = useState(currentValue);
  const [selectedMonthSummary, setSelectedMonthSummary] = useState({ total_amount: 0, transaction_count: 0 });

  // Fetch summary by month number from backend whenever selection changes
  useEffect(() => {
    const mm = parseInt(selectedMonthValue, 10);
    if (!Number.isFinite(mm)) return;
    expenseAPI.getByMonth(mm)
      .then((res) => {
        setSelectedMonthSummary({
          total_amount: res?.data?.total_amount || 0,
          transaction_count: res?.data?.transaction_count || 0,
        });
      })
      .catch(() => setSelectedMonthSummary({ total_amount: 0, transaction_count: 0 }));
  }, [selectedMonthValue]);

  const selectedLabel = useMemo(() => {
    const mm = parseInt(selectedMonthValue, 10);
    const opt = monthOptions.find((o) => o.mm === mm);
    return opt?.label || '';
  }, [monthOptions, selectedMonthValue]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h2>
      <p className="mt-2 text-gray-700 dark:text-gray-300">Welcome back! Here's a quick overview.</p>

      {/* Month selector */}
      <div className="mt-4 flex items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Select month</label>
        <select
          className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedMonthValue}
          onChange={(e) => setSelectedMonthValue(e.target.value)}
        >
          {monthOptions.map((opt) => (
            <option key={opt.mm} value={String(opt.mm).padStart(2, '0')}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card card-hover">
          <div className="text-sm text-gray-500">This Month (My Items)</div>
          <div className="mt-1 text-xl font-bold">${(myItemsThisMonthTotal || 0).toFixed(2)}</div>
        </div>

        <div className="card card-hover">
          <div className="text-sm text-gray-500">Selected Month Total (DB)</div>
          <div className="mt-1 text-xl font-bold">${(selectedMonthSummary.total_amount || 0).toFixed(2)}</div>
        </div>

        <div className="card card-hover">
          <div className="text-sm text-gray-500">Selected Month Transactions</div>
          <div className="mt-1 text-xl font-bold">{selectedMonthSummary.transaction_count}</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


