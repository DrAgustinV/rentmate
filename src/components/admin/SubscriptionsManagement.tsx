import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { GrantProAccessDialog } from "./GrantProAccessDialog";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export function SubscriptionsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          plan:subscription_plans(name, slug),
          profile:profiles!user_subscriptions_user_id_fkey(email, first_name, last_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredSubscriptions = subscriptions?.filter((sub: any) => {
    const email = sub.profile?.email || "";
    const name = `${sub.profile?.first_name || ""} ${sub.profile?.last_name || ""}`.trim();
    const planName = sub.plan?.name || "";
    
    const query = searchQuery.toLowerCase();
    return (
      email.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      planName.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Active", variant: "default" },
      trialing: { label: "Trial", variant: "secondary" },
      past_due: { label: "Past Due", variant: "destructive" },
      canceled: { label: "Canceled", variant: "outline" },
      expired: { label: "Expired", variant: "outline" },
    };
    
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" }> = {
      stripe: { label: "Stripe", variant: "default" },
      admin_grant: { label: "Admin Grant", variant: "secondary" },
      free: { label: "Free", variant: "outline" as any },
    };
    
    const config = typeMap[type] || { label: type, variant: "outline" as any };
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Subscriptions</h2>
          <p className="text-muted-foreground">View and manage all user subscriptions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('placeholders.searchSubscriptions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions?.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {sub.profile?.first_name && sub.profile?.last_name
                            ? `${sub.profile.first_name} ${sub.profile.last_name}`
                            : "Unnamed User"}
                        </p>
                        <p className="text-sm text-muted-foreground">{sub.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sub.plan?.name}</span>
                    </TableCell>
                    <TableCell>{getTypeBadge(sub.subscription_type)}</TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      {sub.current_period_end ? (
                        <span className="text-sm">
                          {format(new Date(sub.current_period_end), "MMM dd, yyyy")}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <GrantProAccessDialog userId={sub.user_id} currentPlanSlug={sub.plan?.slug} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
