import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CreditCard, Plus, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ListingLimitInfoProps {
  listingLimitInfo: any;
  onPurchaseClick: () => void;
  isBlocked?: boolean;
}

export const ListingLimitInfo: React.FC<ListingLimitInfoProps> = ({ 
  listingLimitInfo,
  onPurchaseClick,
  isBlocked = false
}) => {
  const navigate = useNavigate();

  if (!listingLimitInfo) return null;

  const { current_count, max_limit, remaining, can_create, is_first_listing } = listingLimitInfo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md mb-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
        <Info className="w-5 h-5 mr-2 text-blue-500" />
        İlan Hakkı Bilgisi
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
          <p className="text-sm text-blue-600 dark:text-blue-400">Toplam Hak</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{max_limit}</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
          <p className="text-sm text-green-600 dark:text-green-400">Kullanılan</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{current_count}</p>
        </div>
        
        <div className={`${remaining > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 rounded-lg text-center`}>
          <p className={`text-sm ${remaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>Kalan</p>
          <p className={`text-2xl font-bold ${remaining > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{remaining}</p>
        </div>
      </div>

      {is_first_listing && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>İlk İlanınız Ücretsiz!</strong> Yeni üye olduğunuz için ilk ilanınızı ücretsiz olarak ekleyebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {remaining <= 0 && !is_first_listing ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>İlan limitine ulaştınız!</strong> Yeni ilan eklemek için ek ilan hakkı satın alabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {is_first_listing ? (
                  <span><strong>İlk ilanınızı ücretsiz olarak ekleyebilirsiniz.</strong> Daha sonraki ilanlar için ilan hakkı satın almanız gerekecektir.</span>
                ) : (
                  <span><strong>{remaining} adet</strong> ilan hakkınız bulunmaktadır. Dilediğiniz zaman yeni ilan ekleyebilirsiniz.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button
          onClick={onPurchaseClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>İlan Hakkı Satın Al</span>
        </button>
        
        <button
          onClick={() => navigate('/create-listing')}
          disabled={(!can_create && !is_first_listing) || isBlocked}
          className={`px-4 py-2 ${(can_create || is_first_listing) && !isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-lg transition-colors flex items-center justify-center space-x-2`}
          title={isBlocked ? 'Engellendiğiniz için ilan veremezsiniz' : ''}
        >
          <Plus className="w-4 h-4" />
          <span>Yeni İlan Ekle</span>
        </button>
      </div>
    </motion.div>
  );
};