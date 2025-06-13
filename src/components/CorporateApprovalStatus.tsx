import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, 
  FileText, Calendar, Building2, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface CorporateApprovalStatusProps {
  userId: string;
}

export const CorporateApprovalStatus: React.FC<CorporateApprovalStatusProps> = ({ userId }) => {
  const [profile, setProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        // Fetch user documents
        const { data: documentsData, error: documentsError } = await supabase
          .from('corporate_documents')
          .select('*')
          .eq('user_id', userId);

        if (documentsError) throw documentsError;

        setProfile(profileData);
        setDocuments(documentsData || []);
      } catch (err) {
        console.error('Error fetching corporate data:', err);
        setError('Kurumsal onay bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('corporate_approval_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      }, () => {
        fetchData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'corporate_documents',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
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

  if (!profile) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>Kullanıcı profili bulunamadı</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (profile.approval_status) {
      case 'approved':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Clock className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (profile.approval_status) {
      case 'approved':
        return 'Kurumsal hesabınız onaylandı';
      case 'rejected':
        return 'Kurumsal hesap başvurunuz reddedildi';
      default:
        return 'Kurumsal hesap başvurunuz inceleniyor';
    }
  };

  const getStatusDescription = () => {
    switch (profile.approval_status) {
      case 'approved':
        return 'Artık kurumsal hesap özelliklerini kullanabilirsiniz.';
      case 'rejected':
        return `Red sebebi: ${profile.rejection_reason || 'Belirtilmemiş'}`;
      default:
        return profile.approval_deadline 
          ? `Başvurunuz ${formatDistanceToNow(new Date(profile.approval_deadline), { addSuffix: true, locale: tr })} sonuçlandırılacaktır.`
          : 'Başvurunuz en kısa sürede incelenecektir.';
    }
  };

  const getStatusClass = () => {
    switch (profile.approval_status) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'rejected':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  const getDocumentStatusCount = () => {
    const approved = documents.filter(doc => doc.status === 'approved').length;
    const rejected = documents.filter(doc => doc.status === 'rejected').length;
    const pending = documents.filter(doc => doc.status === 'pending').length;
    
    return { approved, rejected, pending, total: documents.length };
  };

  const documentCounts = getDocumentStatusCount();

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`rounded-xl border p-6 ${getStatusClass()}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getStatusText()}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {getStatusDescription()}
              </p>
            </div>
          </div>
          
          {profile.approval_status === 'pending' && profile.approval_deadline && (
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Son Tarih: {format(new Date(profile.approval_deadline), 'dd.MM.yyyy', { locale: tr })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Belge Durumu
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Toplam</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{documentCounts.total}</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <p className="text-sm text-green-600 dark:text-green-400">Onaylanan</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{documentCounts.approved}</p>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Bekleyen</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{documentCounts.pending}</p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
            <p className="text-sm text-red-600 dark:text-red-400">Reddedilen</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{documentCounts.rejected}</p>
          </div>
        </div>
        
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{doc.file_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                
                <div>
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
                      <Clock className="w-3 h-3 mr-1" />
                      Beklemede
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Henüz belge yüklenmemiş
            </p>
          </div>
        )}
      </div>

      {/* Company Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Firma Bilgileri
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Firma Adı</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.company_name || '-'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Vergi Numarası</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.tax_number || '-'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Yetkili Kişi</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.full_name || '-'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">E-posta</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.email || '-'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.phone || '-'}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Kayıt Tarihi</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {profile.created_at ? format(new Date(profile.created_at), 'dd.MM.yyyy', { locale: tr }) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};