import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
} from 'react-router-dom';

// Configure React Router future flags
UNSAFE_DataRouterContext.displayName = 'DataRouter';
UNSAFE_DataRouterStateContext.displayName = 'DataRouterState';

// Enable v7 features
window.__reactRouterVersion = 7;
window.__reactRouterFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

import { AuthProvider } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CarListings from './pages/CarListings';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import CorporateProfile from './pages/CorporateProfile';
import ComparePage from './pages/ComparePage';
import { setupStorage } from './lib/storage';
import { checkSupabaseConnection } from './lib/supabase';
import { LiveChatSupport } from './components/LiveChatSupport';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize storage buckets with retry mechanism
  useEffect(() => {
    const initStorage = async () => {
      const maxRetries = 5; // Increased from 3 to 5
      const retryDelay = 2000; // Increased from 1000 to 2000
      const connectionTimeout = 30000; // Increased from 10000 to 30000

      let lastError = '';

      for (let i = 0; i < maxRetries; i++) {
        try {
          // Check if environment variables are available
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase configuration. Please check your environment variables.');
          }

          const isConnected = await checkSupabaseConnection();
          
          if (!isConnected) {
            throw new Error('Could not connect to Supabase');
          }

          const result = await setupStorage();
          if (!result) {
            throw new Error('Storage buckets verification failed');
          }

          setIsInitializing(false);
          setConnectionError(false);
          setErrorMessage('');
          return;
        } catch (error: any) {
          lastError = error.message;
          console.error(`Attempt ${i + 1} failed:`, error);
          
          // Add jitter to retry delay to prevent thundering herd
          const jitter = Math.random() * 1000;
          const currentDelay = retryDelay * Math.pow(2, i) + jitter;
          
          if (i === maxRetries - 1) {
            setConnectionError(true);
            setErrorMessage(getErrorMessage(error));
            setIsInitializing(false);
          } else {
            await new Promise(resolve => setTimeout(resolve, currentDelay));
          }
        }
      }
    };
    
    initStorage();
  }, []);

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    if (error.message === 'Connection timeout') {
      return 'Bağlantı zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.';
    }
    if (error.message === 'Invalid API key') {
      return 'Geçersiz API anahtarı. Lütfen sistem yöneticisi ile iletişime geçin.';
    }
    if (error.message === 'Failed to fetch') {
      return 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
    }
    if (error.message === 'Missing Supabase configuration') {
      return 'Supabase yapılandırması eksik. Lütfen sistem yöneticisi ile iletişime geçin.';
    }
    if (error.message === 'Service temporarily unavailable') {
      return 'Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    }
    return 'Bir bağlantı hatası oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.';
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Bağlantı Hatası
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/listings" element={<CarListings />} />
                  <Route path="/listings/:id" element={<ListingDetail />} />
                  <Route path="/listings/:id/edit" element={<EditListing />} />
                  <Route path="/create-listing" element={<CreateListing />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/corporate" element={<CorporateProfile />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route
                    path="/admin"
                    element={<Navigate to="/admin/login\" replace />}
                  />
                  <Route
                    path="/admin/dashboard/*"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/\" replace />} />
                </Routes>
              </AnimatePresence>
            </main>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                className: 'dark:bg-gray-800 dark:text-white',
              }}
            />
            <LiveChatSupport />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;