import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Calendar, Receipt } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api, formatCurrency, formatDate } from '../lib/api';
import Button from '../components/Button';
import Input from '../components/Input';
import { FadeIn } from '../components/Animated';

const COLORS = ['#059669', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6'];
const PAYMENT_LABELS = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Card',
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, statsData] = await Promise.all([
        api.getSales({ limit: '100' }),
        api.getStats(period),
      ]);
      setSales(salesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      await api.exportSales(params);
    } catch (err) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales & Reports</h1>
          <p className="text-gray-500 mt-1">Track sales performance and export data</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="From"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-auto"
          />
          <Input
            label="To"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="accent" onClick={handleExport} loading={exporting}>
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '7', label: '7 Days' },
          { value: '30', label: '30 Days' },
          { value: '90', label: '90 Days' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), color: 'text-primary-600' },
          { label: 'Transactions', value: stats?.totalTransactions || 0, color: 'text-blue-600' },
          { label: 'Average Sale', value: formatCurrency(stats?.averageSale || 0), color: 'text-purple-600' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FadeIn delay={0.1} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.dailySales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
              <Bar dataKey="revenue" fill="#059669" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FadeIn>

        <FadeIn delay={0.2} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats?.dailySales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ fill: '#059669', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </FadeIn>

        <FadeIn delay={0.3} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.categorySales || []}
                dataKey="revenue"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {(stats?.categorySales || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </FadeIn>

        <FadeIn delay={0.4} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={(stats?.paymentMethods || []).map((p) => ({
                ...p,
                method: PAYMENT_LABELS[p.method] || p.method,
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${v}`} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
              <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FadeIn>
      </div>

      {/* Sales table */}
      <FadeIn delay={0.5} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        {sales.length === 0 ? (
          <div className="text-center py-16">
            <Receipt size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No sales recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Receipt</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Cashier</th>
                  <th className="px-6 py-3 font-medium">Items</th>
                  <th className="px-6 py-3 font-medium">Payment</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, i) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{sale.receiptNo}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(sale.createdAt)}</td>
                    <td className="px-6 py-4 text-gray-500">{sale.user.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {sale.items.map((item) => item.product.name).join(', ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(sale.total)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FadeIn>
    </FadeIn>
  );
}
