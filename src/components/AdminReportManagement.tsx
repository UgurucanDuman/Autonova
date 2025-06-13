import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Flag, Search, AlertTriangle, CheckCircle, 
  X, User, Calendar, Car, MessageSquare, Eye, 
  Trash2, Ban, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Report {
  id: string;
  listing_id?: string;
  message_id?: string;
  reporter_id: string;
  reason: string;
  details?: string;
  status: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  reporter?: {
    full_name: string;
    email: string;
  };
  listing?: {
    brand: string;
    model: string;
    year: number;
    user_id: string;
  };
  message?: {
    content: string;
    sender_id: string;
    receiver_id: string;
    listing_id?: string;
  };
  message_sender?: {
    full_name: string;
    email: string;
  };
  message_receiver?: {
    full_name: string;
    email: string;
  };
}

export const AdminReportManagement = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showProcessModal, setShowProcessModal] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'completed' | 'rejected' | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reportType, setReportType] = useState<'all' | 'listing' | 'message'>('all');
  const [reportStatus, setReportStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [deleteContent, setDeleteContent] = useState(false);
  const [blockUser, setBlockUser] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Get admin ID from session
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.admin_id) {
          setAdminId(session.admin_id);
        } else {
          toast.error('Admin oturumu geçersiz');
          navigate('/admin/login');
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
        toast.error('Admin oturumu geçersiz');
        navigate('/admin/login');
      }
    } else {
      toast.error('Admin oturumu bulunamadı');
      navigate('/admin/login');
    }
  }, [navigate]);

  // Subscribe to real-time updates
  useEffect(() => {
    const listingReportsSubscription = supabase
      .channel('listing_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'listing_reports'
      }, () => {
        fetchReports();
      })
      .subscribe();
      
    const messageReportsSubscription = supabase
      .channel('message_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reports'
      }, () => {
        fetchReports();
      })
      .subscribe();

    // Subscribe to admin reports changes
    const adminReportsSubscription = supabase
      .channel('admin_reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_reports'
      }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      listingReportsSubscription.unsubscribe();
      messageReportsSubscription.unsubscribe();
      adminReportsSubscription.unsubscribe();
    };
  }, [reportType, reportStatus]);

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      let listingReportsPromise = Promise.resolve({ data: [] as any[] });
      let messageReportsPromise = Promise.resolve({ data: [] as any[] });
      let adminReportsPromise = Promise.resolve({ data: [] as any[] });
      
      // Fetch listing reports if needed
      if (reportType === 'all' || reportType === 'listing') {
        const query = supabase
          .from('listing_reports')
          .select(`
            *,
            reporter:users(
              full_name,
              email
            ),
            listing:car_listings(
              brand,
              model,
              year,
              user_id
            )
          `)
          .order('created_at', { ascending: false });
          
        // Apply status filter
        if (reportStatus !== 'all') {
          query.eq('status', reportStatus);
        }
        
        listingReportsPromise = query;
      }
      
      // Fetch message reports if needed
      if (reportType === 'all' || reportType === 'message') {
        const query = supabase
          .from('message_reports')
          .select(`
            *,
            reporter:users(
              full_name,
              email
            ),
            message:messages(
              content,
              sender_id,
              receiver_id,
              listing_id
            ),
            message_sender:users(
              full_name,
              email
            ),
            message_receiver:users(
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false });
          
        // Apply status filter
        if (reportStatus !== 'all') {
          query.eq('status', reportStatus);
        }
        
        messageReportsPromise = query;
      }

      // Fetch admin reports if needed
      if (reportType === 'all' || reportType === 'listing') {
        const query = supabase
          .from('admin_reports')
          .select(`
            *,
            admin:admin_credentials(
              username,
              email
            ),
            listing:car_listings(
              brand,
              model,
              year,
              user_id
            )
          `)
          .order('created_at', { ascending: false });
          
        // Apply status filter
        if (reportStatus !== 'all') {
          query.eq('status', reportStatus);
        }
        
        adminReportsPromise = query;
      }
      
      // Wait for both queries to complete
      const [listingReportsResult, messageReportsResult, adminReportsResult] = await Promise.all([
        listingReportsPromise,
        messageReportsPromise,
        adminReportsPromise
      ]);
      
      // Check for errors
      if (listingReportsResult.error) throw listingReportsResult.error;
      if (messageReportsResult.error) throw messageReportsResult.error;
      if (adminReportsResult.error) throw adminReportsResult.error;
      
      // Process listing reports
      const listingReports = (listingReportsResult.data || []).map(report => ({
        ...report,
        type: 'listing'
      }));
      
      // Process message reports
      const messageReports = (messageReportsResult.data || []).map(report => ({
        ...report,
        type: 'message'
      }));

      // Process admin reports
      const adminReports = (adminReportsResult.data || []).map(report => ({
        ...report,
        type: 'admin_listing',
        reporter: report.admin,
        reporter_id: report.admin_id
      }));
      
      // Combine and sort by creation date
      const allReports = [...listingReports, ...messageReports, ...adminReports]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setReports(allReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Raporlar yüklenirken bir hata oluştu');
      toast.error('Raporlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, reportStatus]);

  // Filter reports based on search term
  const filteredReports = reports.filter(report => {
    const searchLower = searchTerm.toLowerCase();
    
    // Basic fields to search
    const basicMatch = 
      report.reason?.toLowerCase().includes(searchLower) ||
      report.details?.toLowerCase().includes(searchLower) ||
      report.reporter?.full_name?.toLowerCase().includes(searchLower) ||
      report.reporter?.email?.toLowerCase().includes(searchLower);
      
    // Listing-specific fields
    if ('listing' in report && report.listing) {
      return basicMatch || 
        report.listing.brand?.toLowerCase().includes(searchLower) ||
        report.listing.model?.toLowerCase().includes(searchLower);
    }
    
    // Message-specific fields
    if ('message' in report && report.message) {
      return basicMatch || 
        report.message.content?.toLowerCase().includes(searchLower) ||
        report.message_sender?.full_name?.toLowerCase().includes(searchLower) ||
        report.message_receiver?.full_name?.toLowerCase().includes(searchLower);
    }
    
    return basicMatch;
  });

  // Handle approving a report
  const handleApproveReport = async () => {
    if (!selectedReport || !adminId) return;
    
    setProcessing(selectedReport.id);
    try {
      if ('listing_id' in selectedReport && selectedReport.listing_id) {
        // Process listing report
        const { error } = await supabase.rpc('process_listing_report', {
          p_report_id: selectedReport.id,
          p_admin_id: adminId,
          p_status: 'approved',
          p_notes: resolutionNotes
        });
        
        if (error) throw error;
        
        // If block user is checked, block the listing owner
        if (blockUser && selectedReport.listing?.user_id) {
          const { error: blockError } = await supabase.rpc('block_user', {
            p_user_id: selectedReport.listing.user_id,
            p_admin_id: adminId,
            p_reason: `İlan raporu onaylandı: ${resolutionNotes || selectedReport.reason}`
          });
          
          if (blockError) {
            console.error('Error blocking user:', blockError);
            toast.error('Kullanıcı engellenemedi');
          } else {
            toast.success('Kullanıcı engellendi');
          }
        }
        
        // If delete content is checked, delete the listing
        if (deleteContent) {
          const { error: deleteError } = await supabase.rpc('admin_delete_listing', {
            p_listing_id: selectedReport.listing_id,
            p_admin_id: adminId
          });
            
          if (deleteError) {
            console.error('Error deleting listing:', deleteError);
            toast.error('İlan silinemedi');
          } else {
            toast.success('İlan silindi');
          }
        }
      } else if ('message_id' in selectedReport && selectedReport.message_id) {
        // Process message report
        const { error } = await supabase.rpc('process_message_report', {
          p_report_id: selectedReport.id,
          p_admin_id: adminId,
          p_status: 'approved',
          p_notes: resolutionNotes,
          p_delete_message: deleteContent
        });
        
        if (error) throw error;
        
        // If block user is checked, block the message sender
        if (blockUser && selectedReport.message?.sender_id) {
          const { error: blockError } = await supabase.rpc('block_user', {
            p_user_id: selectedReport.message.sender_id,
            p_admin_id: adminId,
            p_reason: `Mesaj raporu onaylandı: ${resolutionNotes || selectedReport.reason}`
          });
          
          if (blockError) {
            console.error('Error blocking user:', blockError);
            toast.error('Kullanıcı engellenemedi');
          } else {
            toast.success('Kullanıcı engellendi');
          }
        }
      } else if (selectedReport.type === 'admin_listing') {
        // Process admin report
        const { error } = await supabase
          .from('admin_reports')
          .update({
            status: 'approved',
            resolution_notes: resolutionNotes
          })
          .eq('id', selectedReport.id);
        
        if (error) throw error;
        
        // If delete content is checked, delete the listing
        if (deleteContent && selectedReport.listing_id) {
          const { error: deleteError } = await supabase.rpc('admin_delete_listing', {
            p_listing_id: selectedReport.listing_id,
            p_admin_id: adminId
          });
            
          if (deleteError) {
            console.error('Error deleting listing:', deleteError);
            toast.error('İlan silinemedi');
          } else {
            toast.success('İlan silindi');
          }
        }
        
        // If block user is checked, block the listing owner
        if (blockUser && selectedReport.listing?.user_id) {
          const { error: blockError } = await supabase.rpc('block_user', {
            p_user_id: selectedReport.listing.user_id,
            p_admin_id: adminId,
            p_reason: `İlan raporu onaylandı: ${resolutionNotes || selectedReport.reason}`
          });
          
          if (blockError) {
            console.error('Error blocking user:', blockError);
            toast.error('Kullanıcı engellenemedi');
          } else {
            toast.success('Kullanıcı engellendi');
          }
        }
      }
      
      toast.success('Rapor onaylandı');
      setShowApproveModal(null);
      setSelectedReport(null);
      setResolutionNotes('');
      setDeleteContent(false);
      setBlockUser(false);
      await fetchReports();
    } catch (err) {
      console.error('Error approving report:', err);
      toast.error('Rapor onaylanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle rejecting a report
  const handleRejectReport = async () => {
    if (!selectedReport || !adminId) return;
    
    setProcessing(selectedReport.id);
    try {
      if ('listing_id' in selectedReport && selectedReport.listing_id && selectedReport.type === 'listing') {
        // Process listing report
        const { error } = await supabase.rpc('process_listing_report', {
          p_report_id: selectedReport.id,
          p_admin_id: adminId,
          p_status: 'rejected',
          p_notes: resolutionNotes
        });
        
        if (error) throw error;
      } else if ('message_id' in selectedReport && selectedReport.message_id) {
        // Process message report
        const { error } = await supabase.rpc('process_message_report', {
          p_report_id: selectedReport.id,
          p_admin_id: adminId,
          p_status: 'rejected',
          p_notes: resolutionNotes,
          p_delete_message: false
        });
        
        if (error) throw error;
      } else if (selectedReport.type === 'admin_listing') {
        // Process admin report
        const { error } = await supabase
          .from('admin_reports')
          .update({
            status: 'rejected',
            resolution_notes: resolutionNotes
          })
          .eq('id', selectedReport.id);
        
        if (error) throw error;
      }
      
      toast.success('Rapor reddedildi');
      setShowRejectModal(null);
      setSelectedReport(null);
      setResolutionNotes('');
      await fetchReports();
    } catch (err) {
      console.error('Error rejecting report:', err);
      toast.error('Rapor reddedilemedi');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <X className="w-3 h-3 mr-1" />
            Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Beklemede
          </span>
        );
    }
  };

  if (loading && reports.length === 0) {
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
      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setReportType('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Tüm Raporlar
        </button>
        <button
          onClick={() => setReportType('listing')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportType === 'listing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          İlan Raporları
        </button>
        <button
          onClick={() => setReportType('message')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportType === 'message'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Mesaj Raporları
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setReportStatus('pending')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportStatus === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Bekleyen
        </button>
        <button
          onClick={() => setReportStatus('approved')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportStatus === 'approved'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Onaylanan
        </button>
        <button
          onClick={() => setReportStatus('rejected')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportStatus === 'rejected'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Reddedilen
        </button>
        <button
          onClick={() => setReportStatus('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            reportStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Tümü
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={reportType === 'all' 
            ? "Rapor içeriği, kullanıcı adı veya ilan ile ara..." 
            : reportType === 'listing'
              ? "İlan raporu ara..."
              : "Mesaj raporu ara..."}
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const PlatformIcon = report.type === 'listing' || report.type === 'admin_listing' ? Car : MessageSquare;
          const isAdminReport = report.type === 'admin_listing';
          
          return (
            <div 
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      report.type === 'listing' || report.type === 'admin_listing'
                        ? 'bg-blue-100 dark:bg-blue-900/20' 
                        : 'bg-purple-100 dark:bg-purple-900/20'
                    }`}>
                      <PlatformIcon className={`w-5 h-5 ${
                        report.type === 'listing' || report.type === 'admin_listing'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                        <span>
                          {report.type === 'listing' 
                            ? 'İlan Raporu' 
                            : report.type === 'admin_listing'
                              ? 'Admin İlan Raporu'
                              : 'Mesaj Raporu'}
                        </span>
                        {getStatusBadge(report.status)}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>
                            {isAdminReport ? 'Admin: ' : 'Raporlayan: '}
                            {report.reporter?.full_name || report.reporter?.email || 'Bilinmiyor'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {report.type === 'listing' || report.type === 'admin_listing' ? (
                            <>
                              <Car className="w-4 h-4" />
                              <span>{report.listing ? `${report.listing.brand} ${report.listing.model} ${report.listing.year}` : 'Bilinmiyor'}</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4" />
                              <span>{report.message ? report.message.content.substring(0, 30) + (report.message.content.length > 30 ? '...' : '') : 'Bilinmiyor'}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(report.created_at), 'dd.MM.yyyy', { locale: tr })}
                          </span>
                        </div>
                      </div>
                      
                      {report.admin_notes && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                          <span className="font-medium">Not:</span> {report.admin_notes}
                        </div>
                      )}

                      {report.resolution_notes && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                          <span className="font-medium">Çözüm Notu:</span> {report.resolution_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowDetailModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Detay
                  </button>
                  
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowApproveModal(report.id);
                          setResolutionNotes('');
                        }}
                        disabled={processing === report.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Onayla
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowRejectModal(report.id);
                          setResolutionNotes('');
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
          );
        })}
        
        {filteredReports.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm 
                ? 'Aranan kriterlere uygun rapor bulunamadı.' 
                : reportStatus === 'pending'
                  ? 'Bekleyen rapor bulunmuyor.'
                  : reportStatus === 'approved'
                    ? 'Onaylanmış rapor bulunmuyor.'
                    : reportStatus === 'rejected'
                      ? 'Reddedilmiş rapor bulunmuyor.'
                      : 'Henüz rapor yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Raporu Onayla
              </h3>
              <button 
                onClick={() => {
                  setShowApproveModal(null);
                  setSelectedReport(null);
                  setResolutionNotes('');
                  setDeleteContent(false);
                  setBlockUser(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Çözüm Notları
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Rapor çözümü hakkında notlar ekleyin..."
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="delete-content"
                    checked={deleteContent}
                    onChange={(e) => setDeleteContent(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="delete-content" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {selectedReport.type === 'listing' || selectedReport.type === 'admin_listing'
                      ? 'İlanı sil' 
                      : 'Mesajı sil'}
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="block-user"
                    checked={blockUser}
                    onChange={(e) => setBlockUser(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="block-user" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {selectedReport.type === 'listing' || selectedReport.type === 'admin_listing'
                      ? 'İlan sahibini engelle' 
                      : 'Mesaj göndereni engelle'}
                  </label>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Bu raporu onayladığınızda:
                    </p>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 list-disc list-inside">
                      {deleteContent && (
                        <li>
                          {selectedReport.type === 'listing' || selectedReport.type === 'admin_listing'
                            ? 'İlan silinecek' 
                            : 'Mesaj silinecek'}
                        </li>
                      )}
                      {blockUser && (
                        <li>
                          {selectedReport.type === 'listing' || selectedReport.type === 'admin_listing'
                            ? 'İlan sahibi engellenecek' 
                            : 'Mesaj gönderen engellenecek'}
                        </li>
                      )}
                      <li>
                        {(selectedReport.type === 'listing' || selectedReport.type === 'admin_listing') && (
                          <>
                            Eğer bu ilan için 10 veya daha fazla onaylanmış rapor varsa, ilan otomatik olarak silinecek
                          </>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowApproveModal(null);
                    setSelectedReport(null);
                    setResolutionNotes('');
                    setDeleteContent(false);
                    setBlockUser(false);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleApproveReport}
                  disabled={processing === selectedReport.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === selectedReport.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Onayla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
                Raporu Reddet
              </h3>
              <button 
                onClick={() => {
                  setShowRejectModal(null);
                  setSelectedReport(null);
                  setResolutionNotes('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reddetme Sebebi
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Raporu neden reddettiğinizi açıklayın..."
                />
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Bu işlem, raporu reddedecektir. Lütfen reddetme sebebini belirtin.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setSelectedReport(null);
                    setResolutionNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleRejectReport}
                  disabled={processing === selectedReport.id || !resolutionNotes.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === selectedReport.id ? (
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

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Flag className="w-5 h-5 mr-2 text-red-500" />
                Rapor Detayı
              </h3>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReport(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Report Type */}
              <div className="flex items-center space-x-2">
                {selectedReport.type === 'listing' || selectedReport.type === 'admin_listing' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    <Car className="w-3 h-3 mr-1" />
                    {selectedReport.type === 'admin_listing' ? 'Admin İlan Raporu' : 'İlan Raporu'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Mesaj Raporu
                  </span>
                )}
                {getStatusBadge(selectedReport.status)}
              </div>
              
              {/* Reporter Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {selectedReport.type === 'admin_listing' ? 'Admin' : 'Raporlayan'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ad Soyad</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedReport.reporter?.full_name || 'İsimsiz Kullanıcı'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">E-posta</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedReport.reporter?.email || '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Report Content */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                  Rapor İçeriği
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sebep</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedReport.reason}
                    </p>
                  </div>
                  {selectedReport.details && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Detaylar</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedReport.details}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tarih</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {format(new Date(selectedReport.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Reported Content */}
              {(selectedReport.type === 'listing' || selectedReport.type === 'admin_listing') && selectedReport.listing ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
                    <Car className="w-4 h-4 mr-1" />
                    Raporlanan İlan
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">İlan</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedReport.listing ? `${selectedReport.listing.brand} ${selectedReport.listing.model} ${selectedReport.listing.year}` : 'Bilinmiyor'}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => navigate(`/listings/${selectedReport.listing_id}`)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>İlanı Görüntüle</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedReport.type === 'message' && selectedReport.message ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Raporlanan Mesaj
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Gönderen</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedReport.message_sender?.full_name || 'İsimsiz Kullanıcı'} ({selectedReport.message_sender?.email || '-'})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Alıcı</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedReport.message_receiver?.full_name || 'İsimsiz Kullanıcı'} ({selectedReport.message_receiver?.email || '-'})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Mesaj İçeriği</p>
                      <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {selectedReport.message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Resolution Info */}
              {selectedReport.status !== 'pending' && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                    Çözüm Bilgileri
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Durum</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedReport.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                      </p>
                    </div>
                    {(selectedReport.resolution_notes || selectedReport.admin_notes) && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Notlar</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedReport.resolution_notes || selectedReport.admin_notes}
                        </p>
                      </div>
                    )}
                    {selectedReport.resolved_at && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Çözüm Tarihi</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(selectedReport.resolved_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
                
                {selectedReport.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setShowApproveModal(selectedReport.id);
                        setResolutionNotes('');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Onayla</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setShowRejectModal(selectedReport.id);
                        setResolutionNotes('');
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Reddet</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

