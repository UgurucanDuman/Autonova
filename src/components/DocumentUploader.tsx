import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadCorporateDocument } from '../lib/storage';
import { FileUploader } from './FileUploader';
import toast from 'react-hot-toast';

interface DocumentRequirement {
  document_type: string;
  name: string;
  description: string;
  required: boolean;
  max_size_mb: number;
  allowed_types: string[];
}

interface DocumentUploaderProps {
  userId: string;
  onDocumentUploaded?: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  userId,
  onDocumentUploaded
}) => {
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([]);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch document requirements
      const { data: requirementsData, error: requirementsError } = await supabase
        .from('document_requirements')
        .select('*')
        .order('required', { ascending: false });

      if (requirementsError) throw requirementsError;

      // Fetch user documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('corporate_documents')
        .select('*')
        .eq('user_id', userId);

      if (documentsError) throw documentsError;

      setDocumentRequirements(requirementsData || []);
      setUserDocuments(documentsData || []);
    } catch (err) {
      console.error('Error fetching document data:', err);
      setError('Belge gereksinimleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setUploading(documentType);
    try {
      // Find the document requirement
      const requirement = documentRequirements.find(req => req.document_type === documentType);
      if (!requirement) {
        throw new Error('Document type not found');
      }

      // Validate file size
      if (file.size > requirement.max_size_mb * 1024 * 1024) {
        throw new Error(`Dosya boyutu çok büyük. Maksimum ${requirement.max_size_mb}MB olabilir.`);
      }

      // Validate file type
      if (!requirement.allowed_types.includes(file.type)) {
        throw new Error(`Geçersiz dosya türü. İzin verilen türler: ${requirement.allowed_types.map(type => type.split('/')[1]).join(', ')}`);
      }

      // Check if user already has a document of this type
      const existingDoc = userDocuments.find(doc => doc.document_type === documentType);
      
      // If exists, delete the old file from storage
      if (existingDoc) {
        // Delete from database
        await supabase
          .from('corporate_documents')
          .delete()
          .eq('id', existingDoc.id);
      }

      // Upload the document
      const result = await uploadCorporateDocument(userId, documentType, file);

      // Create document record
      const { error: insertError } = await supabase
        .from('corporate_documents')
        .insert([{
          user_id: userId,
          document_type: documentType,
          file_name: file.name,
          file_url: result.url,
          mime_type: file.type,
          file_size: file.size,
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      // Update user's last_document_submitted_at
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_document_submitted_at: new Date().toISOString(),
          approval_requested_at: new Date().toISOString(),
          approval_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Refresh user documents
      await fetchData();
      toast.success('Belge başarıyla yüklendi');
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.error(err.message || 'Belge yüklenirken bir hata oluştu');
    } finally {
      setUploading(null);
    }
  };

  const getDocumentStatus = (documentType: string) => {
    const doc = userDocuments.find(d => d.document_type === documentType);
    if (!doc) return null;
    return doc.status;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
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
            <AlertCircle className="w-3 h-3 mr-1" />
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
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300">Kurumsal Onay Süreci</h3>
            <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
              Kurumsal hesabınızın onaylanması için gerekli belgeleri yüklemeniz gerekmektedir. Belgeleriniz 7 iş günü içinde incelenecek ve sonuç size bildirilecektir.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentRequirements.map((requirement) => {
          const documentStatus = getDocumentStatus(requirement.document_type);
          const hasDocument = documentStatus !== null;
          const existingDocument = userDocuments.find(doc => doc.document_type === requirement.document_type);
          
          return (
            <div 
              key={requirement.document_type}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {requirement.name}
                    {requirement.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                </div>
                <button
                  onClick={() => setShowInfoModal(requirement.document_type)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              
              {requirement.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {requirement.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  {getStatusBadge(documentStatus)}
                  {hasDocument && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {userDocuments.find(d => d.document_type === requirement.document_type)?.file_name}
                    </p>
                  )}
                </div>
                
                <div className="relative">
                  <FileUploader
                    label=""
                    accept={requirement.allowed_types.join(',')}
                    maxSize={requirement.max_size_mb}
                    onFileSelected={(file) => handleFileUpload(file, requirement.document_type)}
                    currentFile={existingDocument ? { name: existingDocument.file_name, url: existingDocument.file_url } : null}
                    error={documentStatus === 'rejected' ? existingDocument?.rejection_reason : undefined}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Document Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {documentRequirements.find(r => r.document_type === showInfoModal)?.name}
              </h3>
              <button 
                onClick={() => setShowInfoModal(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                {documentRequirements.find(r => r.document_type === showInfoModal)?.description}
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gereksinimler:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>
                    Maksimum dosya boyutu: {documentRequirements.find(r => r.document_type === showInfoModal)?.max_size_mb} MB
                  </li>
                  <li>
                    İzin verilen dosya türleri: {documentRequirements.find(r => r.document_type === showInfoModal)?.allowed_types.map(type => type.split('/')[1]).join(', ')}
                  </li>
                  {documentRequirements.find(r => r.document_type === showInfoModal)?.required && (
                    <li className="text-red-600 dark:text-red-400">
                      Bu belge zorunludur
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowInfoModal(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};