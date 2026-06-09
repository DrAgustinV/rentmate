import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Clock, User, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTickets } from "@/hooks/useTickets";
import type { TicketStatus } from "@/types/enums";
import { useTenancyStarted } from "@/hooks/useTenancyStarted";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";
import { StandardTemplatePickerDialog } from "@/components/StandardTemplatePickerDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { ticketStatusColors } from "@/lib/statusColors";

interface TicketsTabProps {
  propertyId: string;
  tenancyId?: string;
  isManager?: boolean;
}

export function TicketsTab({ propertyId, tenancyId, isManager }: TicketsTabProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "issues" | "maintenance">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  
  const { isStarted, formattedStartDate, isLoading: tenancyLoading } = useTenancyStarted(propertyId, tenancyId);
  
  const { data, isLoading } = useTickets({
    propertyId,
    status: statusFilter === "all" ? undefined : statusFilter as TicketStatus,
    hasSourceTemplate: typeFilter === "all" ? undefined : typeFilter === "maintenance",
    pageSize: 20,
  });

  const tickets = data?.tickets || [];

  if (isLoading || tenancyLoading) {
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
      {/* Notice when tenancy hasn't started */}
      {!isStarted && formattedStartDate && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{t("tickets.availableAfterStart")} {formattedStartDate}</span>
        </div>
      )}

      {/* Header with filters and action buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("tickets.typeFilter.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("tickets.typeFilter.all")}</SelectItem>
              <SelectItem value="issues">{t("tickets.typeFilter.issues")}</SelectItem>
              <SelectItem value="maintenance">{t("tickets.typeFilter.maintenance")}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Status filter */}
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
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    size="sm" 
                    onClick={() => setCreateDialogOpen(true)}
                    disabled={!isStarted && !isManager}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("tickets.newIssue")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isStarted && formattedStartDate && (
                <TooltipContent>
                  <p>{t("tickets.availableAfterStart")} {formattedStartDate}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Schedule Maintenance button - managers only */}
          {isManager && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setTemplatePickerOpen(true)}
                      disabled={!isStarted && !isManager}
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      {t("tickets.scheduleMaintenance")}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isStarted && formattedStartDate && (
                  <TooltipContent>
                    <p>{t("tickets.availableAfterStart")} {formattedStartDate}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Tickets table */}
      <Card className="card-shine">
        <CardHeader>
          <CardTitle>{t("tickets.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>{t("tickets.title")}</TableHead>
                    <TableHead className="w-[120px]">{t("tickets.status")}</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {ticket.source_template_id ? (
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {ticket.source_template_id 
                                ? t("tickets.maintenanceTask") 
                                : t("tickets.issueTask")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>
                        <Badge className={ticketStatusColors[ticket.status] || ""}>
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
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === "all" && typeFilter === "all"
                  ? t("tickets.noTickets")
                  : t("tickets.noTicketsWithStatus")}
              </h3>
              <p className="text-muted-foreground">{t("tickets.noTicketsDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        propertyId={propertyId}
      />

      <StandardTemplatePickerDialog
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        propertyId={propertyId}
      />
    </div>
  );
}