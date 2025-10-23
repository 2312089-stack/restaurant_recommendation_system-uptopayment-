import React, { useState, useEffect } from 'react';
import { Users, Store, ShoppingBag, DollarSign, Activity, TrendingUp, AlertCircle, Clock, Package, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('month');
  
  const [analytics, setAnalytics] = useState({
    revenue: null,
    userAnalytics: null,
    orderAnalytics: null,
    restaurantAnalytics: null,
    systemStats: null
  });

  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      console.log('📌 Found existing token, validating...');
      validateAndSetToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateAndSetToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/test`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        console.log('✅ Token is valid');
        setAuthToken(token);
        setIsAuthenticated(true);
      } else {
        console.log('❌ Token is invalid, clearing...');
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Token validation error:', err);
      localStorage.removeItem('adminToken');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && authToken) {
      if (activeTab === 'dashboard') {
        fetchAllAnalytics();
      } else if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'restaurants') {
        fetchRestaurants();
      } else if (activeTab === 'orders') {
        fetchOrders();
      }
    }
  }, [activeTab, period, isAuthenticated, authToken]);

  const handleLogin = async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      console.log('🔐 Attempting admin login...');
      
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('📨 Login response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success && data.token) {
        console.log('✅ Login successful, saving token');
        localStorage.setItem('adminToken', data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        setError(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.message);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    setAuthToken('');
    setIsAuthenticated(false);
    localStorage.removeItem('adminToken');
    setAnalytics({
      revenue: null,
      userAnalytics: null,
      orderAnalytics: null,
      restaurantAnalytics: null,
      systemStats: null
    });
    setUsers([]);
    setRestaurants([]);
    setOrders([]);
    setError(null);
  };

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Fetching analytics with token:', authToken.substring(0, 20) + '...');
      
      const [revenue, userAnalytics, orderAnalytics, restaurantAnalytics, systemStats] = await Promise.all([
        fetchAnalytics('revenue'),
        fetchAnalytics('users'),
        fetchAnalytics('orders'),
        fetchAnalytics('restaurants'),
        fetchSystemStats()
      ]);

      setAnalytics({ revenue, userAnalytics, orderAnalytics, restaurantAnalytics, systemStats });
      console.log('✅ Analytics loaded successfully');
    } catch (err) {
      console.error('❌ Analytics fetch error:', err);
      setError(err.message);
      
      if (err.message.includes('expired') || err.message.includes('401')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (type) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/analytics/${type}?period=${period}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Session expired. Please login again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${type} analytics`);
      }
      
      const data = await response.json();
      return data.analytics || data;
    } catch (error) {
      console.error(`${type} analytics error:`, error);
      throw error;
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/analytics/system-stats`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch system stats');
      }
      
      const data = await response.json();
      return data.stats || data;
    } catch (error) {
      console.error('System stats error:', error);
      throw error;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Blocked by admin' })
      });

      if (!response.ok) throw new Error('Failed to block user');
      fetchUsers();
    } catch (err) {
      console.error('Block user error:', err);
      alert('Failed to block user: ' + err.message);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/unblock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to unblock user');
      fetchUsers();
    } catch (err) {
      console.error('Unblock user error:', err);
      alert('Failed to unblock user: ' + err.message);
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/restaurants`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch restaurants');

      const data = await response.json();
      setRestaurants(data.restaurants || []);
      setError(null);
    } catch (err) {
      console.error('Fetch restaurants error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRestaurant = async (sellerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/restaurants/${sellerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to approve restaurant');
      fetchRestaurants();
    } catch (err) {
      console.error('Approve restaurant error:', err);
      alert('Failed to approve restaurant: ' + err.message);
    }
  };

  const handleRejectRestaurant = async (sellerId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/restaurants/${sellerId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'Rejected by admin' })
      });

      if (!response.ok) throw new Error('Failed to reject restaurant');
      fetchRestaurants();
    } catch (err) {
      console.error('Reject restaurant error:', err);
      alert('Failed to reject restaurant: ' + err.message);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={error} loading={loading} />;
  }

  if (loading && activeTab === 'dashboard' && !analytics.systemStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Fetching analytics data</p>
        </div>
      </div>
    );
  }

  const { revenue, userAnalytics, orderAnalytics, restaurantAnalytics, systemStats } = analytics;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-gray-400 mt-1">TasteSphere</p>
        </div>
        
        <nav className="mt-8">
          <NavButton icon={<Activity className="w-5 h-5 mr-3" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={<Users className="w-5 h-5 mr-3" />} label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavButton icon={<Store className="w-5 h-5 mr-3" />} label="Restaurants" active={activeTab === 'restaurants'} onClick={() => setActiveTab('restaurants')} />
          <NavButton icon={<ShoppingBag className="w-5 h-5 mr-3" />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition">
            Logout
          </button>
        </div>
      </div>

      <div className="ml-64 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-gray-500 mt-1">
              {activeTab === 'dashboard' && 'Overview of platform statistics'}
              {activeTab === 'users' && 'Manage registered users'}
              {activeTab === 'restaurants' && 'Manage restaurant partners'}
              {activeTab === 'orders' && 'Monitor all orders'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {activeTab === 'dashboard' && (
              <div className="flex space-x-3">
                {['today', 'week', 'month', 'year'].map((p) => (
                  <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg font-medium transition ${period === p ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => {
              if (activeTab === 'dashboard') fetchAllAnalytics();
              else if (activeTab === 'users') fetchUsers();
              else if (activeTab === 'restaurants') fetchRestaurants();
              else if (activeTab === 'orders') fetchOrders();
            }} className="bg-white p-2 rounded-lg shadow hover:shadow-md transition" title="Refresh">
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600 text-sm underline mt-1">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && systemStats && (
          <DashboardView revenue={revenue} userAnalytics={userAnalytics} orderAnalytics={orderAnalytics} restaurantAnalytics={restaurantAnalytics} systemStats={systemStats} />
        )}

        {activeTab === 'users' && (
          <UsersView users={users} loading={loading} onBlockUser={handleBlockUser} onUnblockUser={handleUnblockUser} />
        )}

        {activeTab === 'restaurants' && (
          <RestaurantsView restaurants={restaurants} loading={loading} onApprove={handleApproveRestaurant} onReject={handleRejectRestaurant} />
        )}

        {activeTab === 'orders' && (
          <OrdersView orders={orders} loading={loading} />
        )}
      </div>
    </div>
  );
};

const LoginForm = ({ onLogin, error, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 mt-2">TasteSphere Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@tastesphere.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required disabled={loading} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required disabled={loading} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center px-6 py-3 text-left transition ${active ? 'bg-gray-800 border-l-4 border-orange-500' : 'hover:bg-gray-800'}`}>
    {icon}{label}
  </button>
);

const DashboardView = ({ revenue, userAnalytics, orderAnalytics, restaurantAnalytics, systemStats }) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard title="Total Revenue" value={`₹${revenue?.summary?.totalRevenue?.toFixed(2) || '0.00'}`} change="+12.5%" icon={<DollarSign className="w-6 h-6" />} color="green" />
      <MetricCard title="Total Orders" value={revenue?.summary?.totalOrders || 0} change="+8.2%" icon={<ShoppingBag className="w-6 h-6" />} color="blue" />
      <MetricCard title="Active Users" value={userAnalytics?.activeUsers?.activeUserCount || systemStats?.totalUsers || 0} change="+15.3%" icon={<Users className="w-6 h-6" />} color="purple" />
      <MetricCard title="Restaurants" value={systemStats?.totalRestaurants || 0} change="+5.1%" icon={<Store className="w-6 h-6" />} color="orange" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenue?.dailyRevenue || []}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="_id.date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Stats</h2>
        <div className="space-y-4">
          <StatItem label="Total Users" value={systemStats?.totalUsers || 0} icon={<Users className="w-5 h-5" />} />
          <StatItem label="Restaurants" value={systemStats?.totalRestaurants || 0} icon={<Store className="w-5 h-5" />} />
          <StatItem label="Total Orders" value={systemStats?.totalOrders || 0} icon={<ShoppingBag className="w-5 h-5" />} />
          <StatItem label="Active Orders" value={systemStats?.activeOrders || 0} icon={<Clock className="w-5 h-5" />} />
          <StatItem label="Total Dishes" value={systemStats?.totalDishes || 0} icon={<Package className="w-5 h-5" />} />
        </div>
      </div>
    </div>
  </>
);

const StatItem = ({ label, value, icon }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center space-x-3">
      <div className="text-gray-600">{icon}</div>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
    <span className="font-bold text-gray-900">{value}</span>
  </div>
);

const UsersView = ({ users, loading, onBlockUser, onUnblockUser }) => {
  if (loading) return <div className="text-center py-12">Loading users...</div>;
  if (users.length === 0) return (
    <div className="bg-white rounded-lg shadow-md p-12 text-center">
      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">No users found</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{user.emailId}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{user.orderCount || 0}</td>
              <td className="px-6 py-4 text-sm font-medium text-green-600">₹{(user.totalSpent || 0).toFixed(2)}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {user.isActive ? 'Active' : 'Blocked'}
                </span>
              </td>
              <td className="px-6 py-4">
                {user.isActive ? (
                  <button onClick={() => onBlockUser(user._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Block</button>
                ) : (
                  <button onClick={() => onUnblockUser(user._id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Unblock</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RestaurantsView = ({ restaurants, loading, onApprove, onReject }) => {
  if (loading) return <div className="text-center py-12">Loading restaurants...</div>;
  if (restaurants.length === 0) return (
    <div className="bg-white rounded-lg shadow-md p-12 text-center">
      <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">No restaurants found</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {restaurants.map((restaurant) => (
            <tr key={restaurant._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{restaurant.businessName}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{restaurant.email}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{restaurant.stats?.orderCount || 0}</td>
              <td className="px-6 py-4 text-sm font-medium text-green-600">₹{(restaurant.stats?.totalRevenue || 0).toFixed(2)}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${restaurant.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {restaurant.isVerified ? 'Verified' : 'Pending'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex space-x-2">
                  {!restaurant.isVerified ? (
                    <>
                      <button onClick={() => onApprove(restaurant._id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Approve</button>
                      <button onClick={() => onReject(restaurant._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Reject</button>
                    </>
                  ) : (
                    <span className="text-gray-400 text-sm">Verified</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OrdersView = ({ orders, loading }) => {
  if (loading) return <div className="text-center py-12">Loading orders...</div>;
  if (orders.length === 0) return (
    <div className="bg-white rounded-lg shadow-md p-12 text-center">
      <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">No orders found</p>
    </div>
  );

  const getStatusColor = (status) => {
    const colors = {
      'delivered': 'bg-green-100 text-green-800',
      'out_for_delivery': 'bg-blue-100 text-blue-800',
      'preparing': 'bg-yellow-100 text-yellow-800',
      'pending': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'seller_accepted': 'bg-blue-100 text-blue-800',
      'pending_seller': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.orderId}</td>
              <td className="px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                  <p className="text-xs text-gray-500">{order.customerEmail}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{order.seller?.businessName || order.item?.restaurant || 'N/A'}</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{order.totalAmount?.toFixed(2)}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {order.paymentMethod === 'cod' ? 'COD' : order.paymentStatus}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.orderStatus)}`}>
                  {order.orderStatus?.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MetricCard = ({ title, value, change, icon, color }) => {
  const colors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  const isPositive = change.startsWith('+');

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors[color]} text-white p-3 rounded-lg`}>{icon}</div>
        <div className={`flex items-center space-x-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          <span>{change}</span>
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default AdminDashboard;