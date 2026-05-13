import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Download, Upload, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface DocumentActionsMenuProps {
  onView: () => void;
  onDownload: () => void;
  onUploadVersion: () => void;
  onDelete: () => void;
  canEdit: boolean;
}

export function DocumentActionsMenu({
  onView,
  onDownload,
  onUploadVersion,
  onDelete,
  canEdit,
}: DocumentActionsMenuProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAction(onView)}>
          <Eye className="mr-2 h-4 w-4" />
          {t("common.view")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction(onDownload)}>
          <Download className="mr-2 h-4 w-4" />
          {t("common.download")}
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction(onUploadVersion)}>
              <Upload className="mr-2 h-4 w-4" />
              {t("properties.uploadNewVersion")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleAction(onDelete)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("common.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DocumentActionsMenu;