// components/seller/dashboard/SellerDashboard.jsx - Seller portal dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Plus, Pencil, Trash2, Wifi, WifiOff, LayoutDashboard,
  UtensilsCrossed, ClipboardList, User, Save, Loader2, X, Star, AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';

const API = `${API_BASE_URL}/seller`;

const getToken = () => localStorage.getItem('sellerToken');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const getImageUrl = (path, fallback = 'https://via.placeholder.com/80x80?text=Dish') => {
  if (!path) return fallback;
  if (/^(https?:)?\/\//.test(path)) return path;
  const base = API_BASE_URL.replace(/\/api$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
};

const DishForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({
    name: initial?.name || '',
    price: initial?.price || '',
    category: initial?.category || 'Main Course',
    type: initial?.type || 'veg',
    description: initial?.description || '',
    preparationTime: initial?.preparationTime || 30,
    availability: initial?.availability !== false,
    image: initial?.image || '',
  });

  const categories = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Chinese', 'Indian', 'Continental', 'South Indian'];

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{initial ? 'Edit Dish' : 'Add New Dish'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dish Name *</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Butter Chicken"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={form.preparationTime}
                onChange={(e) => update('preparationTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="https://... or /uploads/dish.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows="3"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Short description of the dish"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.availability}
              onChange={(e) => update('availability', e.target.checked)}
              className="w-4 h-4 text-orange-500"
            />
            Available on menu
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name || !form.price}
            className="flex items-center gap-2 flex-1 justify-center bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {initial ? 'Save Changes' : 'Add Dish'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusChip = ({ status }) => {
  const colors = {
    confirmed: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-orange-100 text-orange-800',
    ready: 'bg-blue-100 text-blue-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  const label = status ? status.replace(/_/g, ' ') : status;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
};

const SellerDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDishForm, setShowDishForm] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [savingDish, setSavingDish] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, d, dishRes, orderRes] = await Promise.all([
        fetch(`${API}/profile`, { headers: authHeaders() }),
        fetch(`${API}/dashboard`, { headers: authHeaders() }),
        fetch(`${API}/menu/dishes`, { headers: authHeaders() }),
        fetch(`${API}/orders?status=all`, { headers: authHeaders() }),
      ]);

      const results = await Promise.all([p.json(), d.json(), dishRes.json(), orderRes.json()]);
      if (!results[0].success) throw new Error(results[0].error || 'Failed to load profile');

      setProfile(results[0].seller);
      setProfileForm({
        businessName: results[0].seller.businessName,
        phone: results[0].seller.phone,
        ownerName: results[0].seller.full?.businessDetails?.ownerName || '',
        description: results[0].seller.full?.businessDetails?.description || '',
      });
      setStats(results[1].success ? results[1].stats : null);
      setDishes(results[2].success ? results[2].dishes : []);
      setOrders(results[3].success ? results[3].orders : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('seller');
    localStorage.removeItem('sellerType');
    navigate('/seller/login', { replace: true });
  };

  const handleToggleStatus = async () => {
    if (!profile) return;
    setTogglingStatus(true);
    try {
      const res = await fetch(`${API}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isOnline: !profile.isOnline, dashboardStatus: !profile.isOnline ? 'online' : 'offline' }),
      });
      const data = await res.json();
      if (data.success) setProfile((prev) => ({ ...prev, ...data.seller }));
      else setError(data.error || 'Failed to update status');
    } catch {
      setError('Network error updating status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSaveDish = async (form) => {
    setSavingDish(true);
    setError('');
    try {
      const url = editingDish ? `${API}/menu/dish/${editingDish._id}` : `${API}/menu/dish`;
      const method = editingDish ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save dish');
      setShowDishForm(false);
      setEditingDish(null);
      const dishRes = await fetch(`${API}/menu/dishes`, { headers: authHeaders() });
      const dishData = await dishRes.json();
      if (dishData.success) setDishes(dishData.dishes);
      const dRes = await fetch(`${API}/dashboard`, { headers: authHeaders() });
      const dData = await dRes.json();
      if (dData.success) setStats(dData.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingDish(false);
    }
  };

  const handleDeleteDish = async (dishId) => {
    if (!window.confirm('Delete this dish from your menu?')) return;
    try {
      const res = await fetch(`${API}/menu/dish/${dishId}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete dish');
      setDishes((prev) => prev.filter((d) => d._id !== dishId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ orderStatus: status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update order');
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError('');
    try {
      const res = await fetch(`${API}/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update profile');
      setProfile((prev) => ({ ...prev, ...data.seller }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'dishes', label: 'Dishes', icon: UtensilsCrossed },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
              T
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">{profile?.businessName || 'Seller Dashboard'}</h1>
              <p className="text-xs text-gray-500">TasteSphere Seller Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                profile?.isOnline
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              {togglingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : profile?.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {profile?.isOnline ? 'Online' : 'Offline'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 pb-0 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === id
                  ? 'text-orange-600 border-orange-500'
                  : 'text-gray-500 border-transparent hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 font-bold px-1">✕</button>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Dishes on Menu', value: stats?.dishes ?? 0, color: 'from-orange-500 to-red-500' },
                { label: 'Total Orders', value: stats?.orders ?? 0, color: 'from-blue-500 to-indigo-500' },
                { label: 'Active Orders', value: stats?.activeOrders ?? 0, color: 'from-purple-500 to-pink-500' },
                { label: 'Revenue (₹)', value: stats?.revenue ?? 0, color: 'from-green-500 to-emerald-500' },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm text-gray-500 mb-2">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <div className={`h-1 mt-3 rounded-full bg-gradient-to-r ${card.color}`} />
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                <button onClick={() => setTab('orders')} className="text-sm text-orange-600 hover:underline">
                  View all
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet. Orders for "{profile?.businessName}" will appear here.</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order._id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-gray-900">{order.item?.name}</p>
                        <p className="text-xs text-gray-500">{order.customerName} · {order.orderId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{order.totalAmount}</p>
                        <StatusChip status={order.orderStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISHES */}
        {tab === 'dishes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Menu ({(dishes || []).length})</h2>
              <button
                onClick={() => { setEditingDish(null); setShowDishForm(true); }}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                Add Dish
              </button>
            </div>

            {(dishes || []).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Your menu is empty. Add your first dish.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dishes.map((dish) => (
                  <div key={dish._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <img
                      src={getImageUrl(dish.image)}
                      alt={dish.name}
                      className="w-full h-36 object-cover bg-gray-100"
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{dish.name}</h3>
                          <p className="text-xs text-gray-500">{dish.category} · {dish.type === 'veg' ? 'Veg' : 'Non-Veg'}</p>
                        </div>
                        <p className="font-bold text-orange-600">₹{dish.price}</p>
                      </div>
                      {dish.rating?.average > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600">{dish.rating.average.toFixed(1)} ({dish.rating.count || 0})</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${dish.availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {dish.availability ? 'Available' : 'Unavailable'}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingDish(dish); setShowDishForm(true); }}
                            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDish(dish._id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ORDERS */}
        {tab === 'orders' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders ({orders.length})</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No orders for your restaurant yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map((order) => (
                      <tr key={order._id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{order.orderId}<div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</div></td>
                        <td className="px-4 py-3">{order.customerName}</td>
                        <td className="px-4 py-3">{order.item?.name}<div className="text-xs text-gray-400">{order.item?.restaurant}</div></td>
                        <td className="px-4 py-3 font-semibold">₹{order.totalAmount}</td>
                        <td className="px-4 py-3"><StatusChip status={order.orderStatus} /></td>
                        <td className="px-4 py-3">
                          {(order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') ? (
                            <span className="text-xs text-gray-400">Final</span>
                          ) : (
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                              className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="out_for_delivery">Out for delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && profileForm && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Profile</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  value={profileForm.businessName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, businessName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input
                  value={profileForm.ownerName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, ownerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows="4"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-sm text-gray-600">
                <p><span className="font-medium">Account email:</span> {profile.email}</p>
                <p><span className="font-medium">Status:</span> {profile.isVerified ? 'Verified' : 'Pending verification'}</p>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </div>
        )}
      </main>

      {showDishForm && (
        <DishForm
          initial={editingDish}
          onSave={handleSaveDish}
          onCancel={() => { setShowDishForm(false); setEditingDish(null); }}
          saving={savingDish}
        />
      )}
    </div>
  );
};

export default SellerDashboard;