-- Add document_title and document_category columns to property_documents
ALTER TABLE public.property_documents 
ADD COLUMN document_title TEXT NOT NULL DEFAULT 'Untitled Document',
ADD COLUMN document_category TEXT;

-- Create index for efficient title-based queries
CREATE INDEX idx_property_documents_title ON public.property_documents(property_id, document_title);

-- Migrate existing documents: use filename without version suffix as title
UPDATE public.property_documents 
SET document_title = REGEXP_REPLACE(
  REGEXP_REPLACE(file_name, '\.[^.]*$', ''),  -- Remove extension
  '_v\d+$', ''                                  -- Remove version suffix
)
WHERE document_title = 'Untitled Document';