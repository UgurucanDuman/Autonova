/*
  # Notification System

  1. Changes
    - Add triggers for notifications
    - Add default notification templates
*/

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

-- Function to notify on new listing
CREATE OR REPLACE FUNCTION notify_new_listing()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  -- Get user name
  SELECT full_name INTO v_user_name
  FROM users
  WHERE id = NEW.user_id;
  
  -- Insert notification log for admins
  INSERT INTO notification_logs (
    user_id,
    template_id,
    status
  )
  SELECT
    id,
    (SELECT id FROM notification_templates WHERE name = 'listing_notification'),
    'pending'
  FROM admin_credentials
  WHERE id IN (
    SELECT DISTINCT admin_id 
    FROM car_listings 
    WHERE status = 'approved' 
    LIMIT 5
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new listing notifications
DROP TRIGGER IF EXISTS notify_new_listing_trigger ON car_listings;
CREATE TRIGGER notify_new_listing_trigger
AFTER INSERT ON car_listings
FOR EACH ROW
EXECUTE FUNCTION notify_new_listing();

-- Insert default notification templates
INSERT INTO notification_templates (name, subject, body)
VALUES
  ('welcome', 'Autinoa''ya Hoş Geldiniz', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Hoş Geldiniz, {{full_name}}!</h1><p>Autinoa''ya kayıt olduğunuz için teşekkür ederiz. Artık araç alım satım platformumuzu kullanabilirsiniz.</p></div>'),
  ('listing_approved', 'İlanınız Onaylandı', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>İlanınız Onaylandı</h1><p>{{brand}} {{model}} ilanınız onaylandı ve yayına alındı.</p></div>'),
  ('listing_rejected', 'İlanınız Reddedildi', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>İlanınız Reddedildi</h1><p>{{brand}} {{model}} ilanınız reddedildi. Sebep: {{reason}}</p></div>'),
  ('new_message', 'Yeni Mesajınız Var', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;"><h1>Yeni Mesaj</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın {{full_name}},</p><p>{{sender_name}} size bir mesaj gönderdi:</p><p style="padding: 10px; background-color: #f3f4f6; border-radius: 5px; font-style: italic;">"{{message_preview}}"</p><p>Mesajı görüntülemek ve yanıtlamak için <a href="{{message_url}}" style="color: #3b82f6;">tıklayın</a>.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>'),
  ('purchase_approved', 'İlan Hakkı Satın Alma Talebiniz Onaylandı', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1>Satın Alma Talebi Onaylandı</h1><p>{{amount}} adet ilan hakkı satın alma talebiniz onaylandı.</p></div>'),
  ('admin_verification', 'Yönetici Doğrulama Kodu', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;"><h1>Yönetici Doğrulama Kodu</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın {{full_name}},</p><p>Yönetici paneline giriş için doğrulama kodunuz:</p><p style="font-size: 24px; font-weight: bold; text-align: center; padding: 10px; background-color: #f3f4f6; border-radius: 5px;">{{code}}</p><p>Bu kod 15 dakika süreyle geçerlidir.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>'),
  ('social_share_request', 'Sosyal Medya Paylaşım Talebi', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;"><h1>Sosyal Medya Paylaşım Talebi</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın Yönetici,</p><p>{{full_name}} adlı kullanıcı {{brand}} {{model}} ilanının sosyal medyada paylaşılmasını talep etti.</p><p>Platformlar: {{platforms}}</p><p>İlanı görüntülemek için <a href="{{listing_url}}" style="color: #3b82f6;">tıklayın</a>.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>'),
  ('listing_notification', 'Yeni İlan Bildirimi', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;"><h1>Yeni İlan Bildirimi</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın Yönetici,</p><p>{{full_name}} adlı kullanıcı yeni bir ilan oluşturdu:</p><p><strong>{{brand}} {{model}} {{year}}</strong></p><p>İlanı incelemek için <a href="{{listing_url}}" style="color: #3b82f6;">tıklayın</a>.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>'),
  ('corporate_approval', 'Kurumsal Hesabınız Onaylandı', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;"><h1>Kurumsal Hesabınız Onaylandı</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın {{full_name}},</p><p>Kurumsal hesap başvurunuz onaylandı. Artık kurumsal hesap özelliklerinden yararlanabilirsiniz.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>'),
  ('corporate_rejection', 'Kurumsal Hesap Başvurunuz Reddedildi', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background-color: #ef4444; padding: 20px; text-align: center; color: white;"><h1>Kurumsal Hesap Başvurunuz Reddedildi</h1></div><div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;"><p>Sayın {{full_name}},</p><p>Kurumsal hesap başvurunuz aşağıdaki sebepten dolayı reddedildi:</p><p><strong>Red sebebi:</strong> {{reason}}</p><p>Belgelerinizi güncelleyip tekrar başvurabilirsiniz.</p><p>Saygılarımızla,<br>Autinoa Ekibi</p></div></div>')
ON CONFLICT (name) DO NOTHING;