import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LiveChatSupport } from '../components/LiveChatSupport';
import VehicleFilterHelp from '../components/VehicleFilterHelp';
import ChatFilterExamples from '../components/ChatFilterExamples';
import { MessageSquare, ChevronRight, ExternalLink, Lightbulb } from 'lucide-react';
import { AnimatedContainer } from '../components/AnimatedContainer';

const LiveChatHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showExamples, setShowExamples] = useState(true);

  const handleExampleSelect = (example: string) => {
    console.log("Selected example:", example);
    // In a real implementation, this would populate the chat input
    // or trigger a chat session with this example
    setIsOpen(true);
  };

  return (
    <AnimatedContainer animation="fadeIn" className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Canlı Destek ve Araç Filtreleme
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Aradığınız aracı Canlı Destek üzerinden kolayca bulun. Sohbet robotumuz istediğiniz özelliklere sahip araçları filtreleyecektir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Canlı Destek ile Araç Filtreleme
              </h2>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Canlı destek hizmetimiz, aradığınız özelliklere sahip araçları bulmanıza yardımcı olur. Sohbet kutusuna istediğiniz marka, model, fiyat aralığı veya yıl gibi kriterleri yazmanız yeterlidir.
            </p>

            <VehicleFilterHelp />

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border-l-4 border-amber-500">
              <div className="flex gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                    İpucu
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-200">
                    "BMW X5 2020 model 500.000 TL altı" gibi detaylı sorgulamalar yapabilirsiniz. Sistemimiz mesajınızı analiz ederek uygun araçları filtreleyecektir.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsOpen(true)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Canlı Desteği Başlat</span>
              </motion.button>
            </div>
          </div>

          {showExamples && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Hızlı Arama Örnekleri
                </h2>
                <button 
                  onClick={() => setShowExamples(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Gizle
                </button>
              </div>
              
              <ChatFilterExamples onSelect={handleExampleSelect} />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
              Öne Çıkan Özellikler
            </h3>
            
            <ul className="space-y-3">
              {[
                "Doğal dil ile araç arama",
                "Marka ve model filtreleme",
                "Fiyat aralığı belirleme",
                "Yıl bazlı filtreleme",
                "Birden fazla filtreyi birleştirme",
                "Hızlı sonuç görüntüleme"
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-xl text-white">
            <h3 className="font-semibold mb-2">
              Yardıma mı ihtiyacınız var?
            </h3>
            <p className="text-sm text-blue-100 mb-4">
              Aradığınız aracı bulamıyor musunuz? Destek ekibimiz size yardımcı olmak için hazır.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsOpen(true)}
              className="bg-white text-blue-700 px-4 py-2 rounded-lg font-medium text-sm w-full flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Şimdi Sohbet Edin</span>
            </motion.button>
          </div>
          
          <a 
            href="/listings" 
            className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="font-medium text-gray-800 dark:text-white">
              Tüm İlanları Görüntüle
            </span>
            <ExternalLink className="w-5 h-5 text-gray-500" />
          </a>
        </div>
      </div>
      
      {isOpen && <LiveChatSupport onClose={() => setIsOpen(false)} />}
    </AnimatedContainer>
  );
};

export default LiveChatHelp;