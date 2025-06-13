import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Building2, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Share2 } from 'lucide-react';
import { DocumentUploader } from '../components/DocumentUploader';
import { CorporateApprovalStatus } from '../components/CorporateApprovalStatus';
import { SocialMediaIntegration } from '../components/SocialMediaIntegration';
import { PageTransition } from '../components/PageTransition';
import toast from 'react-hot-toast';

const CorporateProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'documents' | 'social'>('status');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu');
      toast.error('Profil bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-300">Yükleniyor...</div>
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

  if (!profile || !profile.is_corporate) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>Bu hesap kurumsal bir hesap değil.</span>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                {profile.company_name || 'Kurumsal Hesap'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {profile.approval_status === 'approved' ? (
                  <span className="inline-flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Onaylanmış Kurumsal Hesap
                  </span>
                ) : profile.approval_status === 'rejected' ? (
                  <span className="inline-flex items-center text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4 mr-1" />
                    Reddedilmiş Kurumsal Hesap
                  </span>
                ) : (
                  <span className="inline-flex items-center text-yellow-600 dark:text-yellow-400">
                    <Clock className="w-4 h-4 mr-1" />
                    Onay Bekleyen Kurumsal Hesap
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'status'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Onay Durumu
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'documents'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Belgeler
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                activeTab === 'social'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Sosyal Medya</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'status' ? (
            <CorporateApprovalStatus userId={user!.id} />
          ) : activeTab === 'documents' ? (
            <DocumentUploader userId={user!.id} onDocumentUploaded={fetchProfile} />
          ) : (
            <SocialMediaIntegration userId={user!.id} />
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default CorporateProfile;