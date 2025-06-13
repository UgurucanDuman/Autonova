import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AdminIdentityVerification } from './AdminIdentityVerification';
import toast from 'react-hot-toast';

interface AdminRouteProps {
  children: React.ReactNode;
}

function AdminRoute({ children }: AdminRouteProps) {
  const [adminSession, setAdminSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const sessionData = localStorage.getItem('adminSession');
        
        if (!sessionData) {
          console.log('No admin session found');
          setLoading(false);
          return;
        }
        
        const session = JSON.parse(sessionData);
        const now = new Date().getTime();
        const sessionAge = now - session.timestamp;
        
        // Session expires after 24 hours
        const isValid = session.isAdmin && sessionAge < 24 * 60 * 60 * 1000;
        
        if (!isValid || !session.admin_id) {
          console.log('Invalid or expired admin session');
          localStorage.removeItem('adminSession');
          setLoading(false);
          return;
        }

        // Verify admin exists in database
        const { data, error } = await supabase
          .from('admin_credentials')
          .select('*')
          .eq('id', session.admin_id)
          .single();
          
        if (error || !data) {
          console.error('Admin verification error:', error);
          localStorage.removeItem('adminSession');
          setLoading(false);
          return;
        }

        // Set admin session without checking database
        setAdminSession(session);
        setLoading(false);
      } catch (err) {
        console.error('Error checking admin session:', err);
        localStorage.removeItem('adminSession');
        toast.error('Oturum hatası. Lütfen tekrar giriş yapın.');
        navigate('/admin/login', { replace: true });
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, [navigate]);
  
  const handleVerified = () => {
    setRequiresVerification(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!adminSession) {
    return <Navigate to="/admin/login" replace />;
  }
  
  if (requiresVerification) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <AdminIdentityVerification 
          adminId={adminSession.admin_id}
          onVerified={handleVerified}
          onCancel={() => {
            localStorage.removeItem('adminSession');
            window.location.href = '/admin/login';
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}

export default AdminRoute;