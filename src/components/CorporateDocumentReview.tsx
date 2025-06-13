import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, CheckCircle, XCircle, AlertTriangle, 
  Search, User, Calendar, Eye, Download, 
  Check, X, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';


interface Document {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    company_name: string;
  };
}

const CorporateDocumentReview = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');

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
      .channel('corporate_documents_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'corporate_documents'
      }, () => {
        fetchDocuments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Use the admin_get_pending_documents function for pending documents
      let query;
      
      if (statusFilter === 'pending') {
        const { data: pendingData, error: pendingError } = await supabase.rpc('admin_get_pending_documents');
        
        if (pendingError) {
          console.error('Error using admin_get_pending_documents:', pendingError);
          // Fallback to regular query
          query = supabase
            .from('corporate_documents')
            .select(`
              *,
              user:users (
                full_name,
                email,
                company_name
              )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        } else {
          // Process the data from the RPC function
          const documentsWithUsers = await Promise.all(
            (pendingData || []).map(async (doc: any) => {
              // Fetch user data
              const { data: userData } = await supabase
                .from('users')
                .select('full_name, email, company_name')
                .eq('id', doc.user_id)
                .single();
                
              return {
                ...doc,
                user: userData
              };
            })
          );
          
          setDocuments(documentsWithUsers);
          
          // Get unique document types
          const types = [...new Set(documentsWithUsers.map(doc => doc.document_type))];
          setDocumentTypes(types);
          
          setLoading(false);
          return;
        }
      } else {
        // Regular query for other status filters
        query = supabase
          .from('corporate_documents')
          .select(`
            *,
            user:users (
              full_name,
              email,
              company_name
            )
          `)
          .order('created_at', { ascending: false });
          
        // Apply status filter if not 'all'
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setDocuments(data || []);
      
      // Get unique document types
      const types = [...new Set((data || []).map((doc: Document) => doc.document_type))];
      setDocumentTypes(types);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Belgeler yüklenirken bir hata oluştu');
      toast.error('Belgeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  // Filter documents based on search term and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Handle approving a document
  const handleApproveDocument = async (documentId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(documentId);
    try {
      // Use the admin_review_document function
      const { data, error } = await supabase.rpc('admin_review_document', {
        p_document_id: documentId,
        p_admin_id: adminId,
        p_status: 'approved'
      });

      if (error) throw error;

      toast.success('Belge onaylandı');
      await fetchDocuments();
    } catch (err) {
      console.error('Error approving document:', err);
      toast.error('Belge onaylanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle rejecting a document
  const handleRejectDocument = async (documentId: string) => {
    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }

    setProcessing(documentId);
    try {
      // Use the admin_review_document function
      const { data, error } = await supabase.rpc('admin_review_document', {
        p_document_id: documentId,
        p_admin_id: adminId,
        p_status: 'rejected',
        p_rejection_reason: rejectionReason
      });

      if (error) throw error;

      toast.success('Belge reddedildi');
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchDocuments();
    } catch (err) {
      console.error('Error rejecting document:', err);
      toast.error('Belge reddedilemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Get document type display name
  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'trade_registry': 'Ticaret Sicil Belgesi',
      'tax_certificate': 'Vergi Levhası',
      'signature_circular': 'İmza Sirküleri',
      'company_contract': 'Şirket Sözleşmesi',
      'id_card': 'Kimlik Belgesi',
      'other': 'Diğer Belge'
    };
    return types[type] || type;
  };

  // Format file size
  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
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
            placeholder="Dosya adı, belge türü veya kullanıcı ile ara..."
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
                      Belge Türü
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tümü</option>
                      {documentTypes.map(type => (
                        <option key={type} value={type}>{getDocumentTypeName(type)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Kullanıcı</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Belge Türü</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Dosya Adı</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Boyut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Tarih</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Durum</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredDocuments.map((doc) => (
                <tr 
                  key={doc.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {doc.user?.full_name || 'İsimsiz Kullanıcı'}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {doc.user?.email}
                        </div>
                        {doc.user?.company_name && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {doc.user.company_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {getDocumentTypeName(doc.document_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px] inline-block">
                      {doc.file_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(doc.created_at), 'dd.MM.yyyy', { locale: tr })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === 'approved' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Onaylandı
                      </span>
                    ) : doc.status === 'rejected' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Reddedildi
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Beklemede
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowDocumentModal(doc.id);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Görüntüle
                    </button>
                    
                    {doc.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveDocument(doc.id)}
                          disabled={processing === doc.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Onayla
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowRejectModal(doc.id);
                            setSelectedDocument(doc);
                          }}
                          disabled={processing === doc.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reddet
                        </button>
                      </>
                    )}
                    
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      İndir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || selectedType !== 'all' || statusFilter !== 'all'
                ? 'Aranan kriterlere uygun belge bulunamadı.'
                : 'Henüz belge yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Belgeyi Reddet
              </h3>
              <button 
                onClick={() => {
                  setShowRejectModal(null);
                  setSelectedDocument(null);
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
                  placeholder="Belgeyi neden reddettiğinizi açıklayın..."
                  required
                />
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Bu belgeyi reddetmek üzeresiniz. Red sebebi kullanıcıya bildirilecektir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setSelectedDocument(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleRejectDocument(showRejectModal)}
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
                      <XCircle className="w-4 h-4" />
                      <span>Reddet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
                Belge Detayı
              </h3>
              <button 
                onClick={() => {
                  setShowDocumentModal(null);
                  setSelectedDocument(null);
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
                    Belge Bilgileri
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Belge Türü:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{getDocumentTypeName(selectedDocument.document_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Dosya Adı:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedDocument.file_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Dosya Türü:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedDocument.mime_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Dosya Boyutu:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{formatFileSize(selectedDocument.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Yükleme Tarihi:</span>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {format(new Date(selectedDocument.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                      <span className={`font-medium ${
                        selectedDocument.status === 'approved' 
                          ? 'text-green-600 dark:text-green-400' 
                          : selectedDocument.status === 'rejected'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {selectedDocument.status === 'approved' 
                          ? 'Onaylandı' 
                          : selectedDocument.status === 'rejected'
                            ? 'Reddedildi'
                            : 'Beklemede'}
                      </span>
                    </div>
                    
                    {selectedDocument.status === 'rejected' && selectedDocument.rejection_reason && (
                      <div className="pt-2 mt-2 border-t dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400">Red Sebebi:</span>
                        <p className="mt-1 text-red-600 dark:text-red-400">{selectedDocument.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                    Kullanıcı Bilgileri
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ad Soyad:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedDocument.user?.full_name || 'Belirtilmemiş'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">E-posta:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedDocument.user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Firma Adı:</span>
                      <span className="font-medium text-gray-800 dark:text-white">{selectedDocument.user?.company_name || 'Belirtilmemiş'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Belge Önizleme
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg h-[400px] flex items-center justify-center">
                  {selectedDocument.mime_type.startsWith('image/') ? (
                    <img 
                      src={selectedDocument.file_url} 
                      alt={selectedDocument.file_name} 
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : selectedDocument.mime_type === 'application/pdf' ? (
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300 mb-4">PDF dosyasını görüntülemek için indirebilirsiniz.</p>
                      <a
                        href={selectedDocument.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>PDF'i İndir</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300">Bu dosya türü önizlenemez.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedDocument.status === 'pending' && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDocumentModal(null);
                    setShowRejectModal(selectedDocument.id);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reddet</span>
                </button>
                
                <button
                  onClick={() => {
                    handleApproveDocument(selectedDocument.id);
                    setShowDocumentModal(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Onayla</span>
                </button>
              </div>
            )}
            
            {selectedDocument.status !== 'pending' && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDocumentModal(null)}
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

export default CorporateDocumentReview;