import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Check, X, Plus, Trash2, Copy, Languages, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLanguageSettings } from "@/hooks/useLanguageSettings";
import { AVAILABLE_LANGUAGES } from "@/lib/i18n/languages.config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FeatureEditorProps {
  features: Record<string, string[]>;
  limitations: Record<string, string[]>;
  enabledLanguages: string[];
  onChange: (features: Record<string, string[]>, limitations: Record<string, string[]>) => void;
  planSlug: string;
}

function FeatureEditor({ features, limitations, enabledLanguages, onChange, planSlug }: FeatureEditorProps) {
  const [activeTab, setActiveTab] = useState("en");

  const getLanguageLabel = (code: string) => {
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.flag} ${lang.code.toUpperCase()}` : code.toUpperCase();
  };

  const hasTranslation = (code: string) => {
    return features[code] && features[code].length > 0;
  };

  const translatedCount = enabledLanguages.filter(code => hasTranslation(code)).length;

  const copyFromEnglish = (langCode: string) => {
    const newFeatures = { ...features, [langCode]: [...(features['en'] || [])] };
    const newLimitations = { ...limitations, [langCode]: [...(limitations['en'] || [])] };
    onChange(newFeatures, newLimitations);
    toast.success(`Copied English content to ${langCode.toUpperCase()}. Please translate.`);
  };

  const updateFeature = (langCode: string, index: number, value: string) => {
    const newFeatures = { ...features };
    if (!newFeatures[langCode]) newFeatures[langCode] = [];
    newFeatures[langCode][index] = value;
    onChange(newFeatures, limitations);
  };

  const addFeature = (langCode: string) => {
    const newFeatures = { ...features };
    if (!newFeatures[langCode]) newFeatures[langCode] = [];
    newFeatures[langCode].push("");
    onChange(newFeatures, limitations);
  };

  const removeFeature = (langCode: string, index: number) => {
    const newFeatures = { ...features };
    if (newFeatures[langCode]) {
      newFeatures[langCode].splice(index, 1);
      onChange(newFeatures, limitations);
    }
  };

  const updateLimitation = (langCode: string, index: number, value: string) => {
    const newLimitations = { ...limitations };
    if (!newLimitations[langCode]) newLimitations[langCode] = [];
    newLimitations[langCode][index] = value;
    onChange(features, newLimitations);
  };

  const addLimitation = (langCode: string) => {
    const newLimitations = { ...limitations };
    if (!newLimitations[langCode]) newLimitations[langCode] = [];
    newLimitations[langCode].push("");
    onChange(features, newLimitations);
  };

  const removeLimitation = (langCode: string, index: number) => {
    const newLimitations = { ...limitations };
    if (newLimitations[langCode]) {
      newLimitations[langCode].splice(index, 1);
      onChange(features, newLimitations);
    }
  };

  return (
    <div className="space-y-4 mt-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          <span className="font-medium">Features Display (Pricing Page)</span>
        </div>
        <Badge variant={translatedCount === enabledLanguages.length ? "default" : "secondary"}>
          {translatedCount}/{enabledLanguages.length} languages
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {enabledLanguages.map((code) => (
            <TabsTrigger key={code} value={code} className="gap-1">
              {getLanguageLabel(code)}
              {hasTranslation(code) ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <X className="h-3 w-3 text-orange-500" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {enabledLanguages.map((langCode) => (
          <TabsContent key={langCode} value={langCode} className="space-y-4">
            {!hasTranslation(langCode) && langCode !== 'en' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>No translation for {langCode.toUpperCase()}. Will fall back to English.</span>
                  <Button size="sm" variant="outline" onClick={() => copyFromEnglish(langCode)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy from English
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Features Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Features (shown with ✓)</Label>
              {(features[langCode] || []).map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => updateFeature(langCode, index, e.target.value)}
                    placeholder={`Feature ${index + 1}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFeature(langCode, index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => addFeature(langCode)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Feature
              </Button>
            </div>

            {/* Limitations Section (only for free plan) */}
            {planSlug === 'free' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Limitations (shown with •)</Label>
                {(limitations[langCode] || []).map((limitation, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={limitation}
                      onChange={(e) => updateLimitation(langCode, index, e.target.value)}
                      placeholder={`Limitation ${index + 1}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLimitation(langCode, index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addLimitation(langCode)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Limitation
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function SubscriptionPlansManagement() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const { enabledLanguages, loading: languagesLoading } = useLanguageSettings();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data;
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, updates }: { planId: string; updates: any }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update(updates)
        .eq("id", planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["public-subscription-plans"] });
      toast.success("Plan updated successfully");
      setEditingPlan(null);
      setFormData({});
    },
    onError: (error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });

  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);

  const syncToStripeMutation = useMutation({
    mutationFn: async (planId: string) => {
      setSyncingPlanId(planId);
      const data = await adminService.syncStripePrices({ planSlug: plan.slug });
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      toast.success("Synced to Stripe successfully");
      setSyncingPlanId(null);
    },
    onError: (error) => {
      toast.error(`Stripe sync failed: ${error.message}`);
      setSyncingPlanId(null);
    },
  });

  const handleEdit = (plan: any) => {
    const featureLimits = typeof plan.feature_limits === 'object' ? plan.feature_limits : {};
    setFormData({
      name: plan.name,
      description: plan.description,
      price_monthly_cents: plan.price_monthly_cents / 100,
      price_annual_cents: plan.price_annual_cents / 100,
      trial_days: plan.trial_days,
      grace_period_days: plan.grace_period_days,
      overage_price_per_signature_cents: plan.overage_price_per_signature_cents / 100,
      overage_price_per_government_id_cents: (plan.overage_price_per_government_id_cents || 100) / 100,
      digital_signatures_per_year: (featureLimits as any).digital_signatures_per_year || 0,
      property_limit: (featureLimits as any).property_limit || 1,
      government_id_verifications_per_year: (featureLimits as any).government_id_verifications_per_year || 0,
      kilt_kyc_enabled: (featureLimits as any).kilt_kyc_enabled ?? true,
      government_id_kyc_enabled: (featureLimits as any).government_id_kyc_enabled ?? false,
      features_display: typeof plan.features_display === 'object' ? plan.features_display : {},
      limitations_display: typeof plan.limitations_display === 'object' ? plan.limitations_display : {},
      slug: plan.slug,
    });
    setEditingPlan(plan.id);
  };

  const handleSave = (planId: string) => {
    const currentPlan = plans?.find(p => p.id === planId);
    if (!currentPlan) return;

    const updates: any = {
      name: formData.name,
      description: formData.description,
      price_monthly_cents: Math.round(formData.price_monthly_cents * 100),
      price_annual_cents: Math.round(formData.price_annual_cents * 100),
      trial_days: formData.trial_days,
      grace_period_days: formData.grace_period_days,
      overage_price_per_signature_cents: Math.round(formData.overage_price_per_signature_cents * 100),
      overage_price_per_government_id_cents: Math.round(formData.overage_price_per_government_id_cents * 100),
      feature_limits: {
        ...(typeof currentPlan.feature_limits === 'object' ? currentPlan.feature_limits : {}),
        digital_signatures_per_year: formData.digital_signatures_per_year,
        property_limit: formData.property_limit,
        government_id_verifications_per_year: formData.government_id_verifications_per_year,
        kilt_kyc_enabled: formData.kilt_kyc_enabled,
        government_id_kyc_enabled: formData.government_id_kyc_enabled,
      },
      features_display: formData.features_display,
      limitations_display: formData.limitations_display,
    };

    updatePlanMutation.mutate({ planId, updates });
  };

  const toggleAvailability = (planId: string, currentValue: boolean) => {
    updatePlanMutation.mutate({
      planId,
      updates: { is_available_for_signup: !currentValue },
    });
  };

  const handleFeaturesChange = (features: Record<string, string[]>, limitations: Record<string, string[]>) => {
    setFormData({ ...formData, features_display: features, limitations_display: limitations });
  };

  const getTranslationStatus = (plan: any) => {
    const features = typeof plan.features_display === 'object' ? plan.features_display : {};
    const translated = enabledLanguages.filter(code => features[code] && features[code].length > 0);
    return { translated: translated.length, total: enabledLanguages.length };
  };

  if (isLoading || languagesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Subscription Plans</h2>
        <p className="text-muted-foreground">Manage subscription plan pricing, features, and translations</p>
      </div>

      <div className="grid gap-6">
        {plans?.map((plan) => {
          const status = getTranslationStatus(plan);
          
          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {plan.is_default && <Badge variant="secondary">Default</Badge>}
                      {plan.is_available_for_signup ? (
                        <Badge variant="success"><Check className="h-3 w-3 mr-1" />Available</Badge>
                      ) : (
                        <Badge variant="outline"><X className="h-3 w-3 mr-1" />Coming Soon</Badge>
                      )}
                      <Badge variant={status.translated === status.total ? "default" : "secondary"}>
                        <Languages className="h-3 w-3 mr-1" />
                        {status.translated}/{status.total}
                      </Badge>
                      {plan.slug !== 'free' && (
                        plan.stripe_price_id_monthly && plan.stripe_price_id_annual ? (
                          <Badge variant="success"><Check className="h-3 w-3 mr-1" />Stripe Synced</Badge>
                        ) : (
                          <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Not Synced</Badge>
                        )
                      )}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`available-${plan.id}`} className="text-sm">
                        Available for Signup
                      </Label>
                      <Switch
                        id={`available-${plan.id}`}
                        checked={plan.is_available_for_signup}
                        onCheckedChange={() => toggleAvailability(plan.id, plan.is_available_for_signup)}
                      />
                    </div>
                    {plan.slug !== 'free' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncToStripeMutation.mutate(plan.id)}
                              disabled={syncingPlanId === plan.id}
                            >
                              {syncingPlanId === plan.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Sync to Stripe
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Creates/updates Stripe prices from database values</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {editingPlan === plan.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(plan.id)}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                        Edit Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingPlan === plan.id ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Plan Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly-price">Monthly Price (€)</Label>
                        <Input
                          id="monthly-price"
                          type="number"
                          step="0.01"
                          value={formData.price_monthly_cents}
                          onChange={(e) => setFormData({ ...formData, price_monthly_cents: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="annual-price">Annual Price (€)</Label>
                        <Input
                          id="annual-price"
                          type="number"
                          step="0.01"
                          value={formData.price_annual_cents}
                          onChange={(e) => setFormData({ ...formData, price_annual_cents: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trial-days">Trial Days</Label>
                        <Input
                          id="trial-days"
                          type="number"
                          value={formData.trial_days}
                          onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grace-period">Grace Period (days)</Label>
                        <Input
                          id="grace-period"
                          type="number"
                          value={formData.grace_period_days}
                          onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signatures">Signatures per Year</Label>
                        <Input
                          id="signatures"
                          type="number"
                          value={formData.digital_signatures_per_year}
                          onChange={(e) => setFormData({ ...formData, digital_signatures_per_year: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="overage-price">Overage Price per Signature (€)</Label>
                        <Input
                          id="overage-price"
                          type="number"
                          step="0.01"
                          value={formData.overage_price_per_signature_cents}
                          onChange={(e) => setFormData({ ...formData, overage_price_per_signature_cents: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="property-limit">Property Limit</Label>
                        <Input
                          id="property-limit"
                          type="number"
                          value={formData.property_limit}
                          onChange={(e) => setFormData({ ...formData, property_limit: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gov-id-verifications">Government ID Verifications/Year</Label>
                        <Input
                          id="gov-id-verifications"
                          type="number"
                          value={formData.government_id_verifications_per_year}
                          onChange={(e) => setFormData({ ...formData, government_id_verifications_per_year: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gov-id-overage-price">Government ID Overage Price (€)</Label>
                        <Input
                          id="gov-id-overage-price"
                          type="number"
                          step="0.01"
                          value={formData.overage_price_per_government_id_cents}
                          onChange={(e) => setFormData({ ...formData, overage_price_per_government_id_cents: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    
                    {/* KYC Provider Toggles */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium mb-4">KYC Provider Access</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">KILT KYC</Label>
                            <p className="text-xs text-muted-foreground">Blockchain-based verification</p>
                          </div>
                          <Switch
                            checked={formData.kilt_kyc_enabled}
                            onCheckedChange={(checked) => setFormData({ ...formData, kilt_kyc_enabled: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Government ID KYC</Label>
                            <p className="text-xs text-muted-foreground">Document verification</p>
                          </div>
                          <Switch
                            checked={formData.government_id_kyc_enabled}
                            onCheckedChange={(checked) => setFormData({ ...formData, government_id_kyc_enabled: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Features Editor with Language Tabs */}
                    <FeatureEditor
                      features={formData.features_display}
                      limitations={formData.limitations_display}
                      enabledLanguages={enabledLanguages}
                      onChange={handleFeaturesChange}
                      planSlug={formData.slug}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Monthly Price</p>
                        <p className="font-semibold">€{(plan.price_monthly_cents / 100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Annual Price</p>
                        <p className="font-semibold">€{(plan.price_annual_cents / 100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Trial Days</p>
                        <p className="font-semibold">{plan.trial_days}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Grace Period</p>
                        <p className="font-semibold">{plan.grace_period_days} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Property Limit</p>
                        <p className="font-semibold">
                          {typeof plan.feature_limits === 'object' && plan.feature_limits && 'property_limit' in plan.feature_limits
                            ? (plan.feature_limits as any).property_limit
                            : 1}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Signatures/Year</p>
                        <p className="font-semibold">
                          {typeof plan.feature_limits === 'object' && plan.feature_limits && 'digital_signatures_per_year' in plan.feature_limits
                            ? (plan.feature_limits as any).digital_signatures_per_year
                            : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Signature Overage (€)</p>
                        <p className="font-semibold">€{(plan.overage_price_per_signature_cents / 100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gov ID Verifications/Year</p>
                        <p className="font-semibold">
                          {typeof plan.feature_limits === 'object' && plan.feature_limits && 'government_id_verifications_per_year' in plan.feature_limits
                            ? (plan.feature_limits as any).government_id_verifications_per_year
                            : 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gov ID Overage (€)</p>
                        <p className="font-semibold">€{((plan as any).overage_price_per_government_id_cents / 100 || 1).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">KYC Provider Access</p>
                      <div className="flex gap-4 text-sm">
                        <Badge variant={typeof plan.feature_limits === 'object' && (plan.feature_limits as any).kilt_kyc_enabled ? "default" : "secondary"}>
                          KILT KYC: {typeof plan.feature_limits === 'object' && (plan.feature_limits as any).kilt_kyc_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant={typeof plan.feature_limits === 'object' && (plan.feature_limits as any).government_id_kyc_enabled ? "default" : "secondary"}>
                          Gov ID KYC: {typeof plan.feature_limits === 'object' && (plan.feature_limits as any).government_id_kyc_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                    {plan.slug !== 'free' && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">Stripe Integration</p>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Product ID:</span>
                            {plan.stripe_product_id ? (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.stripe_product_id}</code>
                            ) : (
                              <span className="text-muted-foreground italic">Not created</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Monthly Price ID:</span>
                            {plan.stripe_price_id_monthly ? (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.stripe_price_id_monthly}</code>
                            ) : (
                              <span className="text-muted-foreground italic">Not created</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Annual Price ID:</span>
                            {plan.stripe_price_id_annual ? (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{plan.stripe_price_id_annual}</code>
                            ) : (
                              <span className="text-muted-foreground italic">Not created</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
