import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, LayoutGrid, List } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: 'newest' | 'oldest' | 'alphabetical' | 'status';
  onSortChange: (value: 'newest' | 'oldest' | 'alphabetical' | 'status') => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (value: 'grid' | 'list') => void;
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
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
      <div className="flex gap-2">
        <Select value={sortBy} onValueChange={(value: string) => onSortChange(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('search.sortBy')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('search.newest')}</SelectItem>
            <SelectItem value="oldest">{t('search.oldest')}</SelectItem>
            <SelectItem value="alphabetical">{t('search.alphabetical')}</SelectItem>
            <SelectItem value="status">{t('search.byStatus')}</SelectItem>
          </SelectContent>
        </Select>
        
        {viewMode !== undefined && onViewModeChange && (
          <TooltipProvider>
            <div className="flex border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('grid')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('search.gridView')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('search.listView')}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
