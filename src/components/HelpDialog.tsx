import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Mail, Phone, Car, MessageSquare, User, Plus, AlertCircle, CheckCircle, MessageCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'contact'>('guide');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const templateParams = {
        to_email: 'ugurcanduman48@gmail.com',
        from_name: name,
        from_email: email,
        message: message,
      };

        await emailjs.send(
        'service_l75wub8',  // Buraya doğru Service ID'yi yaz!
        'template_4o6do43',
        templateParams,
        '--2ShPbtagrWq5rhP'
    );

      setSuccess(true);
      toast.success('Mesajınız başarıyla gönderildi');
      
      setName('');
      setEmail('');
      setMessage('');
      
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error sending email:', err);
      setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      toast.error('Mesaj gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const whatsappNumber = '905488200267'; // Format: countryCode + number
    window.open(`https://wa.me/${whatsappNumber}`, '_blank');
  };

  const guideItems = [
    {
      icon: Car,
      title: 'İlan Arama ve Görüntüleme',
      description: 'İlanlar sayfasından araçları filtreleyebilir, detaylarını inceleyebilirsiniz. Fiyat, marka, model, yıl gibi kriterlere göre arama yapabilirsiniz.'
    },
    {
      icon: Plus,
      title: 'İlan Verme',
      description: 'İlan Ver butonuna tıklayarak aracınızı satışa çıkarabilirsiniz. Aracınızın tüm özelliklerini ve fotoğraflarını ekleyebilirsiniz.'
    },
    {
      icon: MessageSquare,
      title: 'Mesajlaşma',
      description: 'İlan sahipleriyle mesajlaşabilir, sorularınızı sorabilir ve pazarlık yapabilirsiniz. Mesajlar sayfasından tüm yazışmalarınızı takip edebilirsiniz.'
    },
    {
      icon: User,
      title: 'Profil Yönetimi',
      description: 'Profil sayfasından bilgilerinizi güncelleyebilir, ilanlarınızı yönetebilir ve mesajlarınızı kontrol edebilirsiniz.'
    }
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-800 dark:text-white">
                    Yardım ve İletişim
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => setActiveTab('guide')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'guide'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Nasıl Kullanılır?
                  </button>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'contact'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    İletişim
                  </button>
                </div>

                {activeTab === 'guide' ? (
                  <div className="space-y-6">
                    {guideItems.map((item, index) => (
                      <div key={index} className="flex space-x-4">
                        <div className="flex-shrink-0">
                          <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Önemli İpuçları
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-blue-700 dark:text-blue-300">
                        <li>İlan vermeden önce benzer ilanları inceleyin</li>
                        <li>Fotoğrafları gün ışığında ve net çekin</li>
                        <li>İlan açıklamasında detaylı bilgi verin</li>
                        <li>Mesajlara hızlı yanıt vermeye çalışın</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {success ? (
                      <div className="text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                          Mesajınız Gönderildi
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          En kısa sürede size dönüş yapacağız.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 mb-6">
                          <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-300">
                            <Mail className="w-5 h-5" />
                            <a href="mailto:ugurcanduman48@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400">
                              ugurcanduman48@gmail.com
                            </a>
                          </div>
                          <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-300">
                            <Phone className="w-5 h-5" />
                            <a href="tel:05488200267" className="hover:text-blue-600 dark:hover:text-blue-400">
                              0548 820 02 67
                            </a>
                          </div>
                          <button
                            onClick={handleWhatsApp}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>WhatsApp ile İletişime Geç</span>
                          </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Ad Soyad
                            </label>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              E-posta
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Mesajınız
                            </label>
                            <textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={onClose}
                              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              İptal
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                            >
                              {loading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Gönderiliyor...</span>
                                </>
                              ) : (
                                <span>Gönder</span>
                              )}
                            </button>
                          </div>
                        </form>
                      </>
                    )}
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