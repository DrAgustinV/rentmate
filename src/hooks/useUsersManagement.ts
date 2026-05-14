import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, authService, adminService } from '@/services';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/dateUtils';

export type UserRole = 'admin' | 'user';

export interface UserWithSubscription {
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
    current_period_end: string | null;
  } | null;
}

export function useUsersManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      if (user) setCurrentUserId(user.id);

      const profiles = await profileService.getAllProfiles();
      profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const roles = await adminService.getUserRoles();

      const subscriptions = await adminService.getUserSubscriptions();

      return profiles.map((profile): UserWithSubscription => {
        const userRoles = roles.filter((r) => r.user_id === profile.id).map((r) => r.role);
        const userSub = subscriptions.find((s) => s.user_id === profile.id);
        
        return {
          ...profile,
          roles: userRoles,
          subscription: userSub ? {
            plan_slug: (userSub.plan as any)?.slug || 'free',
            plan_name: (userSub.plan as any)?.name || 'Free',
            status: userSub.status,
            subscription_type: userSub.subscription_type,
            current_period_end: userSub.current_period_end,
          } : null,
        };
      });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      await adminService.addUserRole(userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('admin.roleAddedSuccess'));
    },
    onError: (error) => {
      toast.error(t('admin.roleAddedError') + ': ' + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await adminService.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(t('admin.userDeletedSuccess'));
      setDeletingUserId(null);
    },
    onError: (error: any) => {
      toast.error(t('admin.userDeletedError') + ': ' + error.message);
      setDeletingUserId(null);
    },
  });

  const filteredUsers = users?.filter((user) => {
    const email = user.email || '';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const planName = user.subscription?.plan_name || '';
    
    const query = searchQuery.toLowerCase();
    return (
      email.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      planName.toLowerCase().includes(query)
    );
  });

  const getPlanBadge = (subscription: UserWithSubscription['subscription']) => {
    if (!subscription) {
      return <Badge variant="secondary">FREE</Badge>;
    }

    const slug = subscription.plan_slug.toUpperCase();
    const status = subscription.status;
    
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    if (slug === 'PRO') variant = 'default';
    if (slug === 'ENTERPRISE') variant = 'default';
    
    const statusIndicator = status === 'active' ? '' : 
      status === 'trialing' ? ' (Trial)' :
      status === 'past_due' ? ' (Past Due)' :
      status === 'canceled' ? ' (Canceled)' : '';

    return (
      <Badge 
        variant={variant}
        className={slug === 'ENTERPRISE' ? 'bg-purple-600 hover:bg-purple-700' : ''}
      >
        {slug}{statusIndicator}
      </Badge>
    );
  };

  const getTypeBadge = (type: string | undefined) => {
    if (!type) return <Badge variant="outline">Free</Badge>;
    
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      stripe: { label: 'Paid', variant: 'default' },
      admin_grant: { label: 'Admin Grant', variant: 'secondary' },
      free: { label: 'Free', variant: 'outline' },
    };
    
    const config = typeMap[type] || { label: type, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return {
    searchQuery, setSearchQuery,
    deletingUserId, setDeletingUserId,
    currentUserId,
    users, isLoading, filteredUsers,
    addRoleMutation, deleteUserMutation,
    getPlanBadge, getTypeBadge,
    formatDate,
  };
}
