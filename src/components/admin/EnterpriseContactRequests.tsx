import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Mail, Phone, Building2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Database } from "@/integrations/supabase/types";

type ContactRequestRow = Database["public"]["Tables"]["enterprise_contact_requests"]["Row"];

export function EnterpriseContactRequests() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ContactRequestRow | null>(null);
  const [notes, setNotes] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["enterprise-contact-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enterprise_contact_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const user = await authService.getCurrentUser();
      
      const updates: Database["public"]["Tables"]["enterprise_contact_requests"]["Update"] = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "contacted") {
        updates.contacted_by = user?.id;
        updates.contacted_at = new Date().toISOString();
      }

      if (notes) {
        updates.notes = notes;
      }

      const { error } = await supabase
        .from("enterprise_contact_requests")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprise-contact-requests"] });
      toast.success(t("enterprise.requestUpdated"));
      setSelectedRequest(null);
      setNotes("");
    },
    onError: (error: Error) => {
      toast.error(t("enterprise.requestUpdateFailed") + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      pending: { label: "Pending", variant: "secondary" },
      contacted: { label: "Contacted", variant: "default" },
      closed: { label: "Closed", variant: "outline" },
    };
    
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Enterprise Contact Requests</h2>
        <p className="text-muted-foreground">Manage Enterprise plan inquiries from potential customers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contact Requests</CardTitle>
            <CardDescription>
              {requests?.length || 0} total requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No requests yet
                    </TableCell>
                  </TableRow>
                ) : (
                  requests?.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(request.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.name}</p>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{request.company_name || "—"}</TableCell>
                      <TableCell>{request.properties_count || "—"}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRequest ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${selectedRequest.email}`} className="text-primary hover:underline">
                    {selectedRequest.email}
                  </a>
                </div>

                {selectedRequest.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedRequest.phone}`} className="text-primary hover:underline">
                      {selectedRequest.phone}
                    </a>
                  </div>
                )}

                {selectedRequest.company_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRequest.company_name}</span>
                  </div>
                )}

                {selectedRequest.properties_count && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Properties Count</p>
                    <p className="font-medium">{selectedRequest.properties_count}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </p>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedRequest.message}</p>
                </div>

                {selectedRequest.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedRequest.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Update Status</label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(status) =>
                      updateStatusMutation.mutate({ id: selectedRequest.id, status })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Add Notes</label>
                  <Textarea
                    placeholder="Add notes about this request..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedRequest.id,
                        status: selectedRequest.status,
                        notes,
                      })
                    }
                    disabled={!notes || updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Notes
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a request to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
