import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  id: string;
  title: string;
  status: string;
}

interface PropertySwitcherProps {
  currentPropertyId: string;
}

export function PropertySwitcher({ currentPropertyId }: PropertySwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties-switcher"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
  });

  const currentProperty = properties.find((p) => p.id === currentPropertyId);

  if (properties.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentPropertyId}
      onValueChange={(value) => {
        const newPath = location.pathname.replace(/\/properties\/[^/]+/, `/properties/${value}`);
        navigate(`${newPath}${location.search}`);
      }}
    >
      <SelectTrigger className="w-full max-w-xs h-10">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{currentProperty?.title}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{property.title}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
