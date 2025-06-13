import React, { useState, useEffect } from 'react';
import { ReviewForm } from './ReviewForm';
import { ReviewList } from './ReviewList';
import { useAuth } from './AuthContext';
import { MessageSquare } from 'lucide-react';

interface ReviewSectionProps {
  listingId: string;
  sellerId: string;
  className?: string;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  listingId,
  sellerId,
  className = '',
}) => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleReviewSubmitted = () => {
    // Increment the key to force a refresh of the review list
    setRefreshKey(prev => prev + 1);
  };
  
  const isListingOwner = user?.id === sellerId;

  return (
    <div className={className}>
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Müşteri Yorumları
        </h2>
      </div>
      
      {user && !isListingOwner && (
        <ReviewForm 
          listingId={listingId}
          userId={user.id}
          onReviewSubmitted={handleReviewSubmitted}
          className="mb-6"
        />
      )}
      
      <ReviewList 
        key={refreshKey}
        listingId={listingId}
        currentUserId={user?.id}
        isListingOwner={isListingOwner}
      />
    </div>
  );
};