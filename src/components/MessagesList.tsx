import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trash2, Search, AlertTriangle, X, MessageSquare, 
  Flag, User, Calendar, Car, Eye, Ban
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender: {
    full_name: string;
    email: string;
    is_blocked: boolean;
  };
  receiver: {
    full_name: string;
    email: string;
    is_blocked: boolean;
  };
  listing: {
    brand: string;
    model: string;
    year: number;
  };
}

export const MessagesList = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showMessageModal, setShowMessageModal] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [userToBlock, setUserToBlock] = useState<string | null>(null);

  // Get admin ID from session
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (session.admin_id) {
          setAdminId(session.admin_id);
        }
      } catch (err) {
        console.error('Error parsing admin session:', err);
      }
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      // Use the admin_view_all_messages function to bypass RLS
      const { data, error } = await supabase.rpc('admin_view_all_messages');

      if (error) {
        console.error('Error using admin_view_all_messages:', error);
        
        // Fallback to regular query
        const { data: regularData, error: regularError } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!sender_id (
              full_name,
              email,
              is_blocked
            ),
            receiver:users!receiver_id (
              full_name,
              email,
              is_blocked
            ),
            listing:car_listings (
              brand,
              model,
              year
            )
          `)
          .order('created_at', { ascending: false });
          
        if (regularError) throw regularError;
        
        setMessages(regularData || []);
      } else {
        // Process the data from the RPC function
        // We need to fetch the related data separately
        const messagesWithRelations = await Promise.all(
          (data || []).map(async (message: any) => {
            // Fetch sender
            const { data: senderData } = await supabase
              .from('users')
              .select('full_name, email, is_blocked')
              .eq('id', message.sender_id)
              .single();
              
            // Fetch receiver
            const { data: receiverData } = await supabase
              .from('users')
              .select('full_name, email, is_blocked')
              .eq('id', message.receiver_id)
              .single();
              
            // Fetch listing if exists
            let listingData = null;
            if (message.listing_id) {
              const { data: listing } = await supabase
                .from('car_listings')
                .select('brand, model, year')
                .eq('id', message.listing_id)
                .single();
                
              listingData = listing;
            }
            
            return {
              ...message,
              sender: senderData || { full_name: 'Unknown', email: 'unknown@example.com', is_blocked: false },
              receiver: receiverData || { full_name: 'Unknown', email: 'unknown@example.com', is_blocked: false },
              listing: listingData
            };
          })
        );
        
        setMessages(messagesWithRelations);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Mesajlar yüklenirken bir hata oluştu');
      toast.error('Mesajlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Filter messages based on search term
  const filteredMessages = messages.filter(message => 
    message.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.receiver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.listing?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.listing?.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    setProcessing(messageId);
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Mesaj silindi');
      setShowDeleteConfirm(null);
      await fetchMessages();
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error('Mesaj silinemedi');
    } finally {
      setProcessing(null);
    }
  };

  // Handle message reporting
  const handleReportMessage = async (messageId: string) => {
    if (!reportReason.trim()) {
      toast.error('Lütfen rapor sebebi girin');
      return;
    }

    if (!adminId) {
      toast.error('Admin oturumu bulunamadı');
      return;
    }

    setProcessing(messageId);
    try {
      const { error } = await supabase
        .from('message_reports')
        .insert({
          message_id: messageId,
          reporter_id: adminId,
          reason: reportReason,
          details: 'Admin tarafından raporlandı',
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Mesaj raporlandı');
      setShowReportModal(null);
      setReportReason('');
    } catch (err) {
      console.error('Error reporting message:', err);
      toast.error('Mesaj raporlanamadı');
    } finally {
      setProcessing(null);
    }
  };

  // Handle blocking a user
  const handleBlockUser = async () => {
    if (!blockReason.trim()) {
      toast.error('Lütfen engelleme sebebi girin');
      return;
    }

    if (!adminId || !userToBlock) {
      toast.error('Admin oturumu veya kullanıcı bulunamadı');
      return;
    }

    setProcessing(userToBlock);
    try {
      const { error } = await supabase.rpc('block_user', {
        p_user_id: userToBlock,
        p_admin_id: adminId,
        p_reason: blockReason
      });

      if (error) throw error;

      toast.success('Kullanıcı engellendi');
      setShowBlockModal(null);
      setBlockReason('');
      setUserToBlock(null);
      await fetchMessages();
    } catch (err) {
      console.error('Error blocking user:', err);
      toast.error('Kullanıcı engellenemedi');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Mesaj içeriği, gönderen veya alıcı ile ara..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.map((message) => (
          <div 
            key={message.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {message.content}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span className="flex items-center">
                          Gönderen: {message.sender?.full_name || 'Bilinmiyor'}
                          {message.sender?.is_blocked && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Engelli
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span className="flex items-center">
                          Alıcı: {message.receiver?.full_name || 'Bilinmiyor'}
                          {message.receiver?.is_blocked && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Engelli
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Car className="w-4 h-4" />
                        <span>İlan: {message.listing ? `${message.listing.brand} ${message.listing.model} ${message.listing.year}` : 'Bilinmiyor'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(message.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  onClick={() => {
                    setSelectedMessage(message);
                    setShowMessageModal(message.id);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  İncele
                </button>
                
                <button
                  onClick={() => {
                    setShowReportModal(message.id);
                    setSelectedMessage(message);
                  }}
                  disabled={processing === message.id}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-orange-700 bg-orange-100 hover:bg-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 transition-colors"
                >
                  <Flag className="w-4 h-4 mr-1" />
                  Raporla
                </button>
                
                <button
                  onClick={() => {
                    setUserToBlock(message.sender_id);
                    setShowBlockModal(message.id);
                  }}
                  disabled={processing === message.id || message.sender?.is_blocked}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Göndereni Engelle
                </button>
                
                <button
                  onClick={() => setShowDeleteConfirm(message.id)}
                  disabled={processing === message.id}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Sil
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {filteredMessages.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Aranan kriterlere uygun mesaj bulunamadı.' : 'Henüz mesaj yok.'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mesajı Sil
              </h3>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Bu mesajı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteMessage(showDeleteConfirm)}
                  disabled={processing === showDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === showDeleteConfirm ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Siliniyor...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Sil</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mesajı Raporla
              </h3>
              <button 
                onClick={() => {
                  setShowReportModal(null);
                  setSelectedMessage(null);
                  setReportReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rapor Sebebi
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sebep Seçin</option>
                  <option value="Uygunsuz İçerik">Uygunsuz İçerik</option>
                  <option value="Taciz">Taciz</option>
                  <option value="Spam">Spam</option>
                  <option value="Dolandırıcılık">Dolandırıcılık</option>
                  <option value="Nefret Söylemi">Nefret Söylemi</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowReportModal(null);
                    setSelectedMessage(null);
                    setReportReason('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleReportMessage(selectedMessage.id)}
                  disabled={processing === selectedMessage.id || !reportReason.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === selectedMessage.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      <span>Raporla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Block User Modal */}
      {showBlockModal && userToBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Kullanıcıyı Engelle
              </h3>
              <button 
                onClick={() => {
                  setShowBlockModal(null);
                  setUserToBlock(null);
                  setBlockReason('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Engelleme Sebebi
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Kullanıcıyı neden engellemek istediğinizi açıklayın..."
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Not:</strong> Kullanıcı 3 hafta süreyle engellenecektir. Bu süre içinde ilan veremez ve mesaj gönderemez.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowBlockModal(null);
                    setUserToBlock(null);
                    setBlockReason('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleBlockUser}
                  disabled={processing === userToBlock || !blockReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {processing === userToBlock ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Engelle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Message Detail Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mesaj Detayı
              </h3>
              <button 
                onClick={() => {
                  setShowMessageModal(null);
                  setSelectedMessage(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Mesaj İçeriği
                </h4>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(selectedMessage.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Gönderen
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedMessage.sender?.full_name || 'Bilinmiyor'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedMessage.sender?.email || 'E-posta yok'}
                  </p>
                  {selectedMessage.sender?.is_blocked && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      <Ban className="w-3 h-3 mr-1" />
                      Engelli Kullanıcı
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    Alıcı
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedMessage.receiver?.full_name || 'Bilinmiyor'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedMessage.receiver?.email || 'E-posta yok'}
                  </p>
                  {selectedMessage.receiver?.is_blocked && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      <Ban className="w-3 h-3 mr-1" />
                      Engelli Kullanıcı
                    </div>
                  )}
                </div>
              </div>
              
              {selectedMessage.listing && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    <Car className="w-4 h-4 mr-1" />
                    İlgili İlan
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedMessage.listing.brand} {selectedMessage.listing.model} {selectedMessage.listing.year}
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setShowMessageModal(null);
                        navigate(`/listings/${selectedMessage.listing_id}`);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      İlanı Görüntüle
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowMessageModal(null);
                    setSelectedMessage(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
                
                <button
                  onClick={() => {
                    setShowMessageModal(null);
                    setShowReportModal(selectedMessage.id);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                >
                  <Flag className="w-4 h-4" />
                  <span>Raporla</span>
                </button>
                
                {!selectedMessage.sender?.is_blocked && (
                  <button
                    onClick={() => {
                      setShowMessageModal(null);
                      setUserToBlock(selectedMessage.sender_id);
                      setShowBlockModal(selectedMessage.id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Göndereni Engelle</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};