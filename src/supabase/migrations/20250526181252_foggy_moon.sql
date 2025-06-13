/*
  # Document Management Fix and Corporate Document Review

  1. Changes
    - Fix document upload and deletion functionality
    - Add functions for admin to review corporate documents
    - Add functions to approve or reject corporate users
*/

-- Drop existing functions first to avoid return type errors
DROP FUNCTION IF EXISTS handle_document_upload(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS handle_document_deletion(UUID, UUID);
DROP FUNCTION IF EXISTS admin_get_pending_documents();
DROP FUNCTION IF EXISTS admin_review_document(UUID, UUID, TEXT, TEXT);

-- Create a function to handle document uploads
CREATE OR REPLACE FUNCTION handle_document_upload(
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
  
  -- Validate file type
  IF NOT (p_mime_type = ANY(v_requirement.allowed_types)) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid file type. Please upload ' || array_to_string(v_requirement.allowed_types, ',') || ' files.',
      'mime_type', p_mime_type,
      'allowed_types', v_requirement.allowed_types
    );
  END IF;
  
  -- Validate file size
  IF p_file_size > (v_requirement.max_size * 1024 * 1024) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'File too large. Maximum size is ' || v_requirement.max_size || 'MB.',
      'file_size', p_file_size,
      'max_size', v_requirement.max_size * 1024 * 1024
    );
  END IF;
  
  -- Check if document already exists for this user and type
  DELETE FROM corporate_documents
  WHERE user_id = p_user_id AND document_type = p_document_type;
  
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
    approval_requested_at = COALESCE(approval_requested_at, NOW()),
    approval_deadline = COALESCE(approval_deadline, NOW() + INTERVAL '7 days')
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'document_id', v_document_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle document deletion
CREATE OR REPLACE FUNCTION handle_document_deletion(
  p_document_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
  -- Check if document exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM corporate_documents
    WHERE id = p_document_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Document not found or does not belong to user'
    );
  END IF;
  
  -- Delete document
  DELETE FROM corporate_documents
  WHERE id = p_document_id;
  
  RETURN jsonb_build_object(
    'success', TRUE
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for admins to get pending corporate documents
CREATE OR REPLACE FUNCTION admin_get_pending_documents()
RETURNS SETOF corporate_documents AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM corporate_documents
  WHERE status = 'pending'
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function for admins to review a document
CREATE OR REPLACE FUNCTION admin_review_document(
  p_document_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_document_type TEXT;
  v_required_docs_count INTEGER;
  v_approved_docs_count INTEGER;
BEGIN
  -- Get document info
  SELECT user_id, document_type INTO v_user_id, v_document_type
  FROM corporate_documents
  WHERE id = p_document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Document not found'
    );
  END IF;
  
  -- Update document status
  UPDATE corporate_documents
  SET 
    status = p_status,
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE NULL END
  WHERE id = p_document_id;
  
  -- If all required documents are approved, update user approval status
  IF p_status = 'approved' THEN
    -- Count required documents
    SELECT COUNT(*) INTO v_required_docs_count
    FROM document_requirements
    WHERE required = TRUE;
    
    -- Count approved documents for this user
    SELECT COUNT(*) INTO v_approved_docs_count
    FROM corporate_documents cd
    JOIN document_requirements dr ON cd.document_type = dr.document_type
    WHERE cd.user_id = v_user_id AND cd.status = 'approved' AND dr.required = TRUE;
    
    -- If all required documents are approved, update user status
    IF v_required_docs_count = v_approved_docs_count THEN
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
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;