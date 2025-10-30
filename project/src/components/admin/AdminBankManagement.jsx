import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, AlertCircle, Search, Filter, Eye, Edit, Clock, DollarSign, Building } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

const AdminBankManagement = () => {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState('');

  // ✅ FIX: Get token from the correct location
  const getAuthToken = () => {
    const token = localStorage.getItem('adminToken');
    console.log('🔑 Admin token found:', token ? 'Yes' : 'No');
    if (!token) {
      setError('Admin authentication required. Please login again.');
    }
    return token;
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      await Promise.all([loadStats(), loadSellers()]);
    } catch (err) {
      console.error('Load data error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      console.log('📊 Loading bank stats...');
      
      const response = await fetch(`${API_BASE}/admin/bank-details/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin authentication failed. Please login again.');
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Stats loaded:', data);
        setStats(data.stats);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load stats');
      }
    } catch (err) {
      console.error('❌ Load stats error:', err);
      setError(err.message);
    }
  };

  const loadSellers = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      console.log('👥 Loading sellers with filter:', filter);
      
      const statusParam = filter === 'all' ? '' : `?status=${filter}`;
      
      const response = await fetch(`${API_BASE}/admin/bank-details${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Admin authentication failed. Please login again.');
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sellers loaded:', data.data?.length || 0);
        setSellers(data.data || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load sellers');
      }
    } catch (err) {
      console.error('❌ Load sellers error:', err);
      setError(err.message);
    }
  };

  const handleVerify = async (sellerId, verified, notes = '') => {
    try {
      setVerifyingId(sellerId);
      const token = getAuthToken();
      if (!token) return;

      console.log('✅ Verifying bank details for seller:', sellerId);

      const response = await fetch(`${API_BASE}/admin/bank-details/${sellerId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ verified, notes })
      });

      if (response.ok) {
        alert(verified ? 'Bank details verified successfully!' : 'Bank details rejected');
        loadData();
        setShowDetailModal(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update verification status');
      }
    } catch (err) {
      console.error('Verify error:', err);
      alert('Failed to update verification status');
    } finally {
      setVerifyingId(null);
    }
  };

  const viewDetails = async (sellerId) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/admin/bank-details/${sellerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSeller(data.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('View details error:', err);
    }
  };

  const filteredSellers = sellers.filter(seller => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      seller.businessName?.toLowerCase().includes(search) ||
      seller.email?.toLowerCase().includes(search) ||
      seller.bankDetails?.accountHolderName?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bank details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
        <button
          onClick={() => {
            setError('');
            loadData();
          }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Sellers"
            value={stats.totalSellers}
            icon={<Building className="w-6 h-6" />}
            color="bg-blue-500"
          />
          <StatCard
            title="With Bank Details"
            value={stats.totalWithBankDetails}
            icon={<CreditCard className="w-6 h-6" />}
            color="bg-purple-500"
          />
          <StatCard
            title="Verified"
            value={stats.verified}
            icon={<CheckCircle className="w-6 h-6" />}
            color="bg-green-500"
          />
          <StatCard
            title="Pending Verification"
            value={stats.pending}
            icon={<Clock className="w-6 h-6" />}
            color="bg-yellow-500"
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats?.totalWithBankDetails || 0})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats?.pending || 0})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'verified'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Verified ({stats?.verified || 0})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Holder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No bank details found</p>
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{seller.businessName}</p>
                        <p className="text-sm text-gray-500">{seller.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {seller.bankDetails ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {seller.bankDetails.bankName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {seller.bankDetails.ifscCode}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {seller.bankDetails?.accountHolderName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {seller.bankDetails?.isVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {seller.registeredAt ? new Date(seller.registeredAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewDetails(seller.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!seller.bankDetails?.isVerified && seller.bankDetails && (
                          <>
                            <button
                              onClick={() => handleVerify(seller.id, true)}
                              disabled={verifyingId === seller.id}
                              className="text-green-600 hover:text-green-800 font-medium text-sm disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVerify(seller.id, false, 'Rejected by admin')}
                              disabled={verifyingId === seller.id}
                              className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Bank Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Restaurant Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Restaurant Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Business Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSeller.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Owner:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSeller.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSeller.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSeller.phone}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              {selectedSeller.bankDetails ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Bank Account Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Bank Name:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSeller.bankDetails.bankName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Account Holder:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSeller.bankDetails.accountHolderName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Account Number:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSeller.bankDetails.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">IFSC Code:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedSeller.bankDetails.ifscCode}
                      </span>
                    </div>
                    {selectedSeller.bankDetails.branchName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Branch:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedSeller.bankDetails.branchName}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Verification Status:</span>
                        {selectedSeller.bankDetails.isVerified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified on {new Date(selectedSeller.bankDetails.verifiedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending Verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No bank details provided</p>
                </div>
              )}

              {/* Action Buttons */}
              {selectedSeller.bankDetails && !selectedSeller.bankDetails.isVerified && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleVerify(selectedSeller.id, true)}
                    disabled={verifyingId === selectedSeller.id}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verify & Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) handleVerify(selectedSeller.id, false, reason);
                    }}
                    disabled={verifyingId === selectedSeller.id}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-xl shadow-md p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${color} text-white p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

export default AdminBankManagement;