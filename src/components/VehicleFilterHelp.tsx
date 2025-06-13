import React from 'react';
import { Car, Search, Filter, AlertCircle } from 'lucide-react';

const VehicleFilterHelp: React.FC = () => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
        <AlertCircle className="w-5 h-5" />
        Araç Filtreleme İpuçları
      </h3>
      
      <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
        <p>Canlı destek üzerinden araç filtreleme yaparken aşağıdaki ifadeleri kullanabilirsiniz:</p>
        
        <div className="pl-4">
          <p className="font-medium flex items-center gap-1 mb-1">
            <Car className="w-4 h-4" /> Marka ve Model Arama
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>"BMW araba arıyorum"</li>
            <li>"Mercedes C Serisi göster"</li>
            <li>"Audi A4 2020 model var mı?"</li>
          </ul>
        </div>
        
        <div className="pl-4">
          <p className="font-medium flex items-center gap-1 mb-1">
            <Filter className="w-4 h-4" /> Fiyat Aralığı Belirleme
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>"300.000 TL - 500.000 TL arası araçlar"</li>
            <li>"En fazla 400.000 TL arabalar"</li>
            <li>"200.000 TL üzeri araçlar"</li>
          </ul>
        </div>
        
        <div className="pl-4">
          <p className="font-medium flex items-center gap-1 mb-1">
            <Search className="w-4 h-4" /> Yıl Filtreleme
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>"2018-2022 arası modeller"</li>
            <li>"2020 sonrası araçlar"</li>
            <li>"2015 öncesi arabalar"</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
        <strong>İpucu:</strong> Birden fazla filtreleme seçeneğini bir arada kullanabilirsiniz.
        Örneğin: "2020 sonrası BMW X5 300.000 TL altı araçlar"
      </div>
    </div>
  );
};

export default VehicleFilterHelp;