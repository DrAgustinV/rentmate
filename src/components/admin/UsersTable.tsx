import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDate } from "@/lib/dateUtils";

type UserRole = "admin" | "user";

export function UsersTable() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      return profiles.map((profile) => ({
        ...profile,
        roles: roles.filter((r) => r.user_id === profile.id).map((r) => r.role),
      }));
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

  if (isLoading) {
    return <div className="text-center py-8">{t('admin.loadingUsers')}</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.name')}</TableHead>
            <TableHead>{t('admin.email')}</TableHead>
            <TableHead>{t('admin.phone')}</TableHead>
            <TableHead>{t('admin.roles')}</TableHead>
            <TableHead>{t('admin.joined')}</TableHead>
            <TableHead>{t('admin.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.first_name} {user.last_name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.phone || "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {user.roles.includes("admin") && (
                    <Badge variant="destructive">
                      <Shield className="mr-1 h-3 w-3" />
                      {t('admin.adminRole')}
                    </Badge>
                  )}
                  {user.roles.includes("user") && (
                    <Badge variant="secondary">
                      <User className="mr-1 h-3 w-3" />
                      {t('admin.userRole')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {formatDate(user.created_at)}
              </TableCell>
              <TableCell>
                <Select
                  onValueChange={(role: UserRole) =>
                    addRoleMutation.mutate({ userId: user.id, role })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t('admin.addRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('admin.adminRole')}</SelectItem>
                    <SelectItem value="user">{t('admin.userRole')}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
