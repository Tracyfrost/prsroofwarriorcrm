import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useAllProfiles,
  LEVEL_CONFIG,
  type ProfileWithHierarchy,
} from "@/hooks/useHierarchy";
import {
  useAllTradeTypes,
  useCreateTradeType,
  useUpdateTradeType,
  useDeleteTradeType,
  useBulkUpdateTradeTypeOrder,
  type TradeType,
} from "@/hooks/useProduction";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Network, Hammer, Plus, ShieldCheck, ShieldX, Pencil, Trash2, Sliders, Settings2, Calendar, CreditCard, Shield, Swords, Receipt, FileSpreadsheet, GripVertical } from "lucide-react";
import { UserAdminTable } from "@/components/UserAdminTable";
import { CustomizationsTab } from "@/components/settings/CustomizationsTab";
import { GlobalSettingsTab } from "@/components/settings/GlobalSettingsTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { BrandingTab } from "@/components/settings/BrandingTab";
import { AlliesTab } from "@/components/settings/AlliesTab";
import { ExpenseTypesTab } from "@/components/settings/ExpenseTypesTab";
import { DataForgeTab } from "@/components/settings/DataForgeTab";
import {
  ContextualTabsPortal,
  contextualTabListClassName,
  contextualTabListSidebarClassName,
  contextualTabTriggerClassName,
  contextualTabTriggerSidebarClassName,
} from "@/components/layout/contextualTabNav";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: myRoles = [] } = useUserRoles();
  const { can, isOwnerOrAdmin } = usePermissions();
  const isAdmin = isOwnerOrAdmin;
  const { data: users = [], isLoading } = useAllProfiles();
  const { data: tradeTypes = [] } = useAllTradeTypes();
  const createTradeType = useCreateTradeType();
  const deleteTradeType = useDeleteTradeType();
  const updateTradeType = useUpdateTradeType();
  const bulkUpdateTradeOrder = useBulkUpdateTradeTypeOrder();

  // Trade type form
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [tradeName, setTradeName] = useState("");
  const [tradeUnit, setTradeUnit] = useState("EA");
  const [tradeLabor, setTradeLabor] = useState("0");
  const [tradeMaterial, setTradeMaterial] = useState("0");
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editTradeName, setEditTradeName] = useState("");
  const [editTradeUnit, setEditTradeUnit] = useState("");
  const [editTradeLabor, setEditTradeLabor] = useState("");
  const [editTradeMaterial, setEditTradeMaterial] = useState("");
  const [orderedTradeTypes, setOrderedTradeTypes] = useState<TradeType[] | null>(null);
  const displayTradeTypes = orderedTradeTypes ?? tradeTypes;

  const handleTradeTypesDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || tradeTypes.length === 0) return;
      const items = Array.from(tradeTypes);
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      setOrderedTradeTypes(items);
      const updates = items.map((t, i) => ({ id: t.id, sort_order: i }));
      bulkUpdateTradeOrder.mutate(updates, {
        onSuccess: () => setOrderedTradeTypes(null),
        onError: (e) => {
          setOrderedTradeTypes(null);
          toast({
            title: "Error",
            description: e instanceof Error ? e.message : String(e),
            variant: "destructive",
          });
        },
      });
    },
    [tradeTypes, bulkUpdateTradeOrder, toast],
  );

  const handleAddTrade = async () => {
    if (!tradeName) return;
    try {
      await createTradeType.mutateAsync({
        name: tradeName,
        unit_type: tradeUnit,
        default_labor_cost_per_unit: parseFloat(tradeLabor) || 0,
        default_material_cost_per_unit: parseFloat(tradeMaterial) || 0,
        sort_order: tradeTypes.length + 1,
      });
      toast({ title: "Trade type added" });
      setShowAddTrade(false);
      setTradeName("");
      setTradeUnit("EA");
      setTradeLabor("0");
      setTradeMaterial("0");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const buildOrgTree = () => {
    const roots = users.filter((u) => !u.manager_id);
    const getChildren = (parentId: string): ProfileWithHierarchy[] =>
      users.filter((u) => u.manager_id === parentId);

    const renderNode = (u: ProfileWithHierarchy, depth: number): React.ReactNode => {
      const children = getChildren(u.id);
      const config = LEVEL_CONFIG[u.level] || LEVEL_CONFIG.lvl1;
      return (
        <div key={u.id} style={{ marginLeft: depth * 24 }} className="py-1.5">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-card hover:bg-muted/50 transition-colors">
            <span className="text-base">{config.badge}</span>
            <span className="text-sm font-medium text-foreground">{u.name || u.email}</span>
            <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
            {u.verified ? (
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
            ) : (
              <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {u.commission_rate > 0 && (
              <span className="text-[10px] text-muted-foreground">{(u.commission_rate * 100).toFixed(0)}%</span>
            )}
            {u.override_rate > 0 && (
              <span className="text-[10px] text-accent">+{(u.override_rate * 100).toFixed(0)}% ovr</span>
            )}
          </div>
          {children.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    };

    return roots.map((r) => renderNode(r, 0));
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage team hierarchy, roles, production trades</p>
        </div>

        {!isAdmin ? (
          <Card className="shadow-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Contact your administrator to manage team settings.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="users" className="min-w-0 w-full">
            <ContextualTabsPortal>
              <TabsList className={contextualTabListSidebarClassName()}>
                <TabsTrigger value="users" className={contextualTabTriggerSidebarClassName("text-xs sm:text-sm")}>
                  Users & Hierarchy
                </TabsTrigger>
                <TabsTrigger value="production" className={contextualTabTriggerSidebarClassName("text-xs sm:text-sm")}>
                  Production Trades
                </TabsTrigger>
                <TabsTrigger
                  value="customizations"
                  className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
                >
                  <Sliders className="h-3.5 w-3.5 shrink-0" />
                  Customizations
                </TabsTrigger>
                <TabsTrigger
                  value="integrations"
                  className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="globals" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                  <Settings2 className="h-3.5 w-3.5 shrink-0" />
                  Global
                </TabsTrigger>
                <TabsTrigger value="billing" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="branding" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="allies" className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                  <Swords className="h-3.5 w-3.5 shrink-0" />
                  Allies
                </TabsTrigger>
                <TabsTrigger
                  value="expense_types"
                  className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
                >
                  <Receipt className="h-3.5 w-3.5 shrink-0" />
                  Expenses
                </TabsTrigger>
                <TabsTrigger
                  value="data_forge"
                  className={contextualTabTriggerSidebarClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  Data Forge
                </TabsTrigger>
              </TabsList>
            </ContextualTabsPortal>
            <TabsList className={contextualTabListClassName("md:hidden")}>
              <TabsTrigger value="users" className={contextualTabTriggerClassName("text-xs sm:text-sm")}>
                Users & Hierarchy
              </TabsTrigger>
              <TabsTrigger value="production" className={contextualTabTriggerClassName("text-xs sm:text-sm")}>
                Production Trades
              </TabsTrigger>
              <TabsTrigger value="customizations" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Sliders className="h-3.5 w-3.5 shrink-0" />
                Customizations
              </TabsTrigger>
              <TabsTrigger value="integrations" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="globals" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                Global
              </TabsTrigger>
              <TabsTrigger value="billing" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="branding" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="allies" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Swords className="h-3.5 w-3.5 shrink-0" />
                Allies
              </TabsTrigger>
              <TabsTrigger value="expense_types" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <Receipt className="h-3.5 w-3.5 shrink-0" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="data_forge" className={contextualTabTriggerClassName("inline-flex items-center gap-1.5 text-xs sm:text-sm")}>
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                Data Forge
              </TabsTrigger>
            </TabsList>

            <div className="min-w-0 flex-1 mt-4 md:mt-6">
            <TabsContent value="users" className="mt-0 space-y-6">
              {/* Org Chart */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4" /> Organization Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No team members yet</p>
                  ) : (
                    <div className="space-y-0.5">{buildOrgTree()}</div>
                  )}
                </CardContent>
              </Card>

              {/* Team Members Table (extracted component) */}
              <UserAdminTable users={users} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="production" className="mt-0 space-y-6">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hammer className="h-4 w-4" /> Trade Types
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowAddTrade(true)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Trade
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <DragDropContext onDragEnd={handleTradeTypesDragEnd}>
                    <Droppable droppableId="trade-types-table">
                      {(dropProvided) => (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8" />
                              <TableHead>Name</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Default Labor/Unit</TableHead>
                              <TableHead>Default Material/Unit</TableHead>
                              <TableHead>Active</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                            {displayTradeTypes.map((tt, idx) => (
                              <Draggable
                                key={tt.id}
                                draggableId={tt.id}
                                index={idx}
                                isDragDisabled={editingTradeId === tt.id}
                              >
                                {(dragProvided, snap) => (
                                  <TableRow
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className={snap.isDragging ? "bg-muted/60" : undefined}
                                  >
                                    {editingTradeId === tt.id ? (
                                      <TableCell className="w-8 px-1" />
                                    ) : (
                                      <TableCell
                                        className="w-8 px-1 cursor-grab active:cursor-grabbing touch-none"
                                        {...dragProvided.dragHandleProps}
                                      >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      </TableCell>
                                    )}
                                    {editingTradeId === tt.id ? (
                                      <>
                                        <TableCell><Input value={editTradeName} onChange={(e) => setEditTradeName(e.target.value)} className="h-8" /></TableCell>
                                        <TableCell>
                                          <Select value={editTradeUnit} onValueChange={setEditTradeUnit}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>{["Squares","LF","EA","SF","Job"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                          </Select>
                                        </TableCell>
                                        <TableCell><Input type="number" value={editTradeLabor} onChange={(e) => setEditTradeLabor(e.target.value)} className="h-8 w-20 font-mono" /></TableCell>
                                        <TableCell><Input type="number" value={editTradeMaterial} onChange={(e) => setEditTradeMaterial(e.target.value)} className="h-8 w-20 font-mono" /></TableCell>
                                        <TableCell>
                                          <Switch checked={tt.active} onCheckedChange={(checked) => updateTradeType.mutate({ id: tt.id, active: checked })} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => {
                                              try {
                                                await updateTradeType.mutateAsync({
                                                  id: tt.id,
                                                  name: editTradeName,
                                                  unit_type: editTradeUnit,
                                                  default_labor_cost_per_unit: parseFloat(editTradeLabor) || 0,
                                                  default_material_cost_per_unit: parseFloat(editTradeMaterial) || 0,
                                                });
                                                setEditingTradeId(null);
                                                toast({ title: "Trade type updated" });
                                              } catch (e: any) {
                                                toast({ title: "Error", description: e.message, variant: "destructive" });
                                              }
                                            }}>Save</Button>
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingTradeId(null)}>Cancel</Button>
                                          </div>
                                        </TableCell>
                                      </>
                                    ) : (
                                      <>
                                        <TableCell className="font-medium">{tt.name}</TableCell>
                                        <TableCell className="text-sm">{tt.unit_type}</TableCell>
                                        <TableCell className="text-sm font-mono">${tt.default_labor_cost_per_unit}</TableCell>
                                        <TableCell className="text-sm font-mono">${tt.default_material_cost_per_unit}</TableCell>
                                        <TableCell>
                                          <Switch checked={tt.active} onCheckedChange={(checked) => updateTradeType.mutate({ id: tt.id, active: checked })} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                              setEditingTradeId(tt.id);
                                              setEditTradeName(tt.name);
                                              setEditTradeUnit(tt.unit_type);
                                              setEditTradeLabor(String(tt.default_labor_cost_per_unit));
                                              setEditTradeMaterial(String(tt.default_material_cost_per_unit));
                                            }}>
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete "{tt.name}"?</AlertDialogTitle>
                                                  <AlertDialogDescription>This will remove this trade type. Jobs already using it won't be affected.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                                    try {
                                                      await deleteTradeType.mutateAsync(tt.id);
                                                      toast({ title: "Trade type deleted" });
                                                    } catch (e: any) {
                                                      toast({ title: "Error", description: e.message, variant: "destructive" });
                                                    }
                                                  }}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </TableCell>
                                      </>
                                    )}
                                  </TableRow>
                                )}
                              </Draggable>
                            ))}
                            {dropProvided.placeholder}
                          </TableBody>
                        </Table>
                      )}
                    </Droppable>
                  </DragDropContext>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customizations" className="mt-0">
              <CustomizationsTab />
            </TabsContent>

            <TabsContent value="integrations" className="mt-0">
              <IntegrationsTab />
            </TabsContent>

            <TabsContent value="globals" className="mt-0">
              <GlobalSettingsTab />
            </TabsContent>

            <TabsContent value="billing" className="mt-0">
              <BillingTab />
            </TabsContent>

            <TabsContent value="branding" className="mt-0">
              <BrandingTab />
            </TabsContent>

            <TabsContent value="allies" className="mt-0">
              <AlliesTab />
            </TabsContent>

            <TabsContent value="expense_types" className="mt-0">
              <ExpenseTypesTab />
            </TabsContent>

            <TabsContent value="data_forge" className="mt-0">
              <DataForgeTab />
            </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Add Trade Type Dialog */}
        <Dialog open={showAddTrade} onOpenChange={setShowAddTrade}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Trade Type</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="e.g. Roof, Gutters" />
              </div>
              <div className="space-y-2">
                <Label>Unit Type</Label>
                <Select value={tradeUnit} onValueChange={setTradeUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Squares", "LF", "EA", "SF", "Job"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Default Labor/Unit ($)</Label>
                  <Input type="number" value={tradeLabor} onChange={(e) => setTradeLabor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Default Material/Unit ($)</Label>
                  <Input type="number" value={tradeMaterial} onChange={(e) => setTradeMaterial(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleAddTrade} className="w-full" disabled={createTradeType.isPending || !tradeName}>
                {createTradeType.isPending ? "Adding..." : "Add Trade Type"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
