/*
  # Fix Messages User Issue

  1. Changes
    - Ensure all auth users have corresponding records in the users table
    - Fix existing users that might be missing from the users table
    - Add trigger to automatically create user records when new auth users are created
    - Update any existing "Bilinmeyen Kullanıcı" entries to use email instead
*/

-- Create or replace function to ensure user exists in users table
CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user exists in the users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    -- Insert the user into the users table
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'user',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to ensure user exists after auth.users insert
DROP TRIGGER IF EXISTS ensure_user_exists_trigger ON auth.users;
CREATE TRIGGER ensure_user_exists_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_user_exists();

-- Fix existing users that might be missing from the users table
INSERT INTO users (id, email, full_name, role, created_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'user',
  au.created_at
FROM 
  auth.users au
WHERE 
  NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Update any existing "Bilinmeyen Kullanıcı" entries to use email instead
UPDATE users
SET full_name = email
WHERE full_name = 'Bilinmeyen Kullanıcı' OR full_name = 'Kullanıcı' OR full_name IS NULL;

-- Add notification template for new messages if it doesn't exist
INSERT INTO notification_templates (name, subject, body)
VALUES
  ('new_message', 'Yeni Mesajınız Var', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;"><h1>Yeni Mesaj</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın {{full_name}},</p><p>{{sender_name}} size bir mesaj gönderdi:</p><p style="padding: 10px; background-color: #f3f4f6; border-radius: 5px; font-style: italic;">"{{message_preview}}"</p><p>Mesajı görüntülemek ve yanıtlamak için <a href="{{message_url}}" style="color: #3b82f6;">tıklayın</a>.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>')
ON CONFLICT (name) DO NOTHING;

-- Function to notify on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_receiver_email TEXT;
  v_receiver_name TEXT;
  v_message_preview TEXT;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM users
  WHERE id = NEW.sender_id;
  
  -- Get receiver email and name
  SELECT email, full_name INTO v_receiver_email, v_receiver_name
  FROM users
  WHERE id = NEW.receiver_id;
  
  -- Create message preview (first 50 characters)
  v_message_preview := substring(NEW.content from 1 for 50);
  IF length(NEW.content) > 50 THEN
    v_message_preview := v_message_preview || '...';
  END IF;
  
  -- Insert notification log
  INSERT INTO notification_logs (
    user_id,
    template_id,
    status
  )
  SELECT
    NEW.receiver_id,
    id,
    'pending'
  FROM notification_templates
  WHERE name = 'new_message';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new message notifications
DROP TRIGGER IF EXISTS notify_new_message_trigger ON messages;
CREATE TRIGGER notify_new_message_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();