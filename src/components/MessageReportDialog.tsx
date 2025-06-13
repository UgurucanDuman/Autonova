import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, X, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface MessageReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  userId: string;
}

export const MessageReportDialog: React.FC<MessageReportDialogProps> = ({
  isOpen,
  onClose,
  messageId,
  userId
}) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Lütfen bir rapor sebebi girin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error: reportError } = await supabase
        .from('message_reports')
        .insert({
          message_id: messageId,
          reporter_id: userId,
          reason: reason.trim(),
          details: details.trim() || null
        });
        
      if (reportError) throw reportError;
      
      toast.success('Mesaj başarıyla raporlandı');
      onClose();
    } catch (err: any) {
      console.error('Error reporting message:', err);
      setError(err.message || 'Mesaj raporlanırken bir hata oluştu');
      toast.error('Mesaj raporlanamadı');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Flag className="w-5 h-5 mr-2 text-red-500" />
            Mesajı Raporla
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rapor Sebebi <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Sebep Seçin</option>
              <option value="Uygunsuz İçerik">Uygunsuz İçerik</option>
              <option value="Taciz">Taciz</option>
              <option value="Spam">Spam</option>
              <option value="Dolandırıcılık">Dolandırıcılık</option>
              <option value="Nefret Söylemi">Nefret Söylemi</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Detaylar
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Lütfen raporunuzla ilgili daha fazla bilgi verin..."
            />
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  Raporunuz yöneticiler tarafından incelenecektir. Lütfen sadece gerçekten uygunsuz olan mesajları raporlayın.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>Raporla</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};