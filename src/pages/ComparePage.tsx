import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, ArrowLeft, AlertCircle } from 'lucide-react';
import { CarComparison } from '../components/CarComparison';
import { PageTransition } from '../components/PageTransition';

const ComparePage = () => {
  const navigate = useNavigate();
  const [carIds, setCarIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get car IDs from localStorage
    const storedCarIds = localStorage.getItem('compareCarIds');
    if (storedCarIds) {
      try {
        const parsedIds = JSON.parse(storedCarIds);
        if (Array.isArray(parsedIds) && parsedIds.length > 0) {
          setCarIds(parsedIds);
        } else {
          setError('Karşılaştırılacak araç bulunamadı');
        }
      } catch (err) {
        console.error('Error parsing car IDs:', err);
        setError('Karşılaştırma bilgileri yüklenirken bir hata oluştu');
      }
    } else {
      setError('Karşılaştırılacak araç bulunamadı');
    }
    
    setLoading(false);
  }, []);

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Araç Karşılaştırma
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg flex flex-col items-center">
            <AlertCircle className="w-12 h-12 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <p className="text-center mb-4">
              Karşılaştırma yapmak için önce favorilerinizden araç seçmelisiniz.
            </p>
            <button
              onClick={() => navigate('/listings')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              İlanları Görüntüle
            </button>
          </div>
        ) : (
          <CarComparison
            isOpen={true}
            onClose={handleClose}
            initialCars={carIds}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default ComparePage;