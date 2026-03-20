// MOBILE-PORT: Maps to React Native FlatList with card items
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeadPackages, useLeadAssignments } from "@/hooks/useLeadArsenal";
import { useBulkUpdateLeadSourceOrder } from "@/hooks/useCustomizations";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

export function LeadSourcesGrid() {
  const { isOwnerOrAdmin } = usePermissions();
  const bulkUpdate = useBulkUpdateLeadSourceOrder();
  const qc = useQueryClient();

  const { data: sources } = useQuery({
    queryKey: ["lead_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useLeadPackages();
  const { data: assignments } = useLeadAssignments();

  const [orderedSources, setOrderedSources] = useState<any[] | null>(null);
  const displaySources = orderedSources ?? sources ?? [];

  const sourceStats = displaySources.map((src: any) => {
    const srcPackages = (packages ?? []).filter((p: any) => p.lead_source_id === src.id);
    const srcAssignments = (assignments ?? []).filter((a: any) => a.lead_source_id === src.id);
    const remaining = srcPackages.reduce((s: number, p: any) => s + (p.leads_remaining ?? 0), 0);
    const totalPurchased = srcPackages.reduce((s: number, p: any) => s + (p.package_size ?? 0), 0);
    const assigned = srcAssignments.length;
    const converted = srcAssignments.filter((a: any) => a.status === "converted").length;
    const totalCost = srcPackages.reduce((s: number, p: any) => s + Number(p.total_cost ?? 0), 0);
    const roi = totalCost > 0 ? ((converted / Math.max(totalPurchased, 1)) * 100) : 0;
    return { ...src, remaining, totalPurchased, assigned, converted, roi };
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !sources) return;
    const items = Array.from(sources);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderedSources(items);
    const updates = items.map((s: any, i: number) => ({ id: s.id, sort_order: i }));
    bulkUpdate.mutate(updates, {
      onSuccess: () => {
        setOrderedSources(null);
        qc.invalidateQueries({ queryKey: ["lead_sources"] });
      },
    });
  }, [sources, bulkUpdate, qc]);

  const rows = sourceStats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead Sources – Arsenal Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="lead-sources-table">
              {(provided) => (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isOwnerOrAdmin && <TableHead className="w-8" />}
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Purchased</TableHead>
                      <TableHead className="text-right">Assigned</TableHead>
                      <TableHead className="text-right">Converted</TableHead>
                      <TableHead className="text-right">ROI %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                    {rows.map((s: any, idx: number) => (
                      <Draggable key={s.id} draggableId={s.id} index={idx} isDragDisabled={!isOwnerOrAdmin}>
                        {(prov, snap) => (
                          <TableRow
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={snap.isDragging ? "bg-muted/60" : ""}
                          >
                            {isOwnerOrAdmin && (
                              <TableCell className="w-8 px-1" {...prov.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge variant="outline" style={{ borderColor: s.color, color: s.color }} className="font-medium">
                                {s.display_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{s.remaining}</TableCell>
                            <TableCell className="text-right">{s.totalPurchased}</TableCell>
                            <TableCell className="text-right">{s.assigned}</TableCell>
                            <TableCell className="text-right">{s.converted}</TableCell>
                            <TableCell className="text-right">{s.roi.toFixed(1)}%</TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isOwnerOrAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                          No active lead sources. Configure sources in Settings.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-2 p-3">
          {rows.map((s: any) => (
            <div key={s.id} className="rounded-lg border border-border/60 p-3 space-y-2">
              <Badge variant="outline" style={{ borderColor: s.color, color: s.color }}>
                {s.display_name}
              </Badge>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Remaining:</span> <strong>{s.remaining}</strong></div>
                <div><span className="text-muted-foreground">Purchased:</span> {s.totalPurchased}</div>
                <div><span className="text-muted-foreground">Converted:</span> {s.converted}</div>
                <div><span className="text-muted-foreground">ROI:</span> {s.roi.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
