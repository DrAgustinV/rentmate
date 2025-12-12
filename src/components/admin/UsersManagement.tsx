import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Shield, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";
import { GrantAccessDialog } from "./GrantAccessDialog";

type UserRole = "admin" | "user";

interface UserWithSubscription {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: string[];
  subscription: {
    plan_slug: string;
    plan_name: string;
    status: string;
    subscription_type: string;
  } | null;
}

export function UsersManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const { data: subscriptions, error: subsError } = await supabase
        .from("user_subscriptions")
        .select(`
          user_id,
          status,
          subscription_type,
          plan:subscription_plans(name, slug)
        `);

      if (subsError) throw subsError;

      return profiles.map((profile): UserWithSubscription => {
        const userRoles = roles.filter((r) => r.user_id === profile.id).map((r) => r.role);
        const userSub = subscriptions.find((s) => s.user_id === profile.id);
        
        return {
          ...profile,
          roles: userRoles,
          subscription: userSub ? {
            plan_slug: (userSub.plan as any)?.slug || "free",
            plan_name: (userSub.plan as any)?.name || "Free",
            status: userSub.status,
            subscription_type: userSub.subscription_type,
          } : null,
        };
      });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t('admin.roleAddedSuccess'));
    },
    onError: (error) => {
      toast.error(t('admin.roleAddedError') + ": " + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t('admin.userDeletedSuccess'));
      setDeletingUserId(null);
    },
    onError: (error: any) => {
      toast.error(t('admin.userDeletedError') + ": " + error.message);
      setDeletingUserId(null);
    },
  });

  const filteredUsers = users?.filter((user) => {
    const email = user.email || "";
    const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    const planName = user.subscription?.plan_name || "";
    
    const query = searchQuery.toLowerCase();
    return (
      email.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      planName.toLowerCase().includes(query)
    );
  });

  const getPlanBadge = (subscription: UserWithSubscription["subscription"]) => {
    if (!subscription) {
      return <Badge variant="secondary">FREE</Badge>;
    }

    const slug = subscription.plan_slug.toUpperCase();
    const status = subscription.status;
    
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    if (slug === "PRO") variant = "default";
    if (slug === "ENTERPRISE") variant = "default";
    
    const statusIndicator = status === "active" ? "" : 
      status === "trialing" ? " (Trial)" :
      status === "past_due" ? " (Past Due)" :
      status === "canceled" ? " (Canceled)" : "";

    return (
      <Badge 
        variant={variant}
        className={slug === "ENTERPRISE" ? "bg-purple-600 hover:bg-purple-700" : ""}
      >
        {slug}{statusIndicator}
      </Badge>
    );
  };

  const getTypeBadge = (type: string | undefined) => {
    if (!type) return <Badge variant="outline">Free</Badge>;
    
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      stripe: { label: "Paid", variant: "default" },
      admin_grant: { label: "Admin Grant", variant: "secondary" },
      free: { label: "Free", variant: "outline" },
    };
    
    const config = typeMap[type] || { label: type, variant: "outline" };
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
          <h2 className="text-2xl font-bold text-foreground">Users & Subscriptions</h2>
          <p className="text-muted-foreground">Manage users, roles, and subscription access</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('placeholders.searchUsers')}
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
                <TableHead>Roles</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : "Unnamed User"}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.roles.includes("admin") && (
                          <Badge variant="destructive">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {user.roles.includes("user") && (
                          <Badge variant="secondary">
                            <User className="mr-1 h-3 w-3" />
                            User
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(user.subscription)}</TableCell>
                    <TableCell>{getTypeBadge(user.subscription?.subscription_type)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(user.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <GrantAccessDialog 
                          userId={user.id} 
                          currentPlanSlug={user.subscription?.plan_slug || "free"}
                          targetPlan="pro"
                        />
                        <GrantAccessDialog 
                          userId={user.id} 
                          currentPlanSlug={user.subscription?.plan_slug || "free"}
                          targetPlan="enterprise"
                        />
                        <Select
                          onValueChange={(role: UserRole) =>
                            addRoleMutation.mutate({ userId: user.id, role })
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setDeletingUserId(user.id)}
                          disabled={user.id === currentUserId}
                          title={user.id === currentUserId ? t('admin.cannotDeleteSelf') : t('admin.deleteUser')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingUserId} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteUserWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancelDelete')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingUserId) {
                  deleteUserMutation.mutate(deletingUserId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
