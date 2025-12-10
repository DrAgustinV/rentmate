import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTickets } from "@/hooks/useTickets";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";

interface TicketsTabProps {
  propertyId: string;
}

export function TicketsTab({ propertyId }: TicketsTabProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data, isLoading } = useTickets({
    propertyId,
    status: statusFilter === "all" ? undefined : statusFilter as any,
    pageSize: 20,
  });

  const tickets = data?.tickets || [];

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter and New Ticket button */}
      <div className="flex items-center justify-between gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("tickets.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tickets.all")}</SelectItem>
            <SelectItem value="open">{t("tickets.open")}</SelectItem>
            <SelectItem value="in_progress">{t("tickets.inProgress")}</SelectItem>
            <SelectItem value="resolved">{t("tickets.resolved")}</SelectItem>
          </SelectContent>
        </Select>
        
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("tickets.newTicket")}
        </Button>
      </div>
      
      {/* Tickets table */}
      {tickets.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tickets.title")}</TableHead>
                <TableHead className="w-[120px]">{t("tickets.status")}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.title}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[ticket.status] || ""}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/properties/${propertyId}/tickets/${ticket.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            {statusFilter === "all" 
              ? t("tickets.noTickets") 
              : t("tickets.noTicketsWithStatus")}
          </p>
        </div>
      )}

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        propertyId={propertyId}
      />
    </div>
  );
}
