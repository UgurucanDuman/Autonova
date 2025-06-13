import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Search, AlertTriangle, CheckCircle, 
  X, User, Calendar, Send, Phone, Mail, Clock,
  Filter, ArrowRight, MessageCircle, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ChatSession {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'closed' | 'waiting';
  last_message_at: string;
  created_at: string;
  unread_count: number;
  user?: {
    full_name: string;
    email: string;
    profile_image_url?: string;
  };
}

interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'user' | 'agent' | 'system';
  content: string;
  created_at: string;
  read: boolean;
}

export const AdminLiveChat = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'waiting' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

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

  // Fetch chat sessions
  useEffect(() => {
    const fetchChatSessions = async () => {
      try {
        setLoading(true);
        
        // Fetch real users from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email, phone, profile_image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (userError) throw userError;
        
        setUsers(userData || []);
        
        // Create mock chat sessions based on real users
        const mockSessions: ChatSession[] = [];
        
        // Add some active sessions
        if (userData && userData.length > 0) {
          // First user as active
          mockSessions.push({
            id: `session-${userData[0].id}`,
            user_id: userData[0].id,
            name: userData[0].full_name || userData[0].email,
            email: userData[0].email,
            phone: userData[0].phone,
            status: 'active',
            last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            unread_count: 2,
            user: {
              full_name: userData[0].full_name || userData[0].email,
              email: userData[0].email,
              profile_image_url: userData[0].profile_image_url
            }
          });
          
          // Second user as waiting if available
          if (userData.length > 1) {
            mockSessions.push({
              id: `session-${userData[1].id}`,
              user_id: userData[1].id,
              name: userData[1].full_name || userData[1].email,
              email: userData[1].email,
              phone: userData[1].phone,
              status: 'waiting',
              last_message_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
              created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              unread_count: 1,
              user: {
                full_name: userData[1].full_name || userData[1].email,
                email: userData[1].email,
                profile_image_url: userData[1].profile_image_url
              }
            });
          }
          
          // Third user as closed if available
          if (userData.length > 2) {
            mockSessions.push({
              id: `session-${userData[2].id}`,
              user_id: userData[2].id,
              name: userData[2].full_name || userData[2].email,
              email: userData[2].email,
              phone: userData[2].phone,
              status: 'closed',
              last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
              unread_count: 0,
              user: {
                full_name: userData[2].full_name || userData[2].email,
                email: userData[2].email,
                profile_image_url: userData[2].profile_image_url
              }
            });
          }
          
          // Add remaining users as random status
          for (let i = 3; i < userData.length; i++) {
            const statuses: ('active' | 'waiting' | 'closed')[] = ['active', 'waiting', 'closed'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomUnread = randomStatus === 'closed' ? 0 : Math.floor(Math.random() * 3);
            
            mockSessions.push({
              id: `session-${userData[i].id}`,
              user_id: userData[i].id,
              name: userData[i].full_name || userData[i].email,
              email: userData[i].email,
              phone: userData[i].phone,
              status: randomStatus,
              last_message_at: new Date(Date.now() - 1000 * 60 * Math.floor(Math.random() * 120)).toISOString(),
              created_at: new Date(Date.now() - 1000 * 60 * 60 * Math.floor(Math.random() * 24)).toISOString(),
              unread_count: randomUnread,
              user: {
                full_name: userData[i].full_name || userData[i].email,
                email: userData[i].email,
                profile_image_url: userData[i].profile_image_url
              }
            });
          }
        }
        
        setChatSessions(mockSessions);
      } catch (err) {
        console.error('Error fetching chat sessions:', err);
        setError('Sohbet oturumları yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchChatSessions();
    
    // Set up real-time subscription in a real implementation
  }, []);

  // Fetch messages for selected session
  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);
    }
  }, [selectedSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true);
      
      // Find the user associated with this session
      const session = chatSessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Generate mock messages based on the user
      const mockMessages: ChatMessage[] = [
        {
          id: `${sessionId}-1`,
          session_id: sessionId,
          sender_type: 'system',
          content: 'Sohbet başlatıldı',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: true
        },
        {
          id: `${sessionId}-2`,
          session_id: sessionId,
          sender_type: 'agent',
          content: `Merhaba ${session.name}! Size nasıl yardımcı olabilirim?`,
          created_at: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
          read: true
        }
      ];
      
      // Add user-specific messages based on user ID
      const userId = session.user_id;
      const user = users.find(u => u.id === userId);
      
      if (user) {
        // Add some user-specific messages
        mockMessages.push({
          id: `${sessionId}-3`,
          session_id: sessionId,
          sender_type: 'user',
          content: 'Merhaba, bir konuda yardıma ihtiyacım var.',
          created_at: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
          read: true
        });
        
        // Add different messages based on user properties
        if (user.is_corporate) {
          mockMessages.push({
            id: `${sessionId}-4`,
            session_id: sessionId,
            sender_type: 'user',
            content: 'Kurumsal hesabım için ilan limiti artırmak istiyorum.',
            created_at: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
            read: true
          });
          
          mockMessages.push({
            id: `${sessionId}-5`,
            session_id: sessionId,
            sender_type: 'agent',
            content: 'Kurumsal hesaplar için ek ilan hakkı satın alabilirsiniz. Profil sayfanızdan "İlan Hakkı Satın Al" butonuna tıklayarak bu işlemi gerçekleştirebilirsiniz.',
            created_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
            read: true
          });
        } else {
          mockMessages.push({
            id: `${sessionId}-4`,
            session_id: sessionId,
            sender_type: 'user',
            content: 'İlan oluşturmada sorun yaşıyorum, fotoğraf yükleyemiyorum.',
            created_at: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
            read: true
          });
          
          mockMessages.push({
            id: `${sessionId}-5`,
            session_id: sessionId,
            sender_type: 'agent',
            content: 'Fotoğraf yükleme sorunu için lütfen fotoğrafların 30MB\'dan küçük olduğundan ve desteklenen formatlarda (JPG, PNG, WEBP) olduğundan emin olun. Ayrıca fotoğrafların minimum 1280x720 çözünürlükte olması gerekiyor.',
            created_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
            read: true
          });
        }
        
        // Add a recent message from user
        mockMessages.push({
          id: `${sessionId}-6`,
          session_id: sessionId,
          sender_type: 'user',
          content: session.status === 'active' ? 'Teşekkür ederim, bir sorum daha var.' : 'Başka bir sorunum daha var, yardımcı olabilir misiniz?',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          read: session.status !== 'waiting'
        });
      }
      
      setMessages(mockMessages);
      
      // Mark messages as read in a real implementation
      if (selectedSession) {
        const updatedSessions = chatSessions.map(session => 
          session.id === selectedSession.id 
            ? { ...session, unread_count: 0 } 
            : session
        );
        setChatSessions(updatedSessions);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Mesajlar yüklenemedi');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !newMessage.trim() || !adminId) return;
    
    setSending(true);
    try {
      // In a real implementation, this would send to a database
      // For demo purposes, we'll just add to the local state
      
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        session_id: selectedSession.id,
        sender_type: 'agent',
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        read: true
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // Update last message timestamp
      const updatedSessions = chatSessions.map(session => 
        session.id === selectedSession.id 
          ? { ...session, last_message_at: new Date().toISOString() } 
          : session
      );
      setChatSessions(updatedSessions);
      
      // In a real implementation, you would also notify the user
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSession = (sessionId: string) => {
    // In a real implementation, this would update the database
    const updatedSessions = chatSessions.map(session => 
      session.id === sessionId 
        ? { ...session, status: 'closed' as const } 
        : session
    );
    setChatSessions(updatedSessions);
    
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
    
    toast.success('Sohbet oturumu kapatıldı');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter sessions based on search term and status
  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = 
      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (session.phone && session.phone.includes(searchTerm));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort sessions by last message time (newest first)
  const sortedSessions = [...filteredSessions].sort((a, b) => 
    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
      <div className="grid grid-cols-3 h-full">
        {/* Sessions List */}
        <div className="col-span-1 border-r dark:border-gray-700 h-full overflow-hidden flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Canlı Destek
            </h2>
            
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Kullanıcı ara..."
                className="pl-10 pr-4 py-2 w-full rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filter */}
            <div className="flex space-x-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-xs rounded-full ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 text-xs rounded-full ${
                  statusFilter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Aktif
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-3 py-1 text-xs rounded-full ${
                  statusFilter === 'waiting'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Bekleyen
              </button>
              <button
                onClick={() => setStatusFilter('closed')}
                className={`px-3 py-1 text-xs rounded-full ${
                  statusFilter === 'closed'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Kapalı
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sortedSessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all'
                  ? 'Arama kriterlerine uygun sohbet bulunamadı.'
                  : 'Henüz aktif sohbet bulunmuyor.'}
              </div>
            ) : (
              sortedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    selectedSession?.id === session.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${session.unread_count > 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                        {session.user?.profile_image_url ? (
                          <img 
                            src={session.user.profile_image_url} 
                            alt={session.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                        session.status === 'active' ? 'bg-green-500' : 
                        session.status === 'waiting' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-gray-800 dark:text-white truncate">
                          {session.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(session.last_message_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {session.email}
                      </p>
                      {session.unread_count > 0 && (
                        <div className="mt-1 flex justify-between items-center">
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            {session.status === 'waiting' ? 'Yanıt bekliyor' : 'Yeni mesaj'}
                          </span>
                          <span className="bg-blue-600 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
                            {session.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-span-2 flex flex-col h-full">
          {selectedSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedSession.user?.profile_image_url ? (
                      <img 
                        src={selectedSession.user.profile_image_url} 
                        alt={selectedSession.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white">
                      {selectedSession.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="w-3 h-3" />
                      <span>{selectedSession.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCloseSession(selectedSession.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Oturumu Kapat
                  </button>
                </div>
              </div>

              {/* User Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Başlangıç:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                    {format(new Date(selectedSession.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Durum:</span>
                  <span className={`ml-1 ${
                    selectedSession.status === 'active' ? 'text-green-600 dark:text-green-400' : 
                    selectedSession.status === 'waiting' ? 'text-yellow-600 dark:text-yellow-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {selectedSession.status === 'active' ? 'Aktif' : 
                     selectedSession.status === 'waiting' ? 'Beklemede' : 'Kapalı'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Telefon:</span>
                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                    {selectedSession.phone || 'Belirtilmemiş'}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_type === 'user' ? 'justify-start' : 
                          message.sender_type === 'agent' ? 'justify-end' : 'justify-center'
                        }`}
                      >
                        {message.sender_type === 'system' ? (
                          <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-300">
                            {message.content}
                          </div>
                        ) : (
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.sender_type === 'agent'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender_type === 'agent' 
                                ? 'text-blue-100' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {format(new Date(message.created_at), 'HH:mm')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-3 border-t dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Quick Responses */}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    onClick={() => setNewMessage('Merhaba! Size nasıl yardımcı olabilirim?')}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Karşılama
                  </button>
                  <button
                    onClick={() => setNewMessage('Bu konuda size yardımcı olabilirim.')}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Yardım
                  </button>
                  <button
                    onClick={() => setNewMessage('Başka bir sorunuz var mı?')}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Soru
                  </button>
                  <button
                    onClick={() => setNewMessage('Yardımcı olabildiğim için memnunum. İyi günler dilerim.')}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Kapanış
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 flex-col p-4">
              <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-center mb-2">Sohbet etmek için bir oturum seçin</p>
              <p className="text-center text-sm">Sol taraftaki listeden bir sohbet seçerek kullanıcılarla iletişime geçebilirsiniz.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};