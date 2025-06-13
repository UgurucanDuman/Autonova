import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Flag } from 'lucide-react';
import { MessageReportDialog } from './MessageReportDialog';

interface MessageItemProps {
  message: any;
  isMine: boolean;
  onDelete: (messageId: string) => void;
  userId: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isMine,
  onDelete,
  userId
}) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const messageDate = new Date(message.created_at);
  const isOptimistic = 'isOptimistic' in message;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg relative group ${
          isMine
            ? `bg-blue-600 text-white dark:bg-blue-500 rounded-tr-none ${isOptimistic ? 'opacity-70' : ''}`
            : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-white rounded-tl-none shadow-sm'
        }`}
      >
        <p className="break-words">{message.content}</p>
        <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {format(messageDate, 'HH:mm')}
          {isOptimistic && ' • Gönderiliyor...'}
        </p>
        
        {/* Action buttons */}
        <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isMine && !isOptimistic && (
            <button
              onClick={() => onDelete(message.id)}
              className="absolute -right-8 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          
          {!isMine && !isOptimistic && (
            <button
              onClick={() => setShowReportDialog(true)}
              className="absolute -left-8 p-1.5 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Report Dialog */}
      <MessageReportDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        messageId={message.id}
        userId={userId}
      />
    </div>
  );
};