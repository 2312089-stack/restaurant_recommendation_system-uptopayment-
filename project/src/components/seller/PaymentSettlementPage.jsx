// PaymentSettlementPage.jsx - Payment & Settlement Dashboard Component
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Download, Calendar, 
  CreditCard, AlertCircle, Loader2, ChevronRight,
  FileText, ArrowUpRight, CheckCircle, Clock
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const PaymentSettlementPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settlementData, setSettlementData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchSettlementData();
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

      console.log('📊 Settlement data:', data);
      setSettlementData(data.data);

    } catch (err) {
      console.error('❌ Fetch settlement error:', err);
      setError(err.message || 'Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
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
      console.error('Download error:', err);
      alert('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, bgColor }) => (
    <div className={`${bgColor} rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <ArrowUpRight className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading settlement data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchSettlementData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
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
      </div>
    );
  }

  const { summary, currentWeek, pastSettlements, recentOrders } = settlementData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Settlements</h1>
          <p className="text-gray-600 mt-1">Track your earnings and settlements</p>
        </div>
        <button
          onClick={handleDownloadReport}
          disabled={downloading}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>{downloading ? 'Downloading...' : 'Download Report'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={CheckCircle}
          title="Total Orders Count"
          value={summary.totalOrdersCount}
          subtitle="Razorpay Online Payment"
          color="bg-blue-500"
          bgColor="bg-white"
        />
        <StatCard
          icon={DollarSign}
          title="COD Amount"
          value={`₹${summary.codAmount.toLocaleString()}`}
          subtitle={`${summary.codOrdersCount} COD orders`}
          color="bg-green-500"
          bgColor="bg-white"
        />
        <StatCard
          icon={CreditCard}
          title="Razorpay Online"
          value={`₹${summary.razorpayAmount.toLocaleString()}`}
          subtitle={`${summary.razorpayOrdersCount} online payments`}
          color="bg-orange-500"
          bgColor="bg-white"
        />
      </div>

      {/* Current Week Settlement */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            Current Week Settlement Amount
          </h2>
          <p className="text-orange-100 text-sm">
            {currentWeek.orderCount} orders completed this week
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Service Fees (5%)</span>
            <span className="text-lg font-bold text-gray-900">
              ₹{currentWeek.serviceFees.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Total Revenue</span>
            <span className="text-lg font-semibold text-gray-700">
              ₹{currentWeek.totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">TCS (1%)</span>
            <span className="text-lg font-semibold text-gray-700">
              ₹{currentWeek.tcs.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">TDS (2%)</span>
            <span className="text-lg font-semibold text-gray-700">
              ₹{currentWeek.tds.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">TDS Deductions</span>
            <span className="text-lg font-semibold text-red-600">
              -₹{currentWeek.tdsDeductions.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center py-4 bg-green-50 rounded-lg px-4 mt-4">
            <span className="text-gray-900 font-bold text-lg">Net Settlement</span>
            <span className="text-2xl font-bold text-green-600">
              ₹{currentWeek.netSettlement.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => alert('View Previous History feature coming soon!')}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            View Previous History
          </button>
        </div>
      </div>

      {/* Past Settlements */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TCS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TDS Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pastSettlements.map((settlement, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(settlement.weekStart).toLocaleDateString()} - {new Date(settlement.weekEnd).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {settlement.orderCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{settlement.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ₹{settlement.tcs.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    -₹{settlement.tds.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    ₹{settlement.netSettlement.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pastSettlements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No past settlements found</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Settlement Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent Orders (Optional) */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.orderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{order.orderId}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.date).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{order.amount}</p>
                    <p className="text-xs text-gray-500">{order.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettlementPage;