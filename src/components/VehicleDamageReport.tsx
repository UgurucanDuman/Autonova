import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, X, AlertCircle, CheckCircle, Camera, 
  Upload, FileText, Send, Info, MapPin, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { MultiFileUploader } from './MultiFileUploader';

interface VehicleDamageReportProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  userId: string;
}

export const VehicleDamageReport: React.FC<VehicleDamageReportProps> = ({
  isOpen,
  onClose,
  listingId,
  userId
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [carDetails, setCarDetails] = useState<any>(null);
  
  // Form state
  const [damageDescription, setDamageDescription] = useState('');
  const [damageLocation, setDamageLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [damageImages, setDamageImages] = useState<File[]>([]);
  const [damageType, setDamageType] = useState<string>('minor');
  const [repairHistory, setRepairHistory] = useState('');
  const [insuranceClaim, setInsuranceClaim] = useState(false);

  useEffect(() => {
    if (isOpen && listingId) {
      fetchCarDetails();
    }
  }, [isOpen, listingId]);

  const fetchCarDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('car_listings')
        .select('id, brand, model, year')
        .eq('id', listingId)
        .single();
        
      if (error) throw error;
      
      setCarDetails(data);
    } catch (err) {
      console.error('Error fetching car details:', err);
      setError('Araç bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageAdd = (files: File[]) => {
    setDamageImages(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!damageDescription.trim()) {
      toast.error('Lütfen hasar açıklaması girin');
      return;
    }
    
    if (!damageLocation.trim()) {
      toast.error('Lütfen hasar konumunu girin');
      return;
    }
    
    if (!incidentDate) {
      toast.error('Lütfen olay tarihini girin');
      return;
    }
    
    if (damageImages.length === 0) {
      toast.error('Lütfen en az bir hasar fotoğrafı yükleyin');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      // 1. Create damage report record
      const { data: reportData, error: reportError } = await supabase
        .from('damage_reports')
        .insert({
          listing_id: listingId,
          user_id: userId,
          description: damageDescription,
          location: damageLocation,
          incident_date: incidentDate,
          damage_type: damageType,
          repair_history: repairHistory,
          insurance_claim: insuranceClaim,
          status: 'pending'
        })
        .select()
        .single();
        
      if (reportError) throw reportError;
      
      // 2. Upload damage images
      const reportId = reportData.id;
      
      for (const file of damageImages) {
        // Generate a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${reportId}/${fileName}`;

        // Upload the file to storage
        const { error: uploadError } = await supabase.storage
          .from('damage-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('damage-images')
          .getPublicUrl(filePath);

        // Create damage_images record
        const { error: imageError } = await supabase
          .from('damage_images')
          .insert({
            report_id: reportId,
            url: publicUrl
          });

        if (imageError) throw imageError;
      }
      
      setSuccess(true);
      toast.success('Hasar raporu başarıyla gönderildi');
      
      // Reset form after successful submission
      setTimeout(() => {
        setDamageDescription('');
        setDamageLocation('');
        setIncidentDate('');
        setDamageImages([]);
        setDamageType('minor');
        setRepairHistory('');
        setInsuranceClaim(false);
        setSuccess(false);
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error submitting damage report:', err);
      setError(err.message || 'Hasar raporu gönderilirken bir hata oluştu');
      toast.error('Hasar raporu gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <Car className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Araç Hasar Raporu
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : success ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Hasar Raporu Gönderildi
              </h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                Hasar raporunuz başarıyla gönderildi. Raporunuz incelendikten sonra size bilgi verilecektir.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Car Details */}
              {carDetails && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 flex items-center">
                    <Car className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Araç Bilgileri
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {carDetails.brand} {carDetails.model} {carDetails.year}
                  </p>
                </div>
              )}

              {/* Damage Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hasar Tipi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`flex items-center justify-center p-3 rounded-lg cursor-pointer border-2 ${
                    damageType === 'minor' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="damageType"
                      value="minor"
                      checked={damageType === 'minor'}
                      onChange={() => setDamageType('minor')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                        <span className="text-green-600 dark:text-green-400 text-lg font-bold">1</span>
                      </div>
                      <span className="block mt-2 font-medium text-gray-700 dark:text-gray-300">Hafif Hasar</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center justify-center p-3 rounded-lg cursor-pointer border-2 ${
                    damageType === 'moderate' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="damageType"
                      value="moderate"
                      checked={damageType === 'moderate'}
                      onChange={() => setDamageType('moderate')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                        <span className="text-yellow-600 dark:text-yellow-400 text-lg font-bold">2</span>
                      </div>
                      <span className="block mt-2 font-medium text-gray-700 dark:text-gray-300">Orta Hasar</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center justify-center p-3 rounded-lg cursor-pointer border-2 ${
                    damageType === 'severe' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="damageType"
                      value="severe"
                      checked={damageType === 'severe'}
                      onChange={() => setDamageType('severe')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                        <span className="text-red-600 dark:text-red-400 text-lg font-bold">3</span>
                      </div>
                      <span className="block mt-2 font-medium text-gray-700 dark:text-gray-300">Ağır Hasar</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Damage Description */}
              <div>
                <label htmlFor="damageDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hasar Açıklaması <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="damageDescription"
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Hasarın detaylarını açıklayın..."
                  required
                />
              </div>

              {/* Damage Location */}
              <div>
                <label htmlFor="damageLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hasar Konumu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="damageLocation"
                    value={damageLocation}
                    onChange={(e) => setDamageLocation(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: Ön tampon, sol arka kapı, vb."
                    required
                  />
                </div>
              </div>

              {/* Incident Date */}
              <div>
                <label htmlFor="incidentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Olay Tarihi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    id="incidentDate"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Repair History */}
              <div>
                <label htmlFor="repairHistory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Onarım Geçmişi
                </label>
                <textarea
                  id="repairHistory"
                  value={repairHistory}
                  onChange={(e) => setRepairHistory(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Daha önce yapılan onarımlar varsa belirtin..."
                />
              </div>

              {/* Insurance Claim */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="insuranceClaim"
                  checked={insuranceClaim}
                  onChange={(e) => setInsuranceClaim(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="insuranceClaim" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Sigorta talebi oluşturuldu
                </label>
              </div>

              {/* Damage Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hasar Fotoğrafları <span className="text-red-500">*</span>
                </label>
                <MultiFileUploader
                  onFilesSelected={handleImageAdd}
                  accept="image/*"
                  maxSize={10} // 10MB
                  maxFiles={5}
                  label="Hasar Fotoğrafları"
                  description="PNG, JPG, WEBP - Maksimum 10MB, en fazla 5 fotoğraf"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Hasar raporunuz, aracın değerini ve satış fiyatını etkileyebilir. Doğru ve eksiksiz bilgi vermeniz önemlidir. Raporunuz admin tarafından incelenecek ve onaylandıktan sonra ilan sayfasında görünecektir.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && !success && (
          <div className="p-4 border-t dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mr-2"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Raporu Gönder</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};