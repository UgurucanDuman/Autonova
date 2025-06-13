import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, AlertTriangle, CheckCircle, X, 
  Search, User, Calendar, Eye, 
  Check, Filter, ChevronDown, ChevronUp, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface DamageReport {
  id: string;
  listing_id: string;
  user_id: string;
  description: string;
  location: string;
  incident_date: string;
  damage_type: 'minor' | 'moderate' | 'severe';
  repair_history?: string;
  insurance_claim: boolean;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
  listing?: {
    brand: string;
    model: string;
    year: number;
  };
  damage_images?: {
    id: string;
    url: string;
  }[];
}

export const AdminDamageReports = () => {
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [damageTypeFilter, setDamageTypeFilter] = useState<'all' | 'minor' | 'moderate' | 'severe'>('all');

  // Get admin ID from session
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.admin_id) {
          setAdminId(session.admin_id);
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
      }
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('damage_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'damage_reports'
      }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch damage reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Use the admin_view_damage_reports function to bypass RLS
      const { data, error } = await supabase
        .from('damage_reports')
        .select(`
          *,
          user:users (
            full_name,
            email
          ),
          listing:car_listings (
            brand,
            model,
            year
          ),
          damage_images (
            id,
            url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (err) {
      console.error('Error fetching damage reports:', err);
      setError('Hasar raporları yüklenirken bir hata oluştu');
      toast.error('Hasar raporları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter reports based on search term, status, and damage type
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.listing?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.listing?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesDamageType = damageTypeFilter === 'all' || report.damage_type === damageTypeFilter;
    
    return matchesSearch && matchesStatus && matchesDamageType;
  });

  // Handle approving a damage report
  const handleApproveReport = async (reportId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(reportId);
    try {
      // Update report status
      const { error } = await supabase
        .from('damage_reports')
        .update({
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Hasar raporu onaylandı');
      await fetchReports();
    } catch (err) {
      console.error('Error approving damage report:', err);
      toast.error('Hasar raporu onaylanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle rejecting a damage report
  const handleRejectReport = async (reportId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }

    setProcessing(reportId);
    try {
      // Update report status
      const { error } = await supabase
        .from('damage_reports')
        .update({
          status: 'rejected',
          admin_notes: rejectionReason,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Hasar raporu reddedildi');
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchReports();
    } catch (err) {
      console.error('Error rejecting damage report:', err);
      toast.error('Hasar raporu reddedilemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Get damage type badge
  const getDamageTypeBadge = (type: string) => {
    switch (type) {
      case 'minor':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Hafif Hasar
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            Orta Hasar
          </span>
        );
      case 'severe':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            Ağır Hasar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            Bilinmiyor
          </span>
        );
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <X className="w-3 h-3 mr-1" />
            Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Beklemede
          </span>
        );
    }
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
    <div className="space-y-4">
      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Araç, kullanıcı veya hasar açıklaması ile ara..."
            className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>Filtreler</span>
              {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Durum
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tümü</option>
                      <option value="pending">Beklemede</option>
                      <option value="approved">Onaylandı</option>
                      <option value="rejected">Reddedildi</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hasar Tipi
                    </label>
                    <select
                      value={damageTypeFilter}
                      onChange={(e) => setDamageTypeFilter(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tümü</option>
                      <option value="minor">Hafif Hasar</option>
                      <option value="moderate">Orta Hasar</option>
                      <option value="severe">Ağır Hasar</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <div 
            key={report.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                    <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {report.listing?.brand} {report.listing?.model} {report.listing?.year}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{report.user?.full_name || 'Bilinmiyor'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(report.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{report.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getStatusBadge(report.status)}
                      {getDamageTypeBadge(report.damage_type)}
                      {report.insurance_claim && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Sigorta Talebi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {report.description}
                </p>
                
                {/* Rejection reason */}
                {report.status === 'rejected' && report.admin_notes && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <span className="font-medium">Red sebebi:</span> {report.admin_notes}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  onClick={() => {
                    setSelectedReport(report);
                    setShowReportModal(report.id);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  İncele
                </button>
                
                {report.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApproveReport(report.id)}
                      disabled={processing === report.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Onayla
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowRejectModal(report.id);
                        setSelectedReport(report);
                      }}
                      disabled={processing === report.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reddet
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredReports.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || damageTypeFilter !== 'all'
                ? 'Aranan kriterlere uygun hasar raporu bulunamadı.'
                : 'Henüz hasar raporu yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Hasar Raporunu Reddet
              </h3>
              <button 
                onClick={() => {
                  setShowRejectModal(null);
                  setSelectedReport(null);
                  setRejectionReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Red Sebebi
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Hasar raporunu neden reddettiğinizi açıklayın..."
                  required
                />
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Bu hasar raporunu reddetmek üzeresiniz. Red sebebi kullanıcıya bildirilecektir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setSelectedReport(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleRejectReport(showRejectModal)}
                  disabled={processing === showRejectModal || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showRejectModal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      <span>Reddet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Car className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                Hasar Raporu Detayı
              </h3>
              <button 
                onClick={() => {
                  setShowReportModal(null);
                  setSelectedReport(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Araç Bilgileri
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Marka:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedReport.listing?.brand || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedReport.listing?.model || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Yıl:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedReport.listing?.year || '-'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Hasar Bilgileri
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Hasar Tipi:</span>
                      <span className="font-medium">{getDamageTypeBadge(selectedReport.damage_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Konum:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedReport.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Olay Tarihi:</span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {format(new Date(selectedReport.incident_date), 'dd.MM.yyyy', { locale: tr })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sigorta Talebi:</span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {selectedReport.insurance_claim ? 'Evet' : 'Hayır'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Rapor Tarihi:</span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {format(new Date(selectedReport.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                      <span>{getStatusBadge(selectedReport.status)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Kullanıcı Bilgileri
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ad Soyad:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedReport.user?.full_name || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">E-posta:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedReport.user?.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Hasar Açıklaması
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>
                
                {selectedReport.repair_history && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                      Onarım Geçmişi
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {selectedReport.repair_history}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedReport.status === 'rejected' && selectedReport.admin_notes && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                      Red Sebebi
                    </h4>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <p className="text-red-700 dark:text-red-300">
                        {selectedReport.admin_notes}
                      </p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Hasar Fotoğrafları
                  </h4>
                  {selectedReport.damage_images && selectedReport.damage_images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReport.damage_images.map((image) => (
                        <a 
                          key={image.id} 
                          href={image.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={image.url} 
                            alt="Hasar Fotoğrafı" 
                            className="w-full h-40 object-cover rounded-lg hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                      <p className="text-gray-500 dark:text-gray-400">Fotoğraf yok</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedReport.status === 'pending' && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReportModal(null);
                    setShowRejectModal(selectedReport.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Reddet</span>
                </button>
                
                <button
                  onClick={() => {
                    handleApproveReport(selectedReport.id);
                    setShowReportModal(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Onayla</span>
                </button>
              </div>
            )}
            
            {selectedReport.status !== 'pending' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowReportModal(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};