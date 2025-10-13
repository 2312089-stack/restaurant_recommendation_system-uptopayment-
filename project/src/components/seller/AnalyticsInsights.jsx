import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, 
  Star, Clock, Package, Calendar, Download, Filter, RefreshCw,
  ArrowUp, ArrowDown, ChevronDown, Eye, Heart, MessageSquare
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:5000/api';

const AnalyticsInsights = () => {
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const getAuthToken = () => localStorage.getItem('sellerToken') || localStorage.getItem('token');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE}/seller/analytics?range=${timeRange}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setAnalytics(data.analytics);
        setError('');
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `₹${value.toLocaleString('en-IN')}`;
  
  const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#eab308', '#8b5cf6', '#ec4899'];

  // Metric Card Component
  const MetricCard = ({ title, value, change, icon: Icon, color, bgColor }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>{formatPercent(change)}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  // Chart Container Component
  const ChartContainer = ({ title, children, action }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const {
    overview,
    revenue,
    orders,
    dishes,
    customers,
    performance,
    trends
  } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
          <p className="text-sm text-gray-500 mt-1">Track your restaurant's performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(overview.totalRevenue)}
          change={revenue.growth}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <MetricCard
          title="Total Orders"
          value={overview.totalOrders}
          change={orders.growth}
          icon={ShoppingBag}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(overview.averageOrderValue)}
          change={revenue.aovGrowth}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <MetricCard
          title="Customer Rating"
          value={overview.averageRating.toFixed(1)}
          change={performance.ratingChange}
          icon={Star}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Revenue Chart */}
      <ChartContainer title="Revenue Trend">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenue.dailyData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#f97316" 
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Orders & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <ChartContainer title="Order Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orders.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {orders.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Payment Method Distribution */}
        <ChartContainer title="Payment Methods">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orders.paymentDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Top Dishes */}
      <ChartContainer title="Top Performing Dishes">
        <div className="space-y-4">
          {dishes.topDishes.map((dish, index) => (
            <div key={dish._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
                  <span className="text-sm font-bold text-orange-600">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{dish.name}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center space-x-1">
                      <ShoppingBag className="w-3 h-3" />
                      <span>{dish.orders} orders</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>{dish.rating.toFixed(1)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{dish.views} views</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(dish.revenue)}</p>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Customer Insights</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Customers</span>
              <span className="font-semibold">{customers.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Customers</span>
              <span className="font-semibold text-green-600">+{customers.new}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Repeat Rate</span>
              <span className="font-semibold">{customers.repeatRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Prep Time</span>
              <span className="font-semibold">{performance.avgPrepTime} min</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Acceptance Rate</span>
              <span className="font-semibold text-green-600">{performance.acceptanceRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cancellation Rate</span>
              <span className="font-semibold text-red-600">{performance.cancellationRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Trends</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Hours</span>
              <span className="font-semibold">{trends.peakHours}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Top Category</span>
              <span className="font-semibold">{trends.topCategory}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Growth Rate</span>
              <span className={`font-semibold ${trends.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(trends.growthRate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <ChartContainer title="Order Volume by Hour">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={orders.hourlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="orders" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default AnalyticsInsights;