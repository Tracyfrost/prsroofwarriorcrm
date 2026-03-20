import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ProductionItem } from "@/hooks/useProduction";
import type { ProfileWithHierarchy } from "@/hooks/useHierarchy";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";

export function ProductionList({
  items,
  profiles,
  onStatusChange,
  onRowClick,
  onBulkStatusChange,
  onBulkAssign,
  onBulkSchedule,
  navigate,
}: {
  items: ProductionItem[];
  profiles: ProfileWithHierarchy[];
  onStatusChange: (item: ProductionItem, status: string) => void;
  onRowClick: (item: ProductionItem) => void;
  onBulkStatusChange: (ids: string[], status: string) => void;
  onBulkAssign: (ids: string[], userId: string) => void;
  onBulkSchedule: (ids: string[], start: string, end: string) => void;
  navigate: (path: string) => void;
}) {
  const { data: statuses = [] } = useProductionItemStatuses(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkStart, setBulkStart] = useState("");
  const [bulkEnd, setBulkEnd] = useState("");

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectedIds = Array.from(selected);
  const hasSelection = selectedIds.length > 0;

  const applyBulkStatus = () => {
    if (bulkStatus && hasSelection) {
      onBulkStatusChange(selectedIds, bulkStatus);
      setSelected(new Set());
      setBulkStatus("");
    }
  };

  const applyBulkAssign = () => {
    if (bulkAssignee && hasSelection) {
      onBulkAssign(selectedIds, bulkAssignee);
      setSelected(new Set());
      setBulkAssignee("");
    }
  };

  const applyBulkSchedule = () => {
    if (bulkStart && hasSelection) {
      onBulkSchedule(selectedIds, bulkStart, bulkEnd);
      setSelected(new Set());
      setBulkStart("");
      setBulkEnd("");
    }
  };

  const getStatusLabel = (name: string) => {
    return statuses.find((s) => s.name === name)?.display_name || name;
  };

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {hasSelection && (
        <Card className="shadow-card border-accent/30 bg-accent/5">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyBulkStatus} disabled={!bulkStatus}>
                Apply
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={applyBulkAssign} disabled={!bulkAssignee}>
                Assign
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  📅 Schedule
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} className="h-8 text-xs" />
                </div>
                <Button size="sm" className="w-full text-xs" onClick={applyBulkSchedule} disabled={!bulkStart}>
                  Apply Dates
                </Button>
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={items.length > 0 && selected.size === items.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Labor</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No production items
                  </TableCell>
                </TableRow>
              ) : (
                items.map((i) => (
                  <TableRow
                    key={i.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selected.has(i.id) ? "bg-accent/5" : ""}`}
                    onClick={() => onRowClick(i)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(i.id)} onCheckedChange={() => toggle(i.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{i.jobs?.job_id || "—"}</TableCell>
                    <TableCell className="text-sm">{i.jobs?.customers?.name || "—"}</TableCell>
                    <TableCell className="font-medium text-sm">{i.trade_types?.name || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{i.quantity} {i.unit_type}</TableCell>
                    <TableCell className="text-sm font-mono">${i.labor_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-mono">${i.material_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold font-mono">
                      ${(i.labor_cost + i.material_cost).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={i.status}
                        onValueChange={(v) => { onStatusChange(i, v); }}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={s.name}>{s.display_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {i.scheduled_start_date || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
