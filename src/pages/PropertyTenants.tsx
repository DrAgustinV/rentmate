import { useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  UserMinus,
  Mail,
  X,
  Clock,
  ChevronDown,
  Upload,
  Copy,
  Download,
  AlertTriangle,
  Ticket,
  Trash2,
  Euro,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { CopyTemplatesDialog } from "@/components/CopyTemplatesDialog";
import { EditTenantDialog } from "@/components/EditTenantDialog";
import { EndTenancyDialog } from "@/components/EndTenancyDialog";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';
import { ContractSignatureManager } from "@/components/ContractSignatureManager";
import { CreateRentAgreementDrawer } from '@/components/CreateRentAgreementDrawer';
import { EditRentAgreementDrawer } from '@/components/EditRentAgreementDrawer';
import { useRentAgreements } from '@/hooks/useRentAgreements';
import { RentPaymentHistory } from '@/components/payments/RentPaymentHistory';
import { TenantsTab } from '@/components/property-tenants/TenantsTab';
import { ContractsTab } from '@/components/property-tenants/ContractsTab';
import { PaymentsTab } from '@/components/property-tenants/PaymentsTab';
import { TicketsTab } from '@/components/property-tenants/TicketsTab';
import { UtilitiesTab } from '@/components/property-tenants/UtilitiesTab';
import { OverviewTab } from '@/components/property-hub/OverviewTab';
import { useTenancyRequirements, CreateTenancyRequirementInput, TenancyRequirement } from '@/hooks/useTenancyRequirements';
import { CreateTenancyWizard } from '@/components/CreateTenancyWizard';
import { toast as sonnerToast } from 'sonner';


interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  planned_ending_date: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface TenancyDocument {
  id: string;
  document_title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by: string;
  description: string | null;
  version: number;
  is_latest_version: boolean;
  parent_document_id: string | null;
}

const createInviteSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .email({ message: t("dialogs.inviteTenant.emailPlaceholder") }),
  });

export default function PropertyTenants() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalyticsContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract navigation state
  const { tenancyId, tenancyStatus, fromRentals } = location.state || {};
  const isReadOnly = tenancyStatus === 'historic';

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Query for active tenant with profile info (for Overview tab)
  const { data: activeTenantWithProfile } = useQuery({
    queryKey: ["active-tenant-profile", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(`
          *,
          profiles!property_tenants_tenant_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq("property_id", propertyId)
        .eq("tenancy_status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const [email, setEmail] = useState("");
  const [removingTenant, setRemovingTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [cancellingInvitation, setCancellingInvitation] = useState<Invitation | null>(null);
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [copyTemplatesOpen, setCopyTemplatesOpen] = useState(false);
  const [expandedTenancyId, setExpandedTenancyId] = useState<string | null>(null);
  const [tenancyDocsMap, setTenancyDocsMap] = useState<Record<string, TenancyDocument[]>>({});
  const [maxPropertiesLimit, setMaxPropertiesLimit] = useState<number>(5);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
  const [selectedParentDoc, setSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showEndTenancyDialog, setShowEndTenancyDialog] = useState(false);
  const [endingTenant, setEndingTenant] = useState<Tenant | null>(null);
  const [showTenancyWizard, setShowTenancyWizard] = useState(false);

  // Tenancy Requirements Hook
  const { createRequirement, requirements, deleteRequirement } = useTenancyRequirements(propertyId!);
  
  // Get first pending tenancy requirement (draft or sent status)
  const pendingRequirement = requirements?.find(r => r.status === 'draft' || r.status === 'sent') || null;

  const handleWizardSubmit = async (data: CreateTenancyRequirementInput) => {
    try {
      await createRequirement.mutateAsync(data);
      queryClient.invalidateQueries({ queryKey: ["tenancy-requirements", propertyId] });
      setShowTenancyWizard(false);
      sonnerToast.success(t('tenancy.wizard.setupSaved') || 'Tenancy setup saved. Send invitation when ready.');
    } catch (error: any) {
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  const handleSendInvitation = async (requirement: TenancyRequirement) => {
    try {
      inviteMutation.mutate(requirement.tenant_email);
      
      await supabase
        .from('tenancy_requirements')
        .update({ status: 'sent' })
        .eq('id', requirement.id);
      
      queryClient.invalidateQueries({ queryKey: ['tenancy-requirements', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['invitations', propertyId] });
      sonnerToast.success(t('tenancy.invitationSent') || 'Invitation sent to tenant');
    } catch (error: any) {
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  const handleCancelSetup = async (requirement: TenancyRequirement) => {
    try {
      if (requirement.invitation_id) {
        await supabase
          .from('invitations')
          .update({ status: 'cancelled' })
          .eq('id', requirement.invitation_id);
      } else {
        await supabase
          .from('invitations')
          .update({ status: 'cancelled' })
          .eq('property_id', propertyId)
          .eq('email', requirement.tenant_email)
          .eq('status', 'pending');
      }
      
      await deleteRequirement.mutateAsync(requirement.id);
      queryClient.invalidateQueries({ queryKey: ['invitations', propertyId] });
    } catch (error: any) {
      sonnerToast.error(error.message || t('common.error'));
    }
  };

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", propertyId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: propertyData } = await supabase
        .from("properties")
        .select("manager_id")
        .eq("id", propertyId)
        .single();
      return { isManager: propertyData?.manager_id === user.id };
    },
    enabled: !!propertyId,
  });

  const { data: activeTenants } = useQuery({
    queryKey: ["active-tenants", propertyId],
    queryFn: async () => {
      // Step 1: Fetch property_tenants records (tenant can see their own via RLS)
      const { data: tenancies, error: tenanciesError } = await supabase
        .from("property_tenants")
        .select("id, tenant_id, tenancy_status, started_at, ended_at, planned_ending_date, notes")
        .eq("property_id", propertyId)
        .in("tenancy_status", ["active", "ending_tenancy"])
        .order("started_at", { ascending: false });

      if (tenanciesError) throw tenanciesError;
      if (!tenancies || tenancies.length === 0) return [];

      // Step 2: Fetch profiles for the tenant IDs (users can see their own profile via RLS)
      const tenantIds = tenancies.map(t => t.tenant_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, avatar_url, kyc_status")
        .in("id", tenantIds);

      if (profilesError) throw profilesError;

      // Step 3: Merge the data client-side
      return tenancies.map((tenancy) => {
        const profile = profiles?.find(p => p.id === tenancy.tenant_id);
        return {
          ...tenancy,
          email: profile?.email || "Unknown",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          kyc_status: profile?.kyc_status || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId,
  });

  // Find focused tenant if tenancyId provided, otherwise get first active tenant
  const focusedTenant = activeTenants?.find((t) => t.id === tenancyId);
  const currentTenant = focusedTenant || (activeTenants && activeTenants.length > 0 ? activeTenants[0] : null);

  // Compute tenancy setup state
  const canSetupNewTenancy = (!currentTenant || currentTenant?.tenancy_status === 'ending_tenancy') && !pendingRequirement;
  const hasEndingTenancy = currentTenant?.tenancy_status === 'ending_tenancy';

  const { data: tenancyDocuments, refetch: refetchDocuments } = useQuery({
    queryKey: ["tenancy-documents", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("tenancy_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenancyDocument[];
    },
    enabled: !!currentTenant,
  });

  const { data: invitations, refetch: refetchInvitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  // Query for contract templates
  const { data: templates } = useQuery({
    queryKey: ["contract-templates", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("id, document_title")
        .eq("document_category", "template")
        .or(`property_id.eq.${propertyId},property_id.is.null`)
        .eq("is_latest_version", true)
        .order("document_title");
      if (error) throw error;
      return data as Array<{ id: string; document_title: string }>;
    },
    enabled: !!propertyId,
  });

  // Query for rent agreements (for managers)
  const { data: rentAgreements, isLoading: agreementsLoading } = useRentAgreements(propertyId);

  // Check for active contract signatures
  const { data: contractSignatures } = useQuery({
    queryKey: ['contract-signatures', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('tenancy_id, workflow_status')
        .eq('property_id', propertyId)
        .in('workflow_status', ['pending', 'in_progress']);
      
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  const { data: tenancyHistory } = useQuery({
    queryKey: ["tenancy-history", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_tenants")
        .select(
          `
          id,
          tenant_id,
          tenancy_status,
          started_at,
          ended_at,
          profiles!property_tenants_tenant_id_fkey (
            email,
            first_name,
            last_name
          )
        `,
        )
        .eq("property_id", propertyId)
        .in("tenancy_status", ["ending_tenancy", "historic"])
        .order("started_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data.map((item: any) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        return {
          ...item,
          email: profile?.email || "Unknown",
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
        } as Tenant;
      });
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  const { data: propertyCount } = useQuery({
    queryKey: ["property-count"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count, error } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("manager_id", user.id)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch property limit setting
  useQuery({
    queryKey: ["max-properties-limit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "max_active_properties_per_user")
        .maybeSingle();

      if (!error && data) {
        const limit = parseInt((data.setting_value as any).value);
        setMaxPropertiesLimit(limit);
        return limit;
      }
      return 5;
    },
  });

  const loadTenancyDocuments = async (tenancyId: string) => {
    if (tenancyDocsMap[tenancyId]) return;

    const { data, error } = await supabase
      .from("property_documents")
      .select("*")
      .eq("tenancy_id", tenancyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTenancyDocsMap((prev) => ({ ...prev, [tenancyId]: data as TenancyDocument[] }));
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const inviteSchema = createInviteSchema(t);
      const data = inviteSchema.parse({ email });

      const { data: profiles } = await supabase.from("profiles").select("id").eq("email", data.email).maybeSingle();

      if (profiles) {
        const { data: existing } = await supabase
          .from("property_tenants")
          .select("id")
          .eq("property_id", propertyId!)
          .eq("tenant_id", profiles.id)
          .maybeSingle();
        if (existing) throw new Error(t("dialogs.inviteTenant.alreadyTenant"));
      }

      // Check for ANY existing invitation (pending, cancelled, or accepted)
      const { data: existingInvite } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("email", data.email)
        .eq("property_id", propertyId!)
        .maybeSingle();

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      if (existingInvite) {
        if (existingInvite.status === "pending") {
          throw new Error(t("dialogs.inviteTenant.alreadyInvited"));
        }

        // If cancelled or accepted, reactivate with new token and expiration
        if (existingInvite.status === "cancelled" || existingInvite.status === "accepted") {
          const { error } = await supabase
            .from("invitations")
            .update({
              token,
              expires_at: expiresAt.toISOString(),
              status: "pending",
              invited_user_id: profiles?.id || null,
            })
            .eq("id", existingInvite.id);

          if (error) throw error;
        }
      } else {
        // If no existing invitation, create new one
        const { error } = await supabase.from("invitations").insert({
          token,
          email: data.email,
          property_id: propertyId,
          expires_at: expiresAt.toISOString(),
          invited_user_id: profiles?.id || null,
        });

        if (error) throw error;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: managerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const managerName = managerProfile
        ? `${managerProfile.first_name || ""} ${managerProfile.last_name || ""}`.trim() || "Property Manager"
        : "Property Manager";

      await supabase.functions.invoke("send-tenant-invitation", {
        body: {
          email: data.email,
          propertyTitle: property?.title,
          propertyAddress: null,
          managerName,
          token,
          expiresAt: expiresAt.toISOString(),
          language: localStorage.getItem("language") || "en",
          projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
          propertyId: propertyId,
        },
      });
    },
    onSuccess: () => {
      // Track tenant invitation event
      trackEvent({
        event_name: 'tenant_invited',
        event_category: 'tenant_management',
        event_metadata: {
          property_id: propertyId,
          tenant_email: email,
        },
      });
      
      toast({ title: t("dialogs.inviteTenant.sent"), description: `${t("dialogs.inviteTenant.sentDesc")} ${email}` });
      setEmail("");
      refetchInvitations();
    },
    onError: (error: any) => {
      if (error instanceof z.ZodError) {
        toast({ title: t("common.validationError"), description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
    },
  });

  // Step 1: End tenancy (sets status to 'ending_tenancy' with planned end date)
  const endTenancyMutation = useMutation({
    mutationFn: async ({ tenantId, plannedEndDate }: { tenantId: string; plannedEndDate: string }) => {
      const { error } = await supabase
        .from("property_tenants")
        .update({
          tenancy_status: "ending_tenancy",
          planned_ending_date: plannedEndDate,
        })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.tenancyEnding") });
      queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-history", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["active-tenant-profile", propertyId] });
      setRemovingTenant(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  // Step 2: Finalize tenancy (sets status to 'historic' and records end date)
  const finalizeTenancyMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from("property_tenants")
        .update({
          tenancy_status: "historic",
          ended_at: new Date().toISOString(),
        })
        .eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.tenancyFinalized") });
      queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["tenancy-history", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["active-tenant-profile", propertyId] });
      setRemovingTenant(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("dialogs.manageTenants.invitationCancelled") });
      refetchInvitations();
      setCancellingInvitation(null);
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getUploaderName = (doc: TenancyDocument) => {
    return doc.uploaded_by ? "User" : "Unknown";
  };

  const toggleDocumentExpansion = (docTitle: string) => {
    setExpandedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docTitle)) {
        newSet.delete(docTitle);
      } else {
        newSet.add(docTitle);
      }
      return newSet;
    });
  };

  const groupedDocuments = tenancyDocuments?.reduce((acc, doc) => {
    if (!acc[doc.document_title]) {
      acc[doc.document_title] = [];
    }
    acc[doc.document_title].push(doc);
    return acc;
  }, {} as Record<string, TenancyDocument[]>);

  Object.keys(groupedDocuments || {}).forEach((title) => {
    groupedDocuments![title].sort((a, b) => b.version - a.version);
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("property_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t("properties.propertyDocuments.deleteSuccess") });
      refetchDocuments();
    },
    onError: (error: any) => {
      toast({ title: t("properties.propertyDocuments.deleteFailed"), description: error.message, variant: "destructive" });
    },
  });

  const downloadDocument = async (doc: TenancyDocument) => {
    try {
      const { data, error } = await supabase.storage.from('property-documents').download(doc.file_path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const VIEWABLE_EXTENSIONS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  const openDocument = async (doc: TenancyDocument) => {
    const extension = doc.file_name.toLowerCase().substring(doc.file_name.lastIndexOf('.'));
    const isViewable = VIEWABLE_EXTENSIONS.includes(extension);
    
    if (isViewable) {
      // Open window synchronously to preserve user gesture (prevent popup blocker)
      const newWindow = window.open('', '_blank');
      
      try {
        const { data, error } = await supabase.storage
          .from("property-documents")
          .createSignedUrl(doc.file_path, 3600); // 1 hour expiry
        
        if (error || !data?.signedUrl) {
          newWindow?.close();
          toast({ title: t("properties.openError"), variant: "destructive" });
          return;
        }
        
        if (newWindow) {
          newWindow.location.href = data.signedUrl;
        }
      } catch (error: any) {
        newWindow?.close();
        toast({ title: t("properties.openError"), description: error.message, variant: "destructive" });
      }
    } else {
      // Non-viewable files: use download behavior
      downloadDocument(doc);
    }
  };

  if (propertyLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!property) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("properties.notFound")}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          {fromRentals ? (
            <Button variant="ghost" size="sm" onClick={() => navigate('/rentals')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("rentals.backToRentals")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/properties')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{property.title}</h1>
            <p className="text-muted-foreground">{t("propertyHub.subtitle")}</p>
          </div>
        </div>

        {/* Read-Only Warning for Archived Tenancies */}
        {isReadOnly && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("renting.archivedTenancy")}</AlertTitle>
            <AlertDescription>{t("renting.archivedWarning")}</AlertDescription>
          </Alert>
        )}

        {/* Property Limit Warning */}
        {userRole?.isManager && propertyCount !== undefined && propertyCount >= maxPropertiesLimit - 1 && (
          <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">{t("properties.freePlanLimitTitle")}</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                {propertyCount >= maxPropertiesLimit
                  ? `You have reached the limit of ${maxPropertiesLimit} active properties. Please contact support to increase your limit.`
                  : `You have created ${propertyCount} active properties. You can create ${maxPropertiesLimit - propertyCount} more.`}
              </p>
            </div>
          </div>
        )}

        {/* Tabs Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("propertyHub.title")}</CardTitle>
            <CardDescription>{t("propertyHub.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview">{t("propertyHub.overview")}</TabsTrigger>
                <TabsTrigger value="tenants">{t("propertyTenants.tabs.tenants")}</TabsTrigger>
                <TabsTrigger value="contracts">{t("propertyTenants.tabs.contracts")}</TabsTrigger>
                <TabsTrigger value="payments">{t("propertyTenants.tabs.payments")}</TabsTrigger>
                <TabsTrigger value="utilities">{t("propertyTenants.tabs.utilities")}</TabsTrigger>
                <TabsTrigger value="tickets">{t("propertyTenants.tabs.tickets")}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <OverviewTab
                  property={property}
                  propertyId={propertyId!}
                  userRole={userRole}
                  activeTenant={activeTenantWithProfile}
                  templates={templates}
                  invitations={invitations}
                  onInviteTenant={(email) => inviteMutation.mutate(email)}
                />
              </TabsContent>

              <TabsContent value="tenants" className="mt-6">
                <TenantsTab
                  activeTenants={activeTenants}
                  invitations={invitations}
                  tenancyHistory={tenancyHistory}
                  userRole={userRole}
                  isReadOnly={isReadOnly}
                  email={email}
                  setEmail={setEmail}
                  showInviteForm={showInviteForm}
                  setShowInviteForm={setShowInviteForm}
                  setRemovingTenant={setRemovingTenant}
                  setEditingTenant={setEditingTenant}
                  setCancellingInvitation={setCancellingInvitation}
                  onInviteTenant={(email) => inviteMutation.mutate(email)}
                  invitePending={inviteMutation.isPending}
                  currentTenant={currentTenant}
                  propertyCount={propertyCount}
                  maxPropertiesLimit={maxPropertiesLimit}
                  tenancyDocsMap={tenancyDocsMap}
                  expandedTenancyId={expandedTenancyId}
                  setExpandedTenancyId={setExpandedTenancyId}
                  loadTenancyDocuments={loadTenancyDocuments}
                  downloadDocument={downloadDocument}
                  openDocument={openDocument}
                  propertyId={propertyId!}
                  propertyCountry={property?.country || undefined}
                  onEndTenancy={(tenant) => {
                    setEndingTenant(tenant);
                    setShowEndTenancyDialog(true);
                  }}
                  pendingRequirement={pendingRequirement}
                  canSetupNewTenancy={canSetupNewTenancy}
                  hasEndingTenancy={hasEndingTenancy}
                  onStartSetup={() => setShowTenancyWizard(true)}
                  onSendInvitation={handleSendInvitation}
                  onCancelSetup={handleCancelSetup}
                  isDeleting={deleteRequirement.isPending}
                />
              </TabsContent>

              <TabsContent value="contracts" className="mt-6">
                <ContractsTab
                  currentTenant={currentTenant}
                  propertyId={propertyId!}
                  tenancyDocuments={tenancyDocuments}
                  groupedDocuments={groupedDocuments}
                  userRole={userRole}
                  isReadOnly={isReadOnly}
                  uploadDocumentOpen={uploadDocumentOpen}
                  setUploadDocumentOpen={setUploadDocumentOpen}
                  copyTemplatesOpen={copyTemplatesOpen}
                  setCopyTemplatesOpen={setCopyTemplatesOpen}
                  selectedParentDoc={selectedParentDoc}
                  setSelectedParentDoc={setSelectedParentDoc}
                  expandedDocuments={expandedDocuments}
                  toggleDocumentExpansion={toggleDocumentExpansion}
                  refetchDocuments={refetchDocuments}
                  downloadDocument={downloadDocument}
                  openDocument={openDocument}
                  deleteDocumentMutation={deleteDocumentMutation}
                  onRefreshContract={() => queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] })}
                />
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <PaymentsTab
                  currentTenant={currentTenant}
                  propertyId={propertyId!}
                  userRole={userRole}
                  rentAgreements={rentAgreements}
                  agreementsLoading={agreementsLoading}
                  contractSignatures={contractSignatures}
                />
              </TabsContent>

              <TabsContent value="utilities" className="mt-6">
                <UtilitiesTab
                  currentTenant={currentTenant}
                  propertyId={propertyId!}
                  userRole={userRole?.isManager ? 'manager' : 'tenant'}
                />
              </TabsContent>

              <TabsContent value="tickets" className="mt-6">
                <TicketsTab propertyId={propertyId!} />
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* End Tenancy Dialog with Date Picker */}
      <EndTenancyDialog
        open={showEndTenancyDialog}
        onOpenChange={(open) => {
          setShowEndTenancyDialog(open);
          if (!open) setEndingTenant(null);
        }}
        tenantName={endingTenant ? getTenantName(endingTenant) : ""}
        onConfirm={(plannedEndDate) => {
          if (endingTenant) {
            endTenancyMutation.mutate({ tenantId: endingTenant.id, plannedEndDate });
          }
          setShowEndTenancyDialog(false);
          setEndingTenant(null);
        }}
        isPending={endTenancyMutation.isPending}
      />

      {/* Finalize Tenancy Dialog */}
      <AlertDialog open={!!removingTenant} onOpenChange={() => setRemovingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.finalizeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {`${t("dialogs.manageTenants.finalizeMessage")} ${removingTenant && getTenantName(removingTenant)}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (removingTenant) {
                  finalizeTenancyMutation.mutate(removingTenant.id);
                }
              }}
            >
              {t("dialogs.manageTenants.finalize")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog open={!!cancellingInvitation} onOpenChange={() => setCancellingInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.manageTenants.cancelInvitationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellingInvitation &&
                `${t("dialogs.manageTenants.cancelInvitationDesc")} ${cancellingInvitation.email}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingInvitation && cancelInvitationMutation.mutate(cancellingInvitation.id)}
            >
              {t("dialogs.manageTenants.cancelInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Templates Dialog */}
      {currentTenant && (
        <CopyTemplatesDialog
          open={copyTemplatesOpen}
          onOpenChange={setCopyTemplatesOpen}
          propertyId={propertyId!}
          tenancyId={currentTenant.id}
        />
      )}

      {/* Edit Tenant Dialog */}
      <EditTenantDialog
        tenant={editingTenant}
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        propertyId={propertyId!}
        readOnly={isReadOnly}
      />

      {/* Tenancy Setup Wizard */}
      <CreateTenancyWizard
        open={showTenancyWizard}
        onOpenChange={setShowTenancyWizard}
        propertyId={propertyId!}
        propertyCountry={property?.country}
        templates={templates}
        onSubmit={handleWizardSubmit}
        isSubmitting={createRequirement.isPending}
      />
    </AppLayout>
  );
}
