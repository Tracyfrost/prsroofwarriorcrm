// MOBILE-PORT: Maps to React Native FlatList + BottomSheet modal
import { useState } from "react";
import { Plus, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeadPackages, useCreateLeadPackage } from "@/hooks/useLeadArsenal";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Progress } from "@/components/ui/progress";

export function LeadPackagesTab() {
  const { data: packages, isLoading } = useLeadPackages();
  const { isOwnerOrAdmin } = usePermissions();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" /> Lead Packages
        </CardTitle>
        {isOwnerOrAdmin && (
          <Button size="sm" onClick={() => setOpen(true)} className="min-h-[44px] sm:min-h-0">
            <Plus className="h-4 w-4 mr-1" /> Forge Package
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Depletion</TableHead>
                <TableHead className="text-right">Cost/Lead</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(packages ?? []).map((p: any) => {
                const pct = p.package_size > 0 ? ((p.package_size - p.leads_remaining) / p.package_size) * 100 : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: p.lead_sources?.color, color: p.lead_sources?.color }}>
                        {p.lead_sources?.name ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.package_size}</TableCell>
                    <TableCell className="text-right font-medium">{p.leads_remaining}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">${Number(p.cost_per_lead).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(p.total_cost).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.purchase_date}</TableCell>
                  </TableRow>
                );
              })}
              {(packages ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No packages yet. Forge your first Arsenal package.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden space-y-2 p-3">
          {(packages ?? []).map((p: any) => {
            const pct = p.package_size > 0 ? ((p.package_size - p.leads_remaining) / p.package_size) * 100 : 0;
            return (
              <div key={p.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" style={{ borderColor: p.lead_sources?.color, color: p.lead_sources?.color }}>
                    {p.lead_sources?.name ?? "—"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{p.purchase_date}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Size:</span> {p.package_size}</div>
                  <div><span className="text-muted-foreground">Left:</span> <strong>{p.leads_remaining}</strong></div>
                  <div><span className="text-muted-foreground">Cost:</span> ${Number(p.total_cost).toFixed(0)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CreatePackageModal open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function CreatePackageModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const create = useCreateLeadPackage();
  const { data: sources } = useQuery({
    queryKey: ["lead_sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_sources").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [sourceId, setSourceId] = useState("");
  const [size, setSize] = useState("10");
  const [cpl, setCpl] = useState("");
  const [notes, setNotes] = useState("");

  const totalCost = Number(size) * Number(cpl || 0);

  const handleSave = () => {
    if (!sourceId || !size) return;
    create.mutate(
      {
        lead_source_id: sourceId,
        package_size: Number(size),
        cost_per_lead: Number(cpl || 0),
        total_cost: totalCost,
        notes,
        created_by: user?.id,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSourceId("");
          setSize("10");
          setCpl("");
          setNotes("");
        },
      }
    );
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Forge New Package" description="Add a purchased lead block to the Arsenal.">
      <div className="space-y-4">
        <div>
          <Label>Lead Source</Label>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {(sources ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Package Size</Label>
            <Input type="number" value={size} onChange={(e) => setSize(e.target.value)} min={1} className="min-h-[44px]" />
          </div>
          <div>
            <Label>Cost per Lead ($)</Label>
            <Input type="number" value={cpl} onChange={(e) => setCpl(e.target.value)} min={0} step="0.01" className="min-h-[44px]" />
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">Total Cost:</span>{" "}
          <strong>${totalCost.toFixed(2)}</strong>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <Button onClick={handleSave} disabled={create.isPending || !sourceId} className="w-full min-h-[48px]">
          {create.isPending ? "Forging…" : "Forge Package"}
        </Button>
      </div>
    </ResponsiveModal>
  );
}
