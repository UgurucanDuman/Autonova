import React from 'react';
import { Car, DollarSign, Calendar, MessageSquare } from 'lucide-react';

interface ChatFilterExamplesProps {
  onSelect: (example: string) => void;
}

const ChatFilterExamples: React.FC<ChatFilterExamplesProps> = ({ onSelect }) => {
  const examples = [
    {
      id: 'brand',
      icon: Car,
      text: 'BMW araçları göster',
      description: 'Tek marka aramaları'
    },
    {
      id: 'model',
      icon: Car,
      text: 'Mercedes C Serisi göster',
      description: 'Marka ve model aramaları'
    },
    {
      id: 'price',
      icon: DollarSign,
      text: '300.000 - 500.000 TL arası araçlar',
      description: 'Fiyat aralığı belirleme'
    },
    {
      id: 'year',
      icon: Calendar,
      text: '2020 ve sonrası modeller',
      description: 'Yıl filtreleme'
    },
    {
      id: 'combined',
      icon: MessageSquare,
      text: '2019 sonrası Audi A4 veya A6 400.000 TL altı',
      description: 'Kombinasyon aramaları'
    }
  ];

  return (
    <div className="rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-3">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Hızlı Arama Örnekleri
        </h3>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-2">
        <div className="grid grid-cols-1 gap-1">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => onSelect(example.text)}
              className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
            >
              <example.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-800 dark:text-white font-medium">
                  {example.text}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {example.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatFilterExamples;