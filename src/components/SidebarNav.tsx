import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Users, Building2, Car, MessageSquare, 
  Settings, Share2, UserPlus, CreditCard, Mail, Phone, Shield, MessageCircle, Flag, Ban
} from 'lucide-react';

interface SidebarNavProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ 
  isOpen, 
  onToggle, 
  activeTab, 
  setActiveTab 
}) => {
  const navItems = [
    { id: 'analytics', label: 'İstatistikler', icon: BarChart },
    { id: 'users', label: 'Bireysel Kullanıcılar', icon: Users },
    { id: 'corporate', label: 'Kurumsal Kullanıcılar', icon: Building2 },
    { id: 'blocked_users', label: 'Engellenen Kullanıcılar', icon: Ban },
    { id: 'listings', label: 'İlanlar', icon: Car },
    { id: 'brand_model', label: 'Marka/Model Dağılımı', icon: Car },
    { id: 'damage_reports', label: 'Hasar Raporları', icon: Car },
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare },
    { id: 'social', label: 'Sosyal Medya Paylaşımları', icon: Share2 },
    { id: 'reviews', label: 'Müşteri Yorumları', icon: MessageCircle },
    { id: 'reports', label: 'Raporlar', icon: Flag },
    { id: 'livechat', label: 'Canlı Destek', icon: MessageSquare },
    { id: 'admins', label: 'Yöneticiler', icon: UserPlus },
    { id: 'listing_management', label: 'İlan Limiti Yönetimi', icon: CreditCard },
    { id: 'email_verification', label: 'E-posta Doğrulama', icon: Mail },
    { id: 'phone_verification', label: 'Telefon Doğrulama', icon: Phone },
    { id: '2fa_management', label: '2FA Yönetimi', icon: Shield },
    { id: 'settings', label: 'Ayarlar', icon: Settings }
  ];
  
  const isActive = (id: string) => activeTab === id;
  
  return (
    <nav className="space-y-2 py-2">
      {navItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center ${isOpen ? 'justify-start space-x-3' : 'justify-center'} px-4 py-3 rounded-lg transition-all ${
              isActive(item.id)
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={isOpen ? '' : item.label}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
};