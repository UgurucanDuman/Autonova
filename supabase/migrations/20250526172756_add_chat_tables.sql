-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('active', 'waiting', 'closed')) DEFAULT 'waiting',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) CHECK (sender_type IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Create agent_status table
CREATE TABLE agent_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_agent_status_online ON agent_status(is_online) WHERE is_online = TRUE;

-- Add updated_at trigger for chat_sessions
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');

-- Create function to update agent status
CREATE OR REPLACE FUNCTION update_agent_status(
  p_agent_id UUID,
  p_is_online BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO agent_status (agent_id, is_online, last_active_at)
  VALUES (p_agent_id, p_is_online, NOW())
  ON CONFLICT (agent_id)
  DO UPDATE SET
    is_online = p_is_online,
    last_active_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get online agents count
CREATE OR REPLACE FUNCTION get_online_agents_count()
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count
  FROM agent_status
  WHERE is_online = TRUE
    AND last_active_at > NOW() - INTERVAL '5 minutes';
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically mark messages as read
CREATE OR REPLACE FUNCTION auto_mark_messages_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous messages in the session as read when an agent responds
  IF NEW.sender_type = 'agent' THEN
    UPDATE messages
    SET read = TRUE
    WHERE session_id = NEW.session_id
      AND sender_type = 'user'
      AND read = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto marking messages as read
CREATE TRIGGER messages_auto_mark_read
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_messages_read(); 