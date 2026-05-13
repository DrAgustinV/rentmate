import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Eye } from "lucide-react";

interface Version {
  id: string;
  version: number;
  file_name: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by: string;
}

interface DocumentVersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  versions: Version[];
  onView: (version: Version) => void;
  onDownload: (version: Version) => void;
}

export function DocumentVersionHistoryModal({
  open,
  onOpenChange,
  documentTitle,
  versions,
  onView,
  onDownload,
}: DocumentVersionHistoryModalProps) {
  const { t } = useLanguage();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("properties.propertyDocuments.versionHistory")}: {documentTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version, index) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">
                    v{version.version}
                    {index === 0 && (
                      <span className="ml-2 text-xs text-green-600">(latest)</span>
                    )}
                  </TableCell>
                  <TableCell className="truncate max-w-[200px]">
                    {version.file_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(version.file_size_bytes)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(version.created_at), 'PP')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(version)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(version)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentVersionHistoryModal;