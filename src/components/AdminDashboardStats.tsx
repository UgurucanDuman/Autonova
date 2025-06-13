import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { Car, AlertTriangle, Filter, ChevronDown, ChevronUp, User, Clock, CreditCard } from 'lucide-react';

interface BrandCount {
  name: string;
  count: number;
}

interface ModelCount {
  name: string;
  count: number;
  brand: string;
}

interface ListingWithUser {
  id: string;
  brand: string;
  model: string;
  user_id: string;
  users: {
    full_name: string;
    email: string;
    profile_image_url?: string;
  };
}

export const AdminDashboardStats = () => {
  const [brandData, setBrandData] = useState<BrandCount[]>([]);
  const [modelData, setModelData] = useState<ModelCount[]>([]);
  const [listingsWithUsers, setListingsWithUsers] = useState<ListingWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'count' | 'alphabetical'>('count');
  const [limit, setLimit] = useState(10);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalListings, setTotalListings] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingListings, setPendingListings] = useState(0);

  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
    '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57',
    '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57',
    '#ffc658', '#ff8042', '#ff6361', '#bc5090', '#58508d'
  ];

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [statusFilter, sortBy, limit]);

  const fetchStats = async () => {
    try {
      // Fetch total listings count
      const { count: listingsCount, error: listingsError } = await supabase
        .from('car_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
        
      if (listingsError) throw listingsError;
      setTotalListings(listingsCount || 0);
      
      // Fetch total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
        
      if (usersError) throw usersError;
      setTotalUsers(usersCount || 0);
      
      // Fetch pending listings count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('car_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      if (pendingError) throw pendingError;
      setPendingListings(pendingCount || 0);
      
      // Fetch total revenue from completed purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('listing_purchases')
        .select('price')
        .eq('status', 'completed');
        
      if (purchasesError) throw purchasesError;
      
      // Calculate total revenue - Fix: Ensure we're properly parsing the price as a number
      let revenue = 0;
      if (purchasesData && purchasesData.length > 0) {
        revenue = purchasesData.reduce((sum, purchase) => {
          // Ensure price is treated as a number
          const price = typeof purchase.price === 'string' 
            ? parseFloat(purchase.price) 
            : Number(purchase.price);
          return sum + (isNaN(price) ? 0 : price);
        }, 0);
      }
      
      setTotalRevenue(revenue);
      
      console.log("Fetched revenue data:", { 
        purchasesData, 
        calculatedRevenue: revenue,
        purchaseCount: purchasesData?.length || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the query with status filter
      let query = supabase
        .from('car_listings')
        .select(`
          *,
          users (
            full_name,
            email,
            profile_image_url
          )
        `);
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setBrandData([]);
        setModelData([]);
        setListingsWithUsers([]);
        setLoading(false);
        return;
      }

      // Save listings with user data
      setListingsWithUsers(data as ListingWithUser[]);

      // Count brands
      const brandCounts: Record<string, number> = {};
      data.forEach(item => {
        if (item.brand) {
          brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
        }
      });

      // Count models
      const modelCounts: Record<string, { count: number; brand: string }> = {};
      data.forEach(item => {
        if (item.model && item.brand) {
          const key = `${item.brand}-${item.model}`;
          modelCounts[key] = {
            count: (modelCounts[key]?.count || 0) + 1,
            brand: item.brand
          };
        }
      });

      // Convert to arrays for charts
      let brandArray = Object.entries(brandCounts).map(([name, count]) => ({ name, count }));
      let modelArray = Object.entries(modelCounts).map(([key, { count, brand }]) => {
        const name = key.split('-')[1];
        return { name, count, brand };
      });

      // Sort data
      if (sortBy === 'count') {
        brandArray = brandArray.sort((a, b) => b.count - a.count);
        modelArray = modelArray.sort((a, b) => b.count - a.count);
      } else {
        brandArray = brandArray.sort((a, b) => a.name.localeCompare(b.name));
        modelArray = modelArray.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Limit data
      brandArray = brandArray.slice(0, limit);
      
      // If a brand is selected, filter models
      if (selectedBrand) {
        modelArray = modelArray.filter(model => model.brand === selectedBrand);
      }
      
      modelArray = modelArray.slice(0, limit);

      setBrandData(brandArray);
      setModelData(modelArray);
    } catch (err) {
      console.error('Error fetching distribution data:', err);
      setError('Veri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandClick = (brand: string) => {
    if (selectedBrand === brand) {
      setSelectedBrand(null);
    } else {
      setSelectedBrand(brand);
      
      // Filter model data for the selected brand
      const filteredModels = modelData.filter(model => model.brand === brand);
      if (filteredModels.length > 0) {
        setModelData(filteredModels);
      } else {
        // Refetch data for this brand if no models are found
        fetchModelsByBrand(brand);
      }
    }
  };

  const fetchModelsByBrand = async (brand: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('car_listings')
        .select(`
          model,
          users (
            full_name,
            email,
            profile_image_url
          )
        `)
        .eq('brand', brand);
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setModelData([]);
        setLoading(false);
        return;
      }
      
      // Count models
      const modelCounts: Record<string, number> = {};
      data.forEach(item => {
        if (item.model) {
          modelCounts[item.model] = (modelCounts[item.model] || 0) + 1;
        }
      });
      
      // Convert to array for chart
      let modelArray = Object.entries(modelCounts).map(([name, count]) => ({ 
        name, 
        count, 
        brand 
      }));
      
      // Sort data
      if (sortBy === 'count') {
        modelArray = modelArray.sort((a, b) => b.count - a.count);
      } else {
        modelArray = modelArray.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // Limit data
      modelArray = modelArray.slice(0, limit);
      
      setModelData(modelArray);
    } catch (err) {
      console.error('Error fetching models by brand:', err);
      setError('Model verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSortBy('count');
    setLimit(10);
    setSelectedBrand(null);
    fetchData();
  };

  // Get listings for a specific brand and model
  const getListingsForBrandModel = (brand: string, model?: string) => {
    return listingsWithUsers.filter(listing => 
      listing.brand === brand && (model ? listing.model === model : true)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <Filter className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Filtreler
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {showFilters ? (
              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İlan Durumu
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tümü</option>
                <option value="approved">Onaylı</option>
                <option value="pending">Beklemede</option>
                <option value="rejected">Reddedilmiş</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sıralama
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="count">Sayıya Göre</option>
                <option value="alphabetical">Alfabetik</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gösterilecek Sayı
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="mt-4 flex justify-between">
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={showUserDetails}
                  onChange={() => setShowUserDetails(!showUserDetails)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Kullanıcı Detaylarını Göster
                </span>
              </label>
            </div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Filtreleri Sıfırla
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Listings */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex items-center space-x-3">
            <Car className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Toplam İlan</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalListings}</p>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Toplam Kullanıcı</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Pending Listings */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Bekleyen İlan</h3>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingListings}</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Toplam Gelir</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">₺{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <Car className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Marka Dağılımı {selectedBrand ? `- ${selectedBrand}` : ''}
        </h3>

        {brandData.length === 0 ? (
          <div className="text-center py-12">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Veri bulunamadı
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={brandData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const brand = data.activePayload[0].payload.name;
                      handleBrandClick(brand);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="name" 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      borderColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                      color: '#1f2937'
                    }}
                    formatter={(value) => [`${value} adet`, 'Sayı']}
                    labelFormatter={(label) => `Marka: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Araç Sayısı" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    onClick={(data) => handleBrandClick(data.name)}
                    cursor="pointer"
                  >
                    {brandData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} adet`, 'Sayı']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      borderColor: '#e2e8f0',
                      borderRadius: '0.5rem',
                      color: '#1f2937'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Model Distribution */}
      {selectedBrand && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <Car className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            {selectedBrand} Modelleri
          </h3>

          {modelData.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Bu marka için model verisi bulunamadı
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modelData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="name" 
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis className="text-gray-600 dark:text-gray-400" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        color: '#1f2937'
                      }}
                      formatter={(value) => [`${value} adet`, 'Sayı']}
                      labelFormatter={(label) => `Model: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      name="Araç Sayısı" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {modelData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} adet`, 'Sayı']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        borderColor: '#e2e8f0',
                        borderRadius: '0.5rem',
                        color: '#1f2937'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          {selectedBrand ? `${selectedBrand} Modelleri` : 'Marka Dağılımı'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  {selectedBrand ? 'Model' : 'Marka'}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sayı
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  Yüzde
                </th>
                {showUserDetails && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Kullanıcılar
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(selectedBrand ? modelData : brandData).map((item, index) => {
                const total = (selectedBrand ? modelData : brandData).reduce((sum, i) => sum + i.count, 0);
                const percentage = (item.count / total * 100).toFixed(1);
                const itemListings = selectedBrand 
                  ? getListingsForBrandModel(selectedBrand, item.name)
                  : getListingsForBrandModel(item.name);
                
                return (
                  <tr 
                    key={item.name}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                      %{percentage}
                    </td>
                    {showUserDetails && (
                      <td className="px-4 py-3 text-sm text-left text-gray-600 dark:text-gray-300">
                        <div className="flex flex-col space-y-1">
                          {itemListings.slice(0, 3).map((listing) => (
                            <div key={listing.id} className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                {listing.users?.profile_image_url ? (
                                  <img 
                                    src={listing.users.profile_image_url} 
                                    alt={listing.users.full_name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                )}
                              </div>
                              <span>{listing.users?.full_name || listing.users?.email || 'Bilinmeyen Kullanıcı'}</span>
                            </div>
                          ))}
                          {itemListings.length > 3 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              +{itemListings.length - 3} daha fazla kullanıcı
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Toplam
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(selectedBrand ? modelData : brandData).reduce((sum, item) => sum + item.count, 0)}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  %100
                </th>
                {showUserDetails && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {listingsWithUsers.length} farklı kullanıcı
                  </th>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};