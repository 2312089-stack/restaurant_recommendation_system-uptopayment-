import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Download, Calendar, 
  CreditCard, AlertCircle, Loader2, ChevronRight,
  FileText, ArrowUpRight, CheckCircle, Clock,
  Filter, Search, Eye, ChevronDown, BarChart3,
  TrendingDown, RefreshCw, Bell, Package
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const PaymentSettlementPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settlementData, setSettlementData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [expandedDay, setExpandedDay] = useState(null);
  const [realTimeOrders, setRealTimeOrders] = useState([]);

  useEffect(() => {
    fetchSettlementData();
    const interval = setInterval(fetchSettlementData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for Socket.IO events
  useEffect(() => {
    const handleOrderUpdate = (data) => {
      console.log('📦 Order updated:', data);
      fetchSettlementData(); // Refresh data
    };

    const handlePaymentReceived = (data) => {
      console.log('💰 Payment received:', data);
      fetchSettlementData(); // Refresh data
    };

    window.addEventListener('order-updated', handleOrderUpdate);
    window.addEventListener('payment-received', handlePaymentReceived);

    return () => {
      window.removeEventListener('order-updated', handleOrderUpdate);
      window.removeEventListener('payment-received', handlePaymentReceived);
    };
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('sellerToken') || localStorage.getItem('token');
  };

  const fetchSettlementData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = getAuthToken();
      if (!token) {
        setError('Please login to view settlements');
        return;
      }

      const response = await fetch(`${API_BASE}/settlement/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settlement data');
      }

      console.log('✅ Settlement data loaded:', data.data);
      setSettlementData(data.data);
      
      // Store real-time orders
      if (data.data.recentOrders) {
        setRealTimeOrders(data.data.recentOrders);
      }
    } catch (err) {
      console.error('❌ Fetch settlement error:', err);
      setError(err.message || 'Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDailyReport = async (date) => {
    try {
      setDownloading(true);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE}/settlement/report/daily?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAllReport = async () => {
    try {
      setDownloading(true);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE}/settlement/report/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-report-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, bgColor, trend, badge }) => (
    <div className={`${bgColor} rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative`}>
      {badge && (
        <div className="absolute top-3 right-3">
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full animate-pulse">
            {badge}
          </span>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend > 0 ? 'bg-green-100 text-green-700' : trend < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {trend > 0 && <TrendingUp className="w-3 h-3" />}
            {trend < 0 && <TrendingDown className="w-3 h-3" />}
            <span>{trend === 0 ? 'No change' : `${Math.abs(trend)}%`}</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );

  if (loading && !settlementData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading settlement data...</p>
        </div>
      </div>
    );
  }

  if (error && !settlementData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchSettlementData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!settlementData) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No settlement data available</p>
        <button
          onClick={fetchSettlementData}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { summary, currentWeek, pastSettlements, dailySettlements, recentOrders } = settlementData;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Payments & Settlements
            {realTimeOrders.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Live
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Track your earnings and settlements in real-time</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSettlementData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleDownloadAllReport}
            disabled={downloading}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? 'Downloading...' : 'Download Report'}</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            viewMode === 'overview' 
              ? 'border-orange-500 text-orange-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setViewMode('daily')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            viewMode === 'daily' 
              ? 'border-orange-500 text-orange-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Daily Breakdown
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            viewMode === 'history' 
              ? 'border-orange-500 text-orange-600' 
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Settlement History
        </button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={CheckCircle}
              title="Total Completed Orders"
              value={summary.totalOrdersCount || 0}
              subtitle={`${summary.razorpayOrdersCount || 0} Online + ${summary.codOrdersCount || 0} COD`}
              color="bg-blue-500"
              bgColor="bg-white"
              trend={summary.totalOrdersCount > 0 ? 12 : 0}
              badge={summary.totalOrdersCount > 0 ? "Active" : null}
            />
            <StatCard
              icon={DollarSign}
              title="Cash on Delivery"
              value={`₹${(summary.codAmount || 0).toLocaleString()}`}
              subtitle={`${summary.codOrdersCount || 0} COD orders`}
              color="bg-green-500"
              bgColor="bg-white"
              trend={summary.codAmount > 0 ? 8 : 0}
            />
            <StatCard
              icon={CreditCard}
              title="Online Payments"
              value={`₹${(summary.razorpayAmount || 0).toLocaleString()}`}
              subtitle={`${summary.razorpayOrdersCount || 0} transactions`}
              color="bg-orange-500"
              bgColor="bg-white"
              trend={summary.razorpayAmount > 0 ? 15 : 0}
            />
          </div>

          {/* Current Week Settlement */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
                    Current Week Settlement
                    {currentWeek.orderCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-orange-700 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        <Package className="w-3 h-3" />
                        {currentWeek.orderCount} orders
                      </span>
                    )}
                  </h2>
                  <p className="text-orange-100 text-sm">
                    Real-time data • Updated every 10 seconds
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-orange-100 text-sm mb-1">Net Amount</p>
                  <p className="text-3xl font-bold text-white">
                    ₹{(currentWeek.netSettlement || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-orange-200">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-700 font-medium">Total Revenue</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  ₹{(currentWeek.totalRevenue || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-orange-200">
                <span className="text-gray-700">Platform Fees (5%)</span>
                <span className="text-lg font-semibold text-orange-600">
                  -₹{(currentWeek.serviceFees || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-orange-200">
                <span className="text-gray-700">TCS (1%)</span>
                <span className="text-lg font-semibold text-orange-600">
                  -₹{(currentWeek.tcs || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-orange-200">
                <span className="text-gray-700">TDS Deductions (2%)</span>
                <span className="text-lg font-semibold text-red-600">
                  -₹{(currentWeek.tdsDeductions || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-4 bg-green-50 rounded-lg px-4 mt-4 border-2 border-green-200">
                <span className="text-gray-900 font-bold text-lg flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Net Settlement</span>
                </span>
                <span className="text-2xl font-bold text-green-600">
                  ₹{(currentWeek.netSettlement || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          {recentOrders && recentOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{recentOrders.length} orders</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {recentOrders.slice(0, 10).map((order) => (
                    <div key={order.orderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">#{order.orderId}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            order.paymentMethod === 'razorpay' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {order.paymentMethod === 'razorpay' ? 'Online' : 'COD'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            order.status === 'delivered' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">₹{order.amount}</p>
                        <p className="text-xs text-gray-500">{order.customerName || 'Customer'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {recentOrders && recentOrders.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600">Your completed orders will appear here</p>
            </div>
          )}
        </>
      )}

      {/* Daily Breakdown and History modes remain the same */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Daily Settlement Breakdown</h2>
            <p className="text-sm text-gray-500 mt-1">Click on any day to view detailed transactions</p>
          </div>
          
          <div className="p-6">
            {dailySettlements && dailySettlements.length > 0 ? (
              <div className="space-y-3">
                {dailySettlements.map((day) => (
                  <div key={day.date} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {new Date(day.date).getDate()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {day.orderCount} orders • {day.razorpayCount} Online • {day.codCount} COD
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            ₹{day.netSettlement.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">Net Amount</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDailyReport(day.date);
                          }}
                          disabled={downloading}
                          className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                        >
                          <Download className="w-5 h-5 text-orange-600" />
                        </button>
                        <ChevronDown 
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedDay === day.date ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                    
                    {expandedDay === day.date && day.orders && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">Revenue</p>
                            <p className="text-lg font-bold text-blue-600">₹{day.revenue}</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-gray-600">Platform Fee</p>
                            <p className="text-lg font-bold text-orange-600">₹{day.serviceFees}</p>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-gray-600">TCS + TDS</p>
                            <p className="text-lg font-bold text-yellow-600">₹{(day.tcs + day.tds).toFixed(2)}</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600">Net Amount</p>
                            <p className="text-lg font-bold text-green-600">₹{day.netSettlement}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Orders on this day:</p>
                          <div className="space-y-2">
                            {day.orders.map((order) => (
                              <div key={order.orderId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono text-gray-600">#{order.orderId}</span>
                                  <span className="text-xs text-gray-500">{order.customerName}</span>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    order.paymentMethod === 'razorpay' 
                                      ? 'bg-orange-100 text-orange-700' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {order.paymentMethod === 'razorpay' ? 'Online' : 'COD'}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">₹{order.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No daily settlements found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'history' && pastSettlements && pastSettlements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Past Settlements</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Last {pastSettlements.length} weeks</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pastSettlements.map((settlement, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(settlement.weekStart).toLocaleDateString()} - {new Date(settlement.weekEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        {settlement.orderCount} orders
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{settlement.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      -₹{(settlement.serviceFees + settlement.tcs + settlement.tds).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      ₹{settlement.netSettlement.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettlementPage;