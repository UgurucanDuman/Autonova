import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, CreditCard, Package, Check, AlertTriangle } from 'lucide-react';
import { supabase, formatError } from '../lib/supabase';
import toast from 'react-hot-toast';

interface PurchaseListingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: () => void;
  userId: string;
}

export const PurchaseListingDialog: React.FC<PurchaseListingDialogProps> = ({
  isOpen,
  onClose,
  onPurchaseComplete,
  userId
}) => {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [prices, setPrices] = useState<any>({
    single: 10,
    three_pack: 25,
    five_pack: 40,
    ten_pack: 75,
    currency: 'TRY'
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase.rpc('get_listing_prices');
        if (error) throw error;
        if (data) setPrices(data);
      } catch (err) {
        console.error('Error fetching prices:', err);
        // Use default prices if fetch fails
        toast.error('Fiyat bilgileri yüklenirken bir hata oluştu. Varsayılan fiyatlar kullanılıyor.');
      }
    };
    
    if (isOpen) {
      fetchPrices();
    }
  }, [isOpen]);

  const packages = [
    { id: 1, name: 'Tekli İlan', amount: 1, price: prices.single },
    { id: 3, name: '3\'lü Paket', amount: 3, price: prices.three_pack, popular: true },
    { id: 5, name: '5\'li Paket', amount: 5, price: prices.five_pack },
    { id: 10, name: '10\'lu Paket', amount: 10, price: prices.ten_pack }
  ];

  const handlePurchase = async () => {
    if (!selectedPackage) {
      setError('Lütfen bir paket seçin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For this demo, we'll create a purchase request
      const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
      if (!selectedPkg) throw new Error('Paket bulunamadı');
      
      const { data, error } = await supabase.rpc('request_listing_purchase', {
        p_user_id: userId,
        p_amount: selectedPkg.amount
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'İlan satın alınamadı');
      }

      setSuccess(true);
      toast.success('İlan hakkı satın alma talebi gönderildi');
      
      // Wait a moment before closing
      setTimeout(() => {
        onPurchaseComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error purchasing listing:', err);
      setError(formatError(err));
      toast.error('İlan satın alınamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    İlan Hakkı Satın Al
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success ? (
                  <div className="text-center space-y-4">
                    <Check className="w-16 h-16 text-green-500 mx-auto" />
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                      Satın Alma Talebi Gönderildi
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      İlan hakkı satın alma talebiniz yöneticilere iletilmiştir. Onaylandıktan sonra ilan hakkınız hesabınıza eklenecektir.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      İlan limitinizi artırmak için aşağıdaki paketlerden birini seçin:
                    </p>

                    <div className="space-y-3 mb-6">
                      {packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg.id)}
                          className={`relative p-4 rounded-lg cursor-pointer transition-colors ${
                            selectedPackage === pkg.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400'
                              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{pkg.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{pkg.amount} ilan hakkı</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {pkg.price} {prices.currency}
                              </p>
                              {pkg.popular && (
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full">
                                  Popüler
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedPackage === pkg.id && (
                            <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Satın aldığınız ilan hakları 1 yıl süreyle geçerlidir ve bu süre içinde kullanılmayan haklar iptal olur.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handlePurchase}
                        disabled={loading || !selectedPackage}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>İşleniyor...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Satın Al</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};