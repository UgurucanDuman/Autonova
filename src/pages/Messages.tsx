import React from 'react';
import { Messages } from '../components/Messages';
import { PageTransition } from '../components/PageTransition';

const MessagesPage = () => {
  return (
    <PageTransition>
      <Messages />
    </PageTransition>
  );
};

export default MessagesPage;