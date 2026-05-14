import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"; // ✅ Added missing import
import { showToast } from "@/lib/toast";
import { ticketService } from "@/services";
import { TemplatesManagerContent } from "./TemplatesManagerContent";
import { useLanguage } from "@/contexts/LanguageContext";

// ... rest of the file remains unchanged ...
