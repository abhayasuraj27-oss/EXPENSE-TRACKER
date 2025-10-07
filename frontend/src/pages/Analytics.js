import React, { useEffect, useMemo, useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid } from 'recharts';
import { expenseAPI } from '../services/api';

// High-contrast categorical palette for better visibility in light/dark modes
const COLORS = [
  '#2563EB', // blue-600
  '#DC2626', // red-600
  '#059669', // emerald-600
  '#D97706', // amber-600
  '#7C3AED', // violet-600
  '#0EA5E9', // sky-500
  '#16A34A', // green-600
  '#EA580C', // orange-600
  '#9333EA', // purple-600
  '#E11D48', // rose-600
  '#0284C7', // sky-600
  '#D946EF', // fuchsia-500
];

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const Analytics = () => {
  const { committedTransactions } = useExpense();

  // Monthly totals for bar chart
  const [monthlyData, setMonthlyData] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Pie chart: categories for selected month
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(undefined);
  const [categoryData, setCategoryData] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch monthly totals (last 12 months)
  useEffect(() => {
    let active = true;
    async function loadMonthly() {
      try {
        setLoadingMonthly(true);
        const res = await expenseAPI.getMonthlyAnalytics(12);
        if (!active) return;
        const raw = res.data?.monthly_data || [];
        // Aggregate into fixed 12 months (Jan-Dec), sum across years
        const totalsByMonth = new Array(12).fill(0);
        raw.forEach((d) => {
          const m = Math.max(1, Math.min(12, Number(d.month)));
          const amt = Number(d.total_amount || 0);
          totalsByMonth[m - 1] += amt;
        });
        const fixed = MONTH_LABELS.map((label, idx) => ({
          name: label,
          month: idx + 1,
          total: totalsByMonth[idx],
        }));
        setMonthlyData(fixed);
      } catch (e) {
        setMonthlyData([]);
      } finally {
        setLoadingMonthly(false);
      }
    }
    loadMonthly();
    return () => { active = false; };
  }, []);

  // Fetch categories for selected month
  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const res = await expenseAPI.getCategoriesByMonth(selectedMonth, selectedYear);
        if (!active) return;
        const items = res.data?.categories || [];
        setCategoryData(items.map((c) => ({ name: c.category, value: Number(c.total_amount || 0) })));
      } catch (e) {
        setCategoryData([]);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
    return () => { active = false; };
  }, [selectedMonth, selectedYear]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Analytics</h2>

      <div className="mt-6 grid grid-cols-1 gap-6">
        {/* Monthly totals bar chart */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Monthly Expenses (last 12 months)</h3>
          </div>
          <div className="h-80 w-full mt-4">
            <ResponsiveContainer>
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories by selected month pie chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Categories by Month</h3>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-gray-400 bg-white px-3 py-1 text-sm text-gray-900 shadow-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-500"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                >
                  {MONTH_LABELS.map((label, idx) => (
                    <option key={label} value={idx + 1}>{label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="w-28 rounded-md border border-gray-400 bg-white px-3 py-1 text-sm text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-500"
                  placeholder="Any year"
                  value={selectedYear ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedYear(v === '' ? undefined : parseInt(v, 10));
                  }}
                />
              </div>
            </div>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">Categories</h3>
            <div className="mt-4 space-y-2">
              {categoryData.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">No data</div>
              )}
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-800 dark:text-gray-100">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">${c.value.toFixed ? c.value.toFixed(2) : c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;


