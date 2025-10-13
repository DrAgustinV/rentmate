-- Add linking field to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS previous_property_id UUID REFERENCES properties(id);

-- Create unique constraint for "one ending tenancy per address"
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_ending_tenancy_per_address 
ON properties(address) 
WHERE status = 'ending_tenancy';

-- Create validation function to check if tenancy can be ended
CREATE OR REPLACE FUNCTION public.can_end_tenancy(p_property_id UUID, p_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if another property at same address is already 'ending_tenancy'
  RETURN NOT EXISTS (
    SELECT 1 FROM properties
    WHERE address = p_address
    AND id != p_property_id
    AND status = 'ending_tenancy'
  );
END;
$$;

-- Create validation function for new active property
CREATE OR REPLACE FUNCTION public.can_create_active_property(p_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if another property at same address is already 'active'
  RETURN NOT EXISTS (
    SELECT 1 FROM properties
    WHERE address = p_address
    AND status = 'active'
  );
END;
$$;

-- Update RLS policy for ticket creation - only allow on 'active' properties for tenants
DROP POLICY IF EXISTS "Users can create tickets for their properties" ON tickets;
CREATE POLICY "Users can create tickets for their properties" 
ON tickets
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    (EXISTS (
      SELECT 1 FROM property_tenants
      WHERE property_tenants.property_id = tickets.property_id 
      AND property_tenants.tenant_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = tickets.property_id
      AND properties.status = 'active'
    )) OR 
    (EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = tickets.property_id 
      AND properties.manager_id = auth.uid()
    )) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Update RLS policy for comment creation - only allow on tickets of 'active' properties for tenants
DROP POLICY IF EXISTS "Users can add comments to accessible tickets" ON ticket_comments;
CREATE POLICY "Users can add comments to accessible tickets" 
ON ticket_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN properties p ON p.id = t.property_id
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    WHERE t.id = ticket_comments.ticket_id
    AND t.status NOT IN ('resolved', 'cancelled')
    AND (
      (p.manager_id = auth.uid()) OR
      (pt.tenant_id = auth.uid() AND p.status = 'active') OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Update RLS policy for document upload
DROP POLICY IF EXISTS "Users can upload property documents" ON property_documents;
CREATE POLICY "Users can upload property documents" 
ON property_documents
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND 
  EXISTS (
    SELECT 1 FROM properties p
    WHERE p.id = property_documents.property_id
    AND (
      (p.manager_id = auth.uid() AND p.status IN ('active', 'ending_tenancy')) OR
      (p.status = 'active' AND EXISTS (
        SELECT 1 FROM property_tenants pt
        WHERE pt.property_id = p.id AND pt.tenant_id = auth.uid()
      ))
    )
  )
);