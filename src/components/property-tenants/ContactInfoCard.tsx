import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Mail, Phone, User, CalendarX, Plus, Pencil } from "lucide-react";
import { getSignedUrl } from "@/services";
import { STORAGE_BUCKETS, SIGNED_URL_TTL } from "@/constants";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  started_at: string;
  ended_at: string | null;
  planned_ending_date?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
}

interface ContactInfoCardProps {
  propertyId: string;
  currentTenant: Tenant | null;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
  onEditTenant?: (tenant: Tenant) => void;
  onEndTenancy?: (tenant: Tenant) => void;
  onInvite?: () => void;
  invitationStatus?: 'none' | 'draft' | 'pending' | 'accepted' | 'declined' | 'expired';
}

export function ContactInfoCard({
  propertyId,
  currentTenant,
  userRole,
  isReadOnly,
  onEditTenant,
  onEndTenancy,
  onInvite,
  invitationStatus = 'none',
}: ContactInfoCardProps) {
  const { t } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // CRITICAL: All hooks must be called unconditionally before any early returns
  // For tenants: fetch manager info (always run, filter in render)
  const { data: managerInfo, isLoading: managerLoading } = useQuery({
    queryKey: ["property-manager", propertyId],
    queryFn: async () => {
      const { data: property } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId)
        .single();

      if (!property?.manager_id) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, phone, avatar_url")
        .eq("id", property.manager_id)
        .single();

      return profile;
    },
    enabled: !!propertyId,
  });

  // Show loading state when userRole is still being determined
  // This prevents showing tenant view to managers during initial load
  // CRITICAL: This must be after ALL hooks to avoid hooks count mismatch
  const isManagerView = userRole?.isManager;
  const showLoadingSkeleton = userRole === undefined;

  // Load signed URL for avatar
  useEffect(() => {
    const loadAvatarUrl = async () => {
      const avatarPath = userRole?.isManager ? currentTenant?.avatar_url : managerInfo?.avatar_url;
      if (avatarPath) {
        try {
          const url = await getSignedUrl(STORAGE_BUCKETS.PROFILE_PHOTOS, avatarPath, SIGNED_URL_TTL);
          setAvatarUrl(url);
        } catch (e) {
          // ignore
        }
      }
    };
    loadAvatarUrl();
  }, [currentTenant?.avatar_url, managerInfo?.avatar_url, userRole?.isManager]);

  // Show loading state when userRole is still being determined
  if (showLoadingSkeleton) {
    return (
      <Card className="card-shine">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manager view: show tenant info or empty state
  if (isManagerView) {
    // Empty state for managers
    if (!currentTenant) {
      return (
        <Card className="card-shine">
          <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("contracts.tenantInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <div className="text-center text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("contracts.noTenant") || "No tenant assigned"}</p>
                <p className="text-xs mt-1">{t("contracts.noTenantDesc") || "Set up tenancy to start managing this property"}</p>
              </div>
              {onInvite && (
                <Button 
                  onClick={onInvite} 
                  variant="default"
                  size="lg"
                  className="h-16 sm:h-20 px-8 sm:px-12 text-base sm:text-lg gap-2"
                >
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  {t("tenancy.setupTenancy") || "Set Up Tenancy"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    const getTenantName = () => {
      if (currentTenant.first_name && currentTenant.last_name) {
        return `${currentTenant.first_name} ${currentTenant.last_name}`;
      }
      if (currentTenant.first_name) return currentTenant.first_name;
      return currentTenant.email;
    };

    const getTenantInitials = () => {
      const first = currentTenant.first_name?.charAt(0) || "";
      const last = currentTenant.last_name?.charAt(0) || "";
      return (first + last).toUpperCase() || currentTenant.email.charAt(0).toUpperCase();
    };

    return (
      <Card className="card-shine">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("contracts.tenantInfo")}
            </CardTitle>
            {!isReadOnly && onEditTenant && (
              <Button variant="outline" size="sm" onClick={() => onEditTenant(currentTenant)}>
                <Pencil className="h-3 w-3 mr-1" />
                {t("common.edit")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={avatarUrl || undefined} alt={getTenantName()} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {getTenantInitials()}
                  </AvatarFallback>
                </Avatar>
                {currentTenant.kyc_status === 'verified' && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                    <BadgeCheck className="h-4 w-4 text-blue-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{getTenantName()}</p>
                  {currentTenant.tenancy_status === 'ending_tenancy' && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30">
                      {t("tenants.endingTenancy")}
                    </Badge>
                  )}
                  {currentTenant.kyc_status === 'verified' && (
                    <span className="text-xs text-blue-500 font-medium">
                      {t("tenants.kycVerified")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Mail className="h-3 w-3" />
                  {currentTenant.email}
                </div>
                {currentTenant.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{currentTenant.notes}</p>
                )}
              </div>
            </div>
            {!isReadOnly && (currentTenant.tenancy_status === 'active' || currentTenant.tenancy_status === 'ending_tenancy') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEndTenancy?.(currentTenant)}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 flex-shrink-0"
              >
                <CalendarX className="h-3 w-3 mr-1" />
                {t("dialogs.manageTenants.endTenancy")}
              </Button>
            )}
            {/* Invite Tenant button for self-managed active tenancies */}
            {!isReadOnly && currentTenant.tenancy_status === 'active' && !currentTenant.tenant_id && onInvite && (
              <Button
                variant="outline"
                size="sm"
                onClick={onInvite}
                className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex-shrink-0"
              >
                <Mail className="h-3 w-3 mr-1" />
                {t("tenancy.inviteTenant")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tenant view: show manager info
  if (managerLoading) {
    return (
      <Card className="card-shine">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state for tenants
  if (!managerInfo) {
    return (
      <Card className="card-shine">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("contracts.managerInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("contracts.noManagerInfo")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getManagerName = () => {
    if (managerInfo.first_name && managerInfo.last_name) {
      return `${managerInfo.first_name} ${managerInfo.last_name}`;
    }
    if (managerInfo.first_name) return managerInfo.first_name;
    return managerInfo.email;
  };

  const getManagerInitials = () => {
    const first = managerInfo.first_name?.charAt(0) || "";
    const last = managerInfo.last_name?.charAt(0) || "";
    return (first + last).toUpperCase() || managerInfo.email.charAt(0).toUpperCase();
  };

  return (
    <Card className="card-shine">
      <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("contracts.managerInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl || undefined} alt={getManagerName()} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getManagerInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{getManagerName()}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Mail className="h-3 w-3" />
              {managerInfo.email}
            </div>
            {managerInfo.phone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Phone className="h-3 w-3" />
                {managerInfo.phone}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
