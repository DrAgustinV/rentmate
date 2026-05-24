import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRepairShops } from "@/hooks/useRepairShops";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddRepairShopButton } from "@/components/CreateRepairShopDialog";
import { EditRepairShopDialog } from "@/components/EditRepairShopDialog";
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
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, MapPin, Wrench, LayoutGrid, List, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

export function RepairShopsSection() {
  const navigate = useNavigate();
  const { repairShops, isLoading, deleteRepairShop, isDeleting } = useRepairShops();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [userViewMode, setUserViewMode] = useState<"grid" | "list" | null>(null);
  const [editingShop, setEditingShop] = useState<Database["public"]["Tables"]["repair_shops"]["Row"] | null>(null);
  const [deletingShop, setDeletingShop] = useState<Database["public"]["Tables"]["repair_shops"]["Row"] | null>(null);

  // Use user's choice if set, otherwise use responsive default
  const viewMode = userViewMode ?? (isMobile ? "grid" : "list");

  const filteredShops = repairShops.filter((shop) => {
    const matchesSearch =
      shop.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.phone.includes(searchQuery) ||
      shop.specializations?.some((spec) =>
        spec.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesStatus = showInactive || shop.is_active;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t("repairShops.title")}</h2>
          <p className="text-muted-foreground">{t("repairShops.description")}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => navigate("/repair-shops/import")}>
            Bulk import
          </Button>
          <AddRepairShopButton />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("repairShops.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant={showInactive ? "default" : "outline"}
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? t("repairShops.showActiveOnly") : t("repairShops.showAll")}
          </Button>
          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setUserViewMode("grid")}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setUserViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredShops.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            repairShops.length === 0
              ? t("repairShops.noContacts")
              : t("repairShops.noResults")
          }
          description={
            repairShops.length === 0
              ? t("repairShops.noContactsDesc")
              : t("repairShops.noResultsDesc")
          }
        />
      ) : (
        <>
          {viewMode === "grid" ? (
            // Grid/Card View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShops.map((shop) => (
                <Card key={shop.id} className={`card-shine ${!shop.is_active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{shop.company_name}</h3>
                        {shop.contact_person && (
                          <p className="text-sm text-muted-foreground">
                            {shop.contact_person}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!shop.is_active && (
                          <Badge variant="secondary">{t("repairShops.inactive")}</Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setEditingShop(shop)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingShop(shop)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${shop.phone}`} className="hover:underline">
                          {shop.phone}
                        </a>
                      </div>
                      {shop.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${shop.email}`} className="hover:underline">
                            {shop.email}
                          </a>
                        </div>
                      )}
                      {shop.city && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{shop.city}</span>
                        </div>
                      )}
                    </div>

                    {shop.specializations && shop.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {shop.specializations.map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // List/Table View
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("repairShops.companyName")}</TableHead>
                    <TableHead>{t("repairShops.contactPerson")}</TableHead>
                    <TableHead>{t("repairShops.phone")}</TableHead>
                    <TableHead>{t("repairShops.specializations")}</TableHead>
                    <TableHead>{t("repairShops.status")}</TableHead>
                    <TableHead className="text-right">{t("common.edit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops.map((shop) => (
                    <TableRow
                      key={shop.id}
                      className={!shop.is_active ? "opacity-60" : ""}
                    >
                      <TableCell className="font-medium">{shop.company_name}</TableCell>
                      <TableCell>{shop.contact_person || "-"}</TableCell>
                      <TableCell>
                        <a href={`tel:${shop.phone}`} className="hover:underline">
                          {shop.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        {shop.specializations && shop.specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {shop.specializations.slice(0, 2).map((spec) => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {shop.specializations.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{shop.specializations.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {shop.is_active ? (
                          <Badge variant="default">{t("repairShops.active")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("repairShops.inactive")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingShop(shop)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingShop(shop)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {editingShop && (
        <EditRepairShopDialog
          open={true}
          onOpenChange={(open) => { if (!open) setEditingShop(null); }}
          repairShop={editingShop}
        />
      )}

      {deletingShop && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setDeletingShop(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('repairShops.deleteConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('repairShops.deleteConfirmDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteRepairShop(deletingShop.id, {
                    onSuccess: () => setDeletingShop(null),
                  });
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t('common.loading') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
