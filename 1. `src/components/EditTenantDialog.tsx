// ... existing imports ...

export function EditTenantDialog({ tenant, open, onOpenChange, propertyId, readOnly = false }: EditTenantDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState<Date | undefined>(
    tenant ? new Date(tenant.started_at) : undefined
  );
  const [tenancyStatus, setTenancyStatus] = useState<'active' | 'ending_tenancy' | 'historic'>(
    tenant?.tenancy_status || "active"
  );
  const [notes, setNotes] = useState(tenant?.notes || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tenant || !startDate) return;

      // ✅ Fixed: Use tenant.id and local state instead of undefined variables
      await tenancyService.updatePropertyTenantStatus(tenant.id, {
        first_name: tenant.first_name,
        last_name: tenant.last_name,
        email: tenant.email,
        notes,
        started_at: startDate.toISOString(),
        tenancy_status: tenancyStatus,
      });
    },
    onSuccess: () => {
      showToast.success({
        title: t("tenants.tenantUpdated"),
        description: t("tenants.tenantUpdatedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["current-tenant", propertyId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      showToast.error({
        title: t("common.error"),
        description: error.message,
      });
    },
  });

  // ... rest of the component remains unchanged ...
