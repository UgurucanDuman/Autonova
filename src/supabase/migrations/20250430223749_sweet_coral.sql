/*
  # Document Requirements and Default Admin

  1. Changes
    - Insert default document requirements for corporate users
    - Create default admin user
*/

-- Insert default document requirements
INSERT INTO document_requirements (document_type, name, description, required, max_size_mb, allowed_types)
VALUES
  ('trade_registry', 'Ticaret Sicil Belgesi', 'Şirketinizin ticaret sicil gazetesinde yayınlanan kuruluş belgesi', TRUE, 10, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('tax_certificate', 'Vergi Levhası', 'Güncel vergi levhanız', TRUE, 5, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('signature_circular', 'İmza Sirküleri', 'Şirket yetkililerinin imza sirküleri', TRUE, 5, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('company_contract', 'Şirket Sözleşmesi', 'Şirket ana sözleşmesi', FALSE, 10, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('id_card', 'Kimlik Belgesi', 'Şirket yetkilisinin kimlik belgesi', TRUE, 5, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (document_type) DO NOTHING;

-- Create default admin user (username: Ugurcan, password: Kermes2014.!)
INSERT INTO admin_credentials (
  id,
  username, 
  email, 
  password_hash, 
  full_name, 
  identity_verification_required
)
VALUES (
  gen_random_uuid(),
  'Ugurcan', 
  'admin@example.com', 
  crypt('Kermes2014.!', gen_salt('bf')), 
  'System Admin', 
  FALSE
)
ON CONFLICT (username) DO NOTHING;

-- Create test admin user (username: testadmin, password: Test123!)
INSERT INTO admin_credentials (
  id,
  username, 
  email, 
  password_hash, 
  full_name, 
  identity_verification_required
)
VALUES (
  gen_random_uuid(),
  'testadmin', 
  'testadmin@example.com', 
  crypt('Test123!', gen_salt('bf')), 
  'Test Admin', 
  FALSE
)
ON CONFLICT (username) DO NOTHING;

-- Insert default social media settings
INSERT INTO social_media_settings (
  id, 
  instagram_api_key, 
  facebook_api_key, 
  twitter_api_key, 
  instagram_username, 
  facebook_page_id, 
  twitter_handle,
  created_at,
  updated_at
)
VALUES (
  1, 
  '', 
  '', 
  '', 
  '', 
  '', 
  '',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;