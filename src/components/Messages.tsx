import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Car, ChevronLeft, Search, User, Phone, Mail, Calendar, CheckCircle, X, ArrowRight, Send, Image, Info, AlertCircle, Trash2, Flag } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { getMessages, sendMessage, deleteMessage } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { Message } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MessageItem } from './MessageItem';

const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});
  const [showMobileList, setShowMobileList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  useEffect(() => {
    let subscription: any = null;

    const setupSubscription = async () => {
      if (user) {
        // Get initial unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('read', false);
        
        setUnreadCount(count || 0);

        // Subscribe to new messages
        subscription = supabase
          .channel('messages')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          }, (payload) => {
            // Update messages
            fetchMessages();
            
            // Only show notification if:
            // 1. Message is from a different conversation than currently selected
            // 2. Message is not from current user
            if (payload.new && 
                payload.new.sender_id !== user.id && 
                (!selectedConversation || payload.new.sender_id !== selectedConversation.userId)) {
              // Update unread count
              setUnreadMessages(prev => ({
                ...prev,
                [payload.new.sender_id]: (prev[payload.new.sender_id] || 0) + 1
              }));
              
              // Show toast notification
              toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex`}>
                  <div className="flex-1 p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Yeni Mesaj
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {payload.new.content.length > 30 
                            ? payload.new.content.substring(0, 30) + '...' 
                            : payload.new.content}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-l border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        toast.dismiss(t.id);
                        // Find the conversation
                        const conversation = conversations.find(c => c.userId === payload.new.sender_id);
                        if (conversation) {
                          handleSelectConversation(conversation);
                        }
                      }}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus:outline-none"
                    >
                      Görüntüle
                    </button>
                  </div>
                </div>
              ), {
                duration: 5000,
                position: 'top-right',
              });
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`,
          }, (payload) => {
            if (payload.new.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          })
          .subscribe();
      }
    };

    setupSubscription();
    fetchMessages();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, selectedConversation]);

  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages, selectedConversation, optimisticMessages]);

  const handleScroll = () => {
    if (messageContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(isNearBottom);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchMessages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getMessages(user.id);
      setMessages(data);

      // Organize messages into conversations
      const conversationsMap = new Map();
      const userIds = new Set<string>();
      
      data.forEach(message => {
        // Add user IDs to fetch profiles
        userIds.add(message.sender_id);
        userIds.add(message.receiver_id);
        
        // Determine the other user in the conversation
        const otherId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        
        if (!conversationsMap.has(otherId)) {
          conversationsMap.set(otherId, {
            userId: otherId,
            lastMessage: message,
            messages: [message]
          });
        } else {
          const conversation = conversationsMap.get(otherId);
          conversation.messages.push(message);
          
          // Update last message if this one is newer
          if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
            conversation.lastMessage = message;
          }
        }
      });
      
      // Convert map to array and sort by last message date (newest first)
      const sortedConversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
      
      setConversations(sortedConversations);
      
      // Calculate unread messages
      const unread: { [key: string]: number } = {};
      data.forEach(message => {
        if (message.receiver_id === user.id && 
            !message.read &&
            (!selectedConversation || message.sender_id !== selectedConversation.userId)) {
          const senderId = message.sender_id;
          unread[senderId] = (unread[senderId] || 0) + 1;
        }
      });
      setUnreadMessages(unread);

      // If there are conversations but none selected, select the first one
      if (sortedConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(sortedConversations[0]);
        setShowMobileList(false);
      }
      
      // Fetch user profiles for all users in conversations
      fetchUserProfiles(Array.from(userIds));
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Mesajlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      setLoadingProfiles(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, profile_image_url, created_at')
        .in('id', userIds);
      
      if (error) throw error;
      
      // Create a map of user profiles
      const profiles: {[key: string]: any} = {};
      data?.forEach(user => {
        profiles[user.id] = user;
      });
      
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation) return;

    if (!newMessage.trim()) {
      toast.error('Lütfen bir mesaj yazın');
      return;
    }

    // Get the other user's ID (receiver)
    const receiverId = selectedConversation.userId;

    if (!receiverId) {
      toast.error('Geçersiz alıcı');
      return;
    }

    // Prevent sending message to self
    if (receiverId === user.id) {
      toast.error('Kendinize mesaj gönderemezsiniz');
      return;
    }

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: receiverId,
      listing_id: selectedConversation.lastMessage.listing?.id || null,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      isOptimistic: true
    };

    // Add optimistic message to state
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      const message = {
        sender_id: user.id,
        receiver_id: receiverId,
        listing_id: selectedConversation.lastMessage.listing?.id || null,
        content: optimisticMessage.content
      };

      await sendMessage(message);
      
      // Remove optimistic message after successful send
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      
      // Fetch updated messages
      await fetchMessages();
      setIsAtBottom(true);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      toast.error('Mesaj gönderilemedi');
      
      // Remove optimistic message on error
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || deleting) return;
    setDeleting(messageId);
    setError('');

    try {
      await deleteMessage(messageId, user.id);
      await fetchMessages();
      setShowDeleteConfirm(null);
      toast.success('Mesaj silindi');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Mesaj silinemedi');
    } finally {
      setDeleting(null);
    }
  };

  const getUserProfile = (userId: string) => {
    return userProfiles[userId] || null;
  };

  const getConversationMessages = (conversation: any) => {
    if (!conversation || !user) return [];
    
    // Get regular messages
    const regularMessages = messages.filter(m => 
      (m.sender_id === conversation.userId && m.receiver_id === user.id) ||
      (m.sender_id === user.id && m.receiver_id === conversation.userId)
    );
    
    // Get optimistic messages for this conversation
    const optimisticForConversation = optimisticMessages.filter(m => 
      (m.sender_id === user.id && m.receiver_id === conversation.userId)
    );
    
    // Combine and sort by creation date
    return [...regularMessages, ...optimisticForConversation]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  const getFilteredConversations = () => {
    if (!searchTerm.trim()) return conversations;
    
    return conversations.filter(conversation => {
      const otherUser = getUserProfile(conversation.userId);
      const searchLower = searchTerm.toLowerCase();
      
      // Check if user profile exists and matches search
      if (otherUser) {
        if (
          otherUser.full_name?.toLowerCase().includes(searchLower) ||
          otherUser.email?.toLowerCase().includes(searchLower)
        ) {
          return true;
        }
      }
      
      // Check if any message in the conversation matches search
      return conversation.messages.some((message: Message) => 
        message.content?.toLowerCase().includes(searchLower) ||
        message.listing?.brand?.toLowerCase().includes(searchLower) ||
        message.listing?.model?.toLowerCase().includes(searchLower)
      );
    });
  };

  const handleSelectConversation = (conversation: any) => {
    if (!user) return;
    
    // Clear unread count for this conversation immediately
    if (conversation.userId) {
      setUnreadMessages(prev => ({
        ...prev,
        [conversation.userId]: 0
      }));
      
      // Mark messages as read in the database
      supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', conversation.userId)
        .eq('receiver_id', user.id)
        .eq('read', false)
        .then(({ error }) => {
          if (error) {
            console.error('Error marking messages as read:', error);
          }
        });
    }

    // Update selected conversation and mobile view state
    setSelectedConversation(conversation);
    setShowMobileList(false);
    setIsAtBottom(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="text-gray-600 dark:text-gray-300">Mesajlarınız yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200 h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)]"
    >
      <div className="grid md:grid-cols-3 h-full">
        {/* Conversations List */}
        <div className={`border-r dark:border-gray-700 ${showMobileList ? 'block' : 'hidden md:block'} h-full overflow-hidden flex flex-col`}>
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Mesajlar
            </h2>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mesajlarda ara..."
                className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {getFilteredConversations().length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                {searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz mesajınız yok.'}
              </div>
            ) : (
              getFilteredConversations().map((conversation) => {
                const otherUser = getUserProfile(conversation.userId);
                const unreadCount = unreadMessages[conversation.userId] || 0;
                const lastMessage = conversation.lastMessage;
                const isSelected = selectedConversation?.userId === conversation.userId;

                return (
                  <div
                    key={conversation.userId}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors relative ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {otherUser?.profile_image_url ? (
                          <img 
                            src={otherUser.profile_image_url} 
                            alt={otherUser.full_name || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-800 dark:text-white truncate">
                          {otherUser?.full_name || otherUser?.email || 'Kullanıcı'}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          {lastMessage.listing ? (
                            <>
                              <Car className="w-4 h-4 flex-shrink-0" />
                              <p className="truncate">
                                {lastMessage.listing?.brand} {lastMessage.listing?.model}
                              </p>
                            </>
                          ) : (
                            <p className="truncate">Genel mesajlaşma</p>
                          )}
                        </div>
                        {lastMessage && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                            {lastMessage.sender_id === user?.id ? 'Siz: ' : ''}{lastMessage.content}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(lastMessage?.created_at), {
                            addSuffix: true,
                            locale: tr
                          })}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={`col-span-2 flex flex-col h-full ${!showMobileList ? 'block' : 'hidden md:block'}`}>
          {selectedConversation ? (
            <>
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                <div className="p-4 flex items-center space-x-3">
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* User Profile */}
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {getUserProfile(selectedConversation.userId)?.profile_image_url ? (
                      <img 
                        src={getUserProfile(selectedConversation.userId)?.profile_image_url} 
                        alt={getUserProfile(selectedConversation.userId)?.full_name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                      {getUserProfile(selectedConversation.userId)?.full_name || 
                       getUserProfile(selectedConversation.userId)?.email || 
                       'Kullanıcı'}
                    </h2>
                    
                    {/* User Info */}
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      {selectedConversation.lastMessage.listing ? (
                        <>
                          <Car className="w-4 h-4 flex-shrink-0" />
                          <p className="truncate">
                            {selectedConversation.lastMessage.listing?.brand} {selectedConversation.lastMessage.listing?.model}
                          </p>
                        </>
                      ) : (
                        <p className="truncate">Genel mesajlaşma</p>
                      )}
                    </div>
                  </div>
                  
                  {/* User Details Button */}
                  <button
                    onClick={() => {
                      const otherUser = getUserProfile(selectedConversation.userId);
                      if (otherUser) {
                        toast.success(`${otherUser.full_name || otherUser.email} ile konuşuyorsunuz`);
                      }
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div 
                ref={messageContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50 dark:bg-gray-900"
              >
                {getConversationMessages(selectedConversation).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-center">Henüz mesaj yok. Konuşmaya başlamak için bir mesaj gönderin.</p>
                  </div>
                ) : (
                  getConversationMessages(selectedConversation).map((message) => {
                    const isMine = message.sender_id === user?.id;
                    
                    return (
                      <MessageItem 
                        key={message.id}
                        message={message}
                        isMine={isMine}
                        onDelete={(messageId) => setShowDeleteConfirm(messageId)}
                        userId={user?.id || ''}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="sticky bottom-0 left-0 right-0 border-t dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Gönder</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 flex-col p-4">
              <MessageSquare className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-center mb-2">Mesajlaşmak için bir konuşma seçin</p>
              <p className="text-center text-sm">Sol taraftaki listeden bir konuşma seçerek mesajlaşmaya başlayabilirsiniz.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-xl font-semibold">Mesajı Sil</h3>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Bu mesajı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4  py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteMessage(showDeleteConfirm)}
                  disabled={deleting === showDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  {deleting === showDeleteConfirm ? (
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


export { Messages }