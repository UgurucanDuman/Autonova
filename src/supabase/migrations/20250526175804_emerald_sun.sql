-- Create a function to debug document uploads
CREATE OR REPLACE FUNCTION debug_document_upload(
  p_user_id UUID,
  p_document_type TEXT,
  p_file_name TEXT,
  p_mime_type TEXT,
  p_size INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_requirement RECORD;
BEGIN
  -- Get document requirement
  SELECT * INTO v_requirement
  FROM document_requirements
  WHERE document_type = p_document_type;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Document type not found',
      'document_type', p_document_type
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'file_name', p_file_name,
    'mime_type', p_mime_type,
    'size', p_size,
    'document_type', p_document_type,
    'allowed_types', v_requirement.allowed_types,
    'is_allowed', p_mime_type = ANY(v_requirement.allowed_types),
    'max_size', v_requirement.max_size * 1024 * 1024,
    'is_size_valid', p_size <= v_requirement.max_size * 1024 * 1024,
    'required', v_requirement.required
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to upload a document
CREATE OR REPLACE FUNCTION admin_upload_document(
  p_user_id UUID,
  p_document_type TEXT,
  p_file_name TEXT,
  p_file_url TEXT,
  p_mime_type TEXT,
  p_file_size INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_document_id UUID;
BEGIN
  -- Insert document
  INSERT INTO corporate_documents (
    user_id,
    document_type,
    file_name,
    file_url,
    mime_type,
    file_size,
    status
  ) VALUES (
    p_user_id,
    p_document_type,
    p_file_name,
    p_file_url,
    p_mime_type,
    p_file_size,
    'pending'
  ) RETURNING id INTO v_document_id;
  
  -- Update user's last_document_submitted_at
  UPDATE users
  SET 
    last_document_submitted_at = NOW(),
    approval_requested_at = NOW(),
    approval_deadline = NOW() + INTERVAL '7 days'
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'document_id', v_document_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to delete a document
CREATE OR REPLACE FUNCTION admin_delete_document(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if document exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM corporate_documents
    WHERE id = p_document_id AND user_id = p_user_id
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Delete document
  DELETE FROM corporate_documents
  WHERE id = p_document_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to review a document
CREATE OR REPLACE FUNCTION admin_review_document(
  p_document_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_document_type TEXT;
BEGIN
  -- Get document info
  SELECT user_id, document_type INTO v_user_id, v_document_type
  FROM corporate_documents
  WHERE id = p_document_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update document status
  UPDATE corporate_documents
  SET 
    status = p_status,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_document_id;
  
  -- If all documents are approved, update user approval status
  IF p_status = 'approved' AND NOT EXISTS (
    SELECT 1 FROM corporate_documents
    WHERE user_id = v_user_id AND status != 'approved'
  ) THEN
    UPDATE users
    SET 
      approval_status = 'approved',
      approval_date = NOW(),
      approved_by = p_admin_id
    WHERE id = v_user_id;
    
    -- Add to approval history
    INSERT INTO corporate_approval_history (
      user_id,
      admin_id,
      status
    ) VALUES (
      v_user_id,
      p_admin_id,
      'approved'
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all corporate documents for a user
CREATE OR REPLACE FUNCTION admin_get_corporate_documents(p_user_id UUID)
RETURNS SETOF corporate_documents AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM corporate_documents
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all pending corporate documents
CREATE OR REPLACE FUNCTION admin_get_pending_documents()
RETURNS SETOF corporate_documents AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM corporate_documents
  WHERE status = 'pending'
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to approve a corporate user
CREATE OR REPLACE FUNCTION admin_approve_corporate_user(
  p_user_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update user approval status
  UPDATE users
  SET 
    approval_status = 'approved',
    approval_date = NOW(),
    approved_by = p_admin_id
  WHERE id = p_user_id;
  
  -- Add to approval history
  INSERT INTO corporate_approval_history (
    user_id,
    admin_id,
    status,
    reason
  ) VALUES (
    p_user_id,
    p_admin_id,
    'approved',
    p_notes
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to reject a corporate user
CREATE OR REPLACE FUNCTION admin_reject_corporate_user(
  p_user_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update user approval status
  UPDATE users
  SET 
    approval_status = 'rejected',
    approval_date = NOW(),
    approved_by = p_admin_id,
    rejection_reason = p_reason
  WHERE id = p_user_id;
  
  -- Add to approval history
  INSERT INTO corporate_approval_history (
    user_id,
    admin_id,
    status,
    reason
  ) VALUES (
    p_user_id,
    p_admin_id,
    'rejected',
    p_reason
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;