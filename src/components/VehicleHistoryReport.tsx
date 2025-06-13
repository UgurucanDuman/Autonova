import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, X, AlertCircle, CheckCircle, FileText, 
  Calendar, Clock, MapPin, Info, Search, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VehicleHistoryReportProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleInfo: {
    brand: string;
    model: string;
    year: number;
  };
}

export const VehicleHistoryReport: React.FC<VehicleHistoryReportProps> = ({
  isOpen,
  onClose,
  vehicleInfo
}) => {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [vin, setVin] = useState('');
  const [showVinInfo, setShowVinInfo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check if we have a report for this vehicle in our database
      checkExistingReport();
    }
  }, [isOpen, vehicleInfo]);

  const checkExistingReport = async () => {
    if (!vehicleInfo) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_history_reports')
        .select('*')
        .eq('vehicle_brand', vehicleInfo.brand)
        .eq('vehicle_model', vehicleInfo.model)
        .eq('vehicle_year', vehicleInfo.year)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setReportData(data.report_data);
      }
    } catch (err) {
      console.error('Error checking existing report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!vin.trim()) {
      toast.error('Lütfen bir VIN numarası girin');
      return;
    }
    
    setSearching(true);
    setError('');
    
    try {
      // In a real implementation, this would call an external API
      // For demo purposes, we'll generate a mock report
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockReport = generateMockReport(vin, vehicleInfo);
      
      // Save the report to our database
      const { error: saveError } = await supabase
        .from('vehicle_history_reports')
        .insert({
          vin: vin,
          vehicle_brand: vehicleInfo.brand,
          vehicle_model: vehicleInfo.model,
          vehicle_year: vehicleInfo.year,
          report_data: mockReport
        });
        
      if (saveError) throw saveError;
      
      setReportData(mockReport);
      toast.success('Araç geçmişi raporu oluşturuldu');
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Rapor oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      toast.error('Rapor oluşturulamadı');
    } finally {
      setSearching(false);
    }
  };

  const generateMockReport = (vin: string, vehicleInfo: any) => {
    // Generate a deterministic report based on the VIN and vehicle info
    const vinSum = vin.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    
    // Use the VIN sum to determine some properties
    const accidentCount = vinSum % 3;
    const ownerCount = 1 + (vinSum % 4);
    const serviceRecords = 3 + (vinSum % 8);
    const mileage = 10000 + (vinSum * 1000);
    const lastInspectionYear = 2023 - (vinSum % 3);
    
    // Generate random locations
    const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana'];
    const registrationCity = cities[vinSum % cities.length];
    
    // Generate accident details if any
    const accidents = [];
    for (let i = 0; i < accidentCount; i++) {
      const year = 2020 - i - (vinSum % 3);
      const severity = ['Hafif', 'Orta', 'Ağır'][i % 3];
      const location = cities[(vinSum + i) % cities.length];
      
      accidents.push({
        date: `${year}-${String(((vinSum + i) % 12) + 1).padStart(2, '0')}-${String(((vinSum + i) % 28) + 1).padStart(2, '0')}`,
        severity,
        location,
        description: `${severity} hasar, ${location}'da meydana geldi.`,
        repaired: true
      });
    }
    
    // Generate service history
    const services = [];
    for (let i = 0; i < serviceRecords; i++) {
      const year = 2023 - i;
      const month = ((vinSum + i) % 12) + 1;
      const day = ((vinSum + i) % 28) + 1;
      const mileageAtService = mileage - (i * 10000);
      const serviceTypes = ['Yağ Değişimi', 'Fren Bakımı', 'Genel Bakım', 'Lastik Değişimi', 'Filtre Değişimi'];
      const serviceType = serviceTypes[(vinSum + i) % serviceTypes.length];
      
      services.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        mileage: mileageAtService,
        type: serviceType,
        location: cities[(vinSum + i) % cities.length],
        details: `${serviceType} yapıldı.`
      });
    }
    
    // Generate ownership history
    const owners = [];
    for (let i = 0; i < ownerCount; i++) {
      const startYear = 2023 - (ownerCount - i) * 2 - (vinSum % 3);
      const endYear = i === ownerCount - 1 ? null : startYear + 2;
      
      owners.push({
        type: i === 0 ? 'İlk Sahibi' : `${i+1}. Sahibi`,
        location: cities[(vinSum + i) % cities.length],
        startDate: `${startYear}-${String(((vinSum + i) % 12) + 1).padStart(2, '0')}-${String(((vinSum + i) % 28) + 1).padStart(2, '0')}`,
        endDate: endYear ? `${endYear}-${String(((vinSum + i) % 12) + 1).padStart(2, '0')}-${String(((vinSum + i) % 28) + 1).padStart(2, '0')}` : null
      });
    }
    
    return {
      vin,
      vehicle: {
        brand: vehicleInfo.brand,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        engine: `${(1.4 + (vinSum % 20) / 10).toFixed(1)}L`,
        transmission: vinSum % 2 === 0 ? 'Otomatik' : 'Manuel',
        fuelType: ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik'][vinSum % 5],
        color: ['Beyaz', 'Siyah', 'Gri', 'Mavi', 'Kırmızı'][vinSum % 5]
      },
      summary: {
        accidentCount,
        ownerCount,
        serviceRecords,
        mileage,
        lastInspectionYear,
        registrationCity,
        status: accidentCount > 1 ? 'Dikkat' : 'Temiz',
        recalls: vinSum % 5 === 0 ? 1 : 0,
        stolen: false,
        floodDamage: false,
        fireDamage: false,
        hailDamage: vinSum % 7 === 0,
        totalLoss: false
      },
      accidents,
      services,
      owners,
      recalls: vinSum % 5 === 0 ? [
        {
          date: `${2022 - (vinSum % 3)}-${String(((vinSum) % 12) + 1).padStart(2, '0')}-${String(((vinSum) % 28) + 1).padStart(2, '0')}`,
          description: 'Fren sistemi geri çağırma',
          status: 'Çözümlenmedi',
          recallNumber: `RC${vinSum}${vehicleInfo.year}`
        }
      ] : [],
      inspections: [
        {
          date: `${lastInspectionYear}-${String(((vinSum) % 12) + 1).padStart(2, '0')}-${String(((vinSum) % 28) + 1).padStart(2, '0')}`,
          result: 'Geçti',
          location: registrationCity,
          notes: 'Rutin muayene'
        }
      ],
      reportDate: new Date().toISOString(),
      reportId: `VHR-${vin.substring(0, 6)}-${Date.now().toString().substring(6)}`
    };
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
            <FileText className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Araç Geçmişi Raporu
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
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Report Header */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      {reportData.vehicle?.brand} {reportData.vehicle?.model} {reportData.vehicle?.year}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      VIN: {reportData.vin}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reportData.summary?.status === 'Temiz' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {reportData.summary?.status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {reportData.summary?.ownerCount} Sahip
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {reportData.summary?.accidentCount} Kaza Kaydı
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Rapor Tarihi: {new Date(reportData.reportDate).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Rapor No: {reportData.reportId}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Araç Özeti
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Motor</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.vehicle?.engine}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Şanzıman</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.vehicle?.transmission}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Yakıt Tipi</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.vehicle?.fuelType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Renk</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.vehicle?.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kilometre</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.summary?.mileage?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Son Muayene</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.summary?.lastInspectionYear}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kayıt Şehri</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.summary?.registrationCity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Geri Çağırma</p>
                    <p className="font-medium text-gray-800 dark:text-white">{reportData.summary?.recalls} Adet</p>
                  </div>
                </div>
              </div>

              {/* Accident History */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Kaza Geçmişi
                </h3>
                {reportData.accidents?.length > 0 ? (
                  <div className="space-y-4">
                    {reportData.accidents.map((accident: any, index: number) => (
                      <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {new Date(accident.date).toLocaleDateString('tr-TR')}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300">
                              {accident.severity} Hasar - {accident.location}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              accident.repaired 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {accident.repaired ? 'Onarıldı' : 'Onarılmadı'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {accident.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>Kayıtlı kaza bilgisi bulunmuyor.</p>
                  </div>
                )}
              </div>

              {/* Ownership History */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Sahiplik Geçmişi
                </h3>
                <div className="space-y-4">
                  {reportData.owners?.map((owner: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {owner.type}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300">
                              {owner.location}
                            </p>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(owner.startDate).toLocaleDateString('tr-TR')} - 
                            {owner.endDate ? new Date(owner.endDate).toLocaleDateString('tr-TR') : 'Günümüz'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service History */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Servis Geçmişi
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Kilometre
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          İşlem
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Konum
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {reportData.services?.map((service: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(service.date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {service.mileage.toLocaleString()} km
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {service.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {service.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recalls */}
              {reportData.recalls?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Geri Çağırmalar
                  </h3>
                  <div className="space-y-4">
                    {reportData.recalls.map((recall: any, index: number) => (
                      <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {recall.description}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Referans: {recall.recallNumber}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              recall.status === 'Çözümlendi' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {recall.status}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(recall.date).toLocaleDateString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                <p>
                  <strong>Yasal Uyarı:</strong> Bu rapor, aracın geçmişi hakkında bilgi vermek amacıyla hazırlanmıştır. 
                  Raporda yer alan bilgiler çeşitli kaynaklardan derlenmiştir ve tam olarak doğru olmayabilir. 
                  Araç satın alma kararınızı vermeden önce profesyonel bir inceleme yaptırmanızı öneririz.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Araç Geçmişi Raporu Nedir?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      Araç geçmişi raporu, bir aracın geçmiş sahipleri, kaza geçmişi, servis kayıtları, 
                      kilometre bilgisi ve daha fazlasını içeren kapsamlı bir rapordur. Bu rapor, 
                      satın almayı düşündüğünüz aracın geçmişi hakkında bilgi sahibi olmanızı sağlar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Araç Bilgileri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Marka</p>
                    <p className="font-medium text-gray-800 dark:text-white">{vehicleInfo.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Model</p>
                    <p className="font-medium text-gray-800 dark:text-white">{vehicleInfo.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Yıl</p>
                    <p className="font-medium text-gray-800 dark:text-white">{vehicleInfo.year}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="vin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      VIN (Araç Şasi Numarası)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="vin"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase())}
                        placeholder="Örn: 1HGCM82633A123456"
                        className="pl-4 pr-10 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowVinInfo(!showVinInfo)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                    {showVinInfo && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                        <p>
                          VIN (Vehicle Identification Number) veya Şasi Numarası, aracınızı tanımlayan 17 karakterlik 
                          benzersiz bir koddur. Bu numarayı aracınızın ruhsatında, sigorta belgelerinde veya ön camın 
                          sol alt köşesinde bulabilirsiniz.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleSearch}
                      disabled={searching || !vin.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                    >
                      {searching ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Rapor Oluşturuluyor...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          <span>Rapor Oluştur</span>
                        </>
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                <p>
                  <strong>Not:</strong> Bu rapor, aracın geçmişi hakkında bilgi vermek amacıyla hazırlanmıştır. 
                  Raporda yer alan bilgiler çeşitli kaynaklardan derlenmiştir ve tam olarak doğru olmayabilir. 
                  Araç satın alma kararınızı vermeden önce profesyonel bir inceleme yaptırmanızı öneririz.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Kapat
          </button>
        </div>
      </motion.div>
    </div>
  );
};