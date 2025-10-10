import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface VersionDocument {
  id: string;
  file_name: string;
  file_size_bytes: number;
  version: number;
  created_at: string;
  description: string | null;
  uploader_name?: string;
}

interface PropertyDocumentVersionHistoryProps {
  versions: VersionDocument[];
  onDownload: (doc: VersionDocument) => void;
  onDelete?: (doc: VersionDocument) => void;
  formatFileSize: (bytes: number) => string;
  getUploaderName: (doc: VersionDocument) => string;
}

export default function PropertyDocumentVersionHistory({
  versions,
  onDownload,
  onDelete,
  formatFileSize,
  getUploaderName,
}: PropertyDocumentVersionHistoryProps) {
  if (versions.length === 0) return null;

  return (
    <div className="ml-8 space-y-3">
      <Separator />
      <h5 className="text-sm font-medium text-muted-foreground">Previous Versions</h5>
      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  v{version.version}
                </Badge>
                <span className="text-sm truncate">{version.file_name}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  {formatFileSize(version.file_size_bytes)} · {getUploaderName(version)} ·{" "}
                  {format(new Date(version.created_at), "MMM dd, yyyy")}
                </p>
                {version.description && <p className="italic">{version.description}</p>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => onDownload(version)}>
                <Download className="h-3 w-3" />
              </Button>
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(version)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
