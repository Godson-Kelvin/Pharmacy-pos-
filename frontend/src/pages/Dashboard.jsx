import { useEffect, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api, formatCurrency } from '../lib/api';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animated';

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#ef4444'];

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <StaggerItem>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon size={22} />
          </div>
        </div>
      </div>
    </StaggerItem>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStats('30')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your pharmacy performance</p>
      </div>

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={DollarSign}
          label="Today's Revenue"
          value={formatCurrency(stats?.todayRevenue || 0)}
          sub={`${stats?.todayTransactions || 0} transactions`}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="30-Day Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          sub={`Avg ${formatCurrency(stats?.averageSale || 0)}/sale`}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Transactions"
          value={stats?.totalTransactions || 0}
          sub="Last 30 days"
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={Package}
          label="Products in Stock"
          value={stats?.totalProducts || 0}
          sub={`${stats?.lowStock?.length || 0} low stock items`}
          color="bg-amber-50 text-amber-600"
        />
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <FadeIn delay={0.2} className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats?.dailySales || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₵${v}`} />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(d) => new Date(d).toLocaleDateString('en-GH', { dateStyle: 'medium' })}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </FadeIn>

        <FadeIn delay={0.3} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Sales by Category</h3>
          {stats?.categorySales?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.categorySales}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {stats.categorySales.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {stats.categorySales.map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{cat.category}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(cat.revenue)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">No sales data yet</p>
          )}
        </FadeIn>
      </div>

      {stats?.lowStock?.length > 0 && (
        <FadeIn delay={0.4} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Low Stock Alert</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">SKU</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium text-right">Qty Left</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="py-3 text-gray-500">{product.sku}</td>
                    <td className="py-3 text-gray-500">{product.category}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.quantity <= 5
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {product.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      )}
    </FadeIn>
  );
}
