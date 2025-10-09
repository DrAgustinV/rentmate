-- Fix search_path for generate_ticket_number function
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  ticket_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM public.tickets;
  ticket_num := 'TKT-' || LPAD(next_num::text, 6, '0');
  NEW.ticket_number := ticket_num;
  RETURN NEW;
END;
$$;