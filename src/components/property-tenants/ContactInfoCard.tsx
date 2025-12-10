import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Mail, Phone, User, Edit, CalendarX } from "lucide-react";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
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
}

export function ContactInfoCard({
  propertyId,
  currentTenant,
  userRole,
  isReadOnly,
  onEditTenant,
  onEndTenancy,
}: ContactInfoCardProps) {
  const { t } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // For tenants: fetch manager info
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
    enabled: !userRole?.isManager && !!propertyId,
  });

  // Load signed URL for avatar
  useEffect(() => {
    const loadAvatarUrl = async () => {
      const avatarPath = userRole?.isManager ? currentTenant?.avatar_url : managerInfo?.avatar_url;
      if (avatarPath) {
        const { data } = await supabase.storage
          .from('profile-photos')
          .createSignedUrl(avatarPath, 3600);
        if (data) setAvatarUrl(data.signedUrl);
      }
    };
    loadAvatarUrl();
  }, [currentTenant?.avatar_url, managerInfo?.avatar_url, userRole?.isManager]);

  // Manager view: show tenant info or empty state
  if (userRole?.isManager) {
    // Empty state for managers
    if (!currentTenant) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("contracts.tenantInfo") || "Tenant Information"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("dialogs.manageTenants.noTenants") || "No current tenant"}</p>
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("contracts.tenantInfo") || "Tenant Information"}
          </CardTitle>
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
                      {t("tenants.kycVerified") || "Verified"}
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
            {!isReadOnly && (
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => onEditTenant?.(currentTenant)}>
                  <Edit className="h-3 w-3 mr-1" />
                  {t("common.edit")}
                </Button>
                {currentTenant.tenancy_status === 'active' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEndTenancy?.(currentTenant)}
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                  >
                    <CalendarX className="h-3 w-3 mr-1" />
                    {t("dialogs.manageTenants.endTenancy")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tenant view: show manager info
  if (managerLoading) {
    return (
      <Card>
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("contracts.managerInfo") || "Property Manager"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t("contracts.noManagerInfo") || "Manager info unavailable"}</p>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("contracts.managerInfo") || "Property Manager"}
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
