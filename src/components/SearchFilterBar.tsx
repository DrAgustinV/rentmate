import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: 'newest' | 'oldest' | 'alphabetical';
  onSortChange: (value: 'newest' | 'oldest' | 'alphabetical') => void;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
}: SearchFilterBarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={sortBy} onValueChange={(value: any) => onSortChange(value)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t('search.sortBy')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t('search.newest')}</SelectItem>
          <SelectItem value="oldest">{t('search.oldest')}</SelectItem>
          <SelectItem value="alphabetical">{t('search.alphabetical')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
