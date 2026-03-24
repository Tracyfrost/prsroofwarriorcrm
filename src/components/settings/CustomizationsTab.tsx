import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Palette, Tag, Milestone, CircleDot, GitBranch, AlertCircle } from "lucide-react";
import {
  useLeadSources, useCreateLeadSource, useUpdateLeadSource, useDeleteLeadSource,
  useJobStatuses, useCreateJobStatus, useUpdateJobStatus, useDeleteJobStatus,
  useBulkUpdateJobStatusOrder,
  useProductionMilestones, useCreateProductionMilestone, useUpdateProductionMilestone,
  useDeleteProductionMilestone, useBulkUpdateMilestoneOrder,
  useProductionItemStatuses, useCreateProductionItemStatus, useUpdateProductionItemStatus,
  useDeleteProductionItemStatus, useBulkUpdateProductionItemStatusOrder,
  type LeadSource, type JobStatus, type ProductionMilestone, type ProductionItemStatus,
} from "@/hooks/useCustomizations";
import { useStatusBranches, useUpdateStatusBranch } from "@/hooks/useStatusBranches";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// ── Lead Sources Section ──

const leadSourceSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(50, "Name must be 50 characters or less"),
  display_name: z.string().trim().min(1, "Display name cannot be empty").max(100, "Display name must be 100 characters or less"),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format"),
});

function LeadSourcesSection() {
  const { toast } = useToast();
  const { data: sources = [] } = useLeadSources();
  const createSource = useCreateLeadSource();
  const updateSource = useUpdateLeadSource();
  const deleteSource = useDeleteLeadSource();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");
  const [newError, setNewError] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDisplay, setEditDisplay] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeadSource | null>(null);

  const { data: deleteUsageCount } = useQuery({
    queryKey: ["lead-source-usage", deleteTarget?.name],
    enabled: !!deleteTarget,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("lead_source", deleteTarget!.name as any);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const handleAdd = async () => {
    setNewError("");
    const normalizedName = newName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    
    try {
      // Validate with Zod
      leadSourceSchema.parse({
        name: normalizedName,
        display_name: newDisplay.trim(),
        color: newColor,
      });

      // Check for existing source with same name
      const existing = sources.find(s => s.name.toLowerCase() === normalizedName.toLowerCase());
      if (existing) {
        setNewError("A source with this name already exists.");
        toast({ title: "Forge Failed", description: "Duplicate Origin—Reforge!", variant: "destructive" });
        return;
      }

      console.log("Attempting Forge:", { name: normalizedName, display_name: newDisplay.trim(), color: newColor });
      
      await createSource.mutateAsync({
        name: normalizedName,
        display_name: newDisplay.trim(),
        color: newColor,
        sort_order: sources.length + 1,
      });
      
      toast({ title: "⚔ Origin Forged!", description: "Source Secured—Roster Updated!" });
      setShowAdd(false);
      setNewName("");
      setNewDisplay("");
      setNewColor("#6B7280");
      setNewError("");
    } catch (e: any) {
      console.error("Forge Error:", e);
      let errorMsg = e.message;
      
      // Handle specific database constraint errors
      if (e.message?.includes("duplicate key") || e.code === "23505") {
        errorMsg = "Duplicate Origin—Reforge with a different name!";
      } else if (e.message?.includes("check constraint") || e.code === "23514") {
        errorMsg = "Name must be 50 characters or less.";
      }
      
      setNewError(errorMsg);
      toast({ title: "Forge Failed", description: errorMsg, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateSource.mutateAsync({ id, name: editName, display_name: editDisplay, color: editColor });
      setEditId(null);
      toast({ title: "Lead source updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSource.mutateAsync(deleteTarget.id);
      toast({ title: "Lead source deleted" });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" /> Lead Sources
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add Source
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => (
              <TableRow key={s.id}>
                {editId === s.id ? (
                  <>
                    <TableCell>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 font-mono text-xs" />
                    </TableCell>
                    <TableCell>
                      <Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} className="h-8" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-8 w-12 rounded cursor-pointer" />
                        <Badge style={{ backgroundColor: editColor, color: '#fff' }} className="text-xs">{editColor}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={s.active} onCheckedChange={(checked) => updateSource.mutate({ id: s.id, active: checked })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(s.id)}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-mono text-xs">{s.name}</TableCell>
                    <TableCell className="font-medium">{s.display_name}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: s.color, color: '#fff' }} className="text-xs">{s.color}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={s.active} onCheckedChange={(checked) => updateSource.mutate({ id: s.id, active: checked })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setEditId(s.id);
                          setEditName(s.name);
                          setEditDisplay(s.display_name);
                          setEditColor(s.color);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Forge Lead Origin</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {newError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{newError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input value={newDisplay} onChange={(e) => {
                setNewDisplay(e.target.value);
                setNewName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
              }} placeholder="e.g. Door Knock" />
            </div>
            <div className="space-y-2">
              <Label>Key (auto-generated)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Color (Rune Etched)</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-10 w-20 rounded cursor-pointer" />
                <Badge style={{ backgroundColor: newColor, color: '#fff' }} className="text-xs">{newColor}</Badge>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createSource.isPending || !newName || !newDisplay}>
              {createSource.isPending ? "Adding..." : "⚔ Forge Origin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsageCount && deleteUsageCount > 0
                ? `Warning: ${deleteUsageCount} customer${deleteUsageCount !== 1 ? "s" : ""} currently use this lead source. They will retain the value but it won't appear in dropdowns.`
                : "No customers are currently using this lead source."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Job Statuses Section ──

function JobStatusesSection() {
  const { toast } = useToast();
  const { data: statuses = [] } = useJobStatuses();
  const createStatus = useCreateJobStatus();
  const updateStatus = useUpdateJobStatus();
  const deleteStatus = useDeleteJobStatus();
  const bulkUpdateOrder = useBulkUpdateJobStatusOrder();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDisplay, setEditDisplay] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<JobStatus | null>(null);

  const { data: deleteUsageCount } = useQuery({
    queryKey: ["job-status-usage", deleteTarget?.name],
    enabled: !!deleteTarget,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", deleteTarget!.name as any);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(statuses);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((s, i) => ({ id: s.id, sequence: i + 1 }));
    bulkUpdateOrder.mutate(updates);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newDisplay.trim()) return;
    try {
      await createStatus.mutateAsync({
        name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
        display_name: newDisplay.trim(),
        sequence: statuses.length + 1,
        color: newColor,
      });
      toast({ title: "Job status added" });
      setShowAdd(false);
      setNewName("");
      setNewDisplay("");
      setNewColor("#6b7280");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, name: editName, display_name: editDisplay, color: editColor });
      setEditId(null);
      toast({ title: "Job status updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStatus.mutateAsync(deleteTarget.id);
      toast({ title: "Job status deleted" });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" /> Job Status Flow
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add Status
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          {statuses.filter(s => s.active).map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs" style={{ borderColor: s.color, color: s.color }}>
                {s.display_name}
              </Badge>
              {i < statuses.filter(s => s.active).length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </span>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="statuses">
            {(provided) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Seq</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {statuses.map((s, index) => (
                    <Draggable key={s.id} draggableId={s.id} index={index}>
                      {(dragProvided) => (
                        <TableRow ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                          <TableCell>
                            <span {...dragProvided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </span>
                          </TableCell>
                          {editId === s.id ? (
                            <>
                              <TableCell className="text-xs text-muted-foreground">{s.sequence}</TableCell>
                              <TableCell><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 font-mono text-xs" /></TableCell>
                              <TableCell><Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} className="h-8" /></TableCell>
                              <TableCell><Input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-8 w-14 p-1" /></TableCell>
                              <TableCell><Switch checked={s.active} onCheckedChange={(checked) => updateStatus.mutate({ id: s.id, active: checked })} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(s.id)}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-muted-foreground">{s.sequence}</TableCell>
                              <TableCell className="font-mono text-xs">{s.name}</TableCell>
                              <TableCell className="font-medium">{s.display_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: s.color }} />
                                  <span className="text-xs text-muted-foreground">{s.color}</span>
                                </div>
                              </TableCell>
                              <TableCell><Switch checked={s.active} onCheckedChange={(checked) => updateStatus.mutate({ id: s.id, active: checked })} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                    setEditId(s.id); setEditName(s.name); setEditDisplay(s.display_name); setEditColor(s.color);
                                  }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(s)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Job Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input value={newDisplay} onChange={(e) => {
                setNewDisplay(e.target.value);
                setNewName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
              }} placeholder="e.g. Under Review" />
            </div>
            <div className="space-y-2">
              <Label>Key (auto-generated)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-10 w-14 p-1" />
                <span className="text-sm text-muted-foreground">{newColor}</span>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createStatus.isPending || !newName || !newDisplay}>
              {createStatus.isPending ? "Adding..." : "Add Job Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsageCount && deleteUsageCount > 0
                ? `Warning: ${deleteUsageCount} job${deleteUsageCount !== 1 ? "s" : ""} currently use this status. They will retain the value but it won't appear in dropdowns.`
                : "No jobs are currently using this status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Production Milestones Section ──

function ProductionMilestonesSection() {
  const { toast } = useToast();
  const { data: milestones = [] } = useProductionMilestones();
  const createMilestone = useCreateProductionMilestone();
  const updateMilestone = useUpdateProductionMilestone();
  const deleteMilestone = useDeleteProductionMilestone();
  const bulkUpdateOrder = useBulkUpdateMilestoneOrder();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDisplay, setEditDisplay] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductionMilestone | null>(null);

  // Count jobs using this milestone key
  const { data: deleteUsageCount } = useQuery({
    queryKey: ["milestone-usage", deleteTarget?.name],
    enabled: !!deleteTarget,
    queryFn: async () => {
      // Check how many jobs have this key in production_milestones jsonb
      const { data, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      // We can't easily filter by jsonb key existence in supabase-js, return total as approximation
      return data ?? 0;
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(milestones);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((m, i) => ({ id: m.id, sequence: i + 1 }));
    bulkUpdateOrder.mutate(updates);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newDisplay.trim()) return;
    try {
      await createMilestone.mutateAsync({
        name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
        display_name: newDisplay.trim(),
        sequence: milestones.length + 1,
      });
      toast({ title: "Milestone added" });
      setShowAdd(false);
      setNewName("");
      setNewDisplay("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateMilestone.mutateAsync({ id, name: editName, display_name: editDisplay });
      setEditId(null);
      toast({ title: "Milestone updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMilestone.mutateAsync(deleteTarget.id);
      toast({ title: "Milestone deleted" });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Milestone className="h-4 w-4" /> Production Milestone Flow
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add Milestone
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Flow preview */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          {milestones.filter(m => m.active).map((m, i) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                {m.display_name}
              </Badge>
              {i < milestones.filter(m => m.active).length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </span>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="milestones">
            {(provided) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Seq</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {milestones.map((m, index) => (
                    <Draggable key={m.id} draggableId={m.id} index={index}>
                      {(dragProvided) => (
                        <TableRow ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                          <TableCell>
                            <span {...dragProvided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </span>
                          </TableCell>
                          {editId === m.id ? (
                            <>
                              <TableCell className="text-xs text-muted-foreground">{m.sequence}</TableCell>
                              <TableCell><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 font-mono text-xs" /></TableCell>
                              <TableCell><Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} className="h-8" /></TableCell>
                              <TableCell><Switch checked={m.active} onCheckedChange={(checked) => updateMilestone.mutate({ id: m.id, active: checked })} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(m.id)}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-muted-foreground">{m.sequence}</TableCell>
                              <TableCell className="font-mono text-xs">{m.name}</TableCell>
                              <TableCell className="font-medium">{m.display_name}</TableCell>
                              <TableCell><Switch checked={m.active} onCheckedChange={(checked) => updateMilestone.mutate({ id: m.id, active: checked })} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                    setEditId(m.id); setEditName(m.name); setEditDisplay(m.display_name);
                                  }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(m)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Production Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input value={newDisplay} onChange={(e) => {
                setNewDisplay(e.target.value);
                setNewName("date_" + e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
              }} placeholder="e.g. Material Order" />
            </div>
            <div className="space-y-2">
              <Label>Key (auto-generated)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="font-mono text-sm" />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createMilestone.isPending || !newName || !newDisplay}>
              {createMilestone.isPending ? "Adding..." : "Add Milestone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing this milestone will not delete existing date values from jobs, but the field will no longer appear in the production milestone form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Production Item Statuses Section ──

function ProductionItemStatusesSection() {
  const { toast } = useToast();
  const { data: statuses = [] } = useProductionItemStatuses();
  const createStatus = useCreateProductionItemStatus();
  const updateStatus = useUpdateProductionItemStatus();
  const deleteStatus = useDeleteProductionItemStatus();
  const bulkUpdateOrder = useBulkUpdateProductionItemStatusOrder();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDisplay, setEditDisplay] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductionItemStatus | null>(null);

  const { data: deleteUsageCount } = useQuery({
    queryKey: ["production-item-status-usage", deleteTarget?.name],
    enabled: !!deleteTarget,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("job_production_items")
        .select("id", { count: "exact", head: true })
        .eq("status", deleteTarget!.name as any);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(statuses);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updates = reordered.map((s, i) => ({ id: s.id, sequence: i + 1 }));
    bulkUpdateOrder.mutate(updates);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newDisplay.trim()) return;
    try {
      await createStatus.mutateAsync({
        name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
        display_name: newDisplay.trim(),
        sequence: statuses.length + 1,
        color: newColor,
      });
      toast({ title: "Production status added" });
      setShowAdd(false);
      setNewName("");
      setNewDisplay("");
      setNewColor("#6b7280");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, name: editName, display_name: editDisplay, color: editColor });
      setEditId(null);
      toast({ title: "Production status updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStatus.mutateAsync(deleteTarget.id);
      toast({ title: "Production status deleted" });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CircleDot className="h-4 w-4" /> Production Status Flow
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1 h-3 w-3" /> Add Status
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Flow preview */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          {statuses.filter(s => s.active).map((s, i) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs" style={{ borderColor: s.color, color: s.color }}>
                {s.display_name}
              </Badge>
              {i < statuses.filter(s => s.active).length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </span>
          ))}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="prod-statuses">
            {(provided) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Seq</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                  {statuses.map((s, index) => (
                    <Draggable key={s.id} draggableId={s.id} index={index}>
                      {(dragProvided) => (
                        <TableRow ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                          <TableCell>
                            <span {...dragProvided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </span>
                          </TableCell>
                          {editId === s.id ? (
                            <>
                              <TableCell className="text-xs text-muted-foreground">{s.sequence}</TableCell>
                              <TableCell><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 font-mono text-xs" /></TableCell>
                              <TableCell><Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} className="h-8" /></TableCell>
                              <TableCell><Input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-8 w-14 p-1" /></TableCell>
                              <TableCell><Switch checked={s.active} onCheckedChange={(checked) => updateStatus.mutate({ id: s.id, active: checked })} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(s.id)}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-xs text-muted-foreground">{s.sequence}</TableCell>
                              <TableCell className="font-mono text-xs">{s.name}</TableCell>
                              <TableCell className="font-medium">{s.display_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: s.color }} />
                                  <span className="text-xs text-muted-foreground">{s.color}</span>
                                </div>
                              </TableCell>
                              <TableCell><Switch checked={s.active} onCheckedChange={(checked) => updateStatus.mutate({ id: s.id, active: checked })} /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                    setEditId(s.id); setEditName(s.name); setEditDisplay(s.display_name); setEditColor(s.color);
                                  }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(s)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Production Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input value={newDisplay} onChange={(e) => {
                setNewDisplay(e.target.value);
                setNewName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
              }} placeholder="e.g. Awaiting Materials" />
            </div>
            <div className="space-y-2">
              <Label>Key (auto-generated)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-10 w-14 p-1" />
                <span className="text-sm text-muted-foreground">{newColor}</span>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createStatus.isPending || !newName || !newDisplay}>
              {createStatus.isPending ? "Adding..." : "Add Production Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsageCount && deleteUsageCount > 0
                ? `Warning: ${deleteUsageCount} production item${deleteUsageCount !== 1 ? "s" : ""} currently use this status. They will retain the value but it won't appear in dropdowns or Kanban columns.`
                : "No production items are currently using this status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Status Branches Section ──

function StatusBranchesSection() {
  const { toast } = useToast();
  const { data: branches = [] } = useStatusBranches();
  const { data: allStatuses = [] } = useJobStatuses();
  const updateBranch = useUpdateStatusBranch();
  const createStatus = useCreateJobStatus();
  const updateStatus = useUpdateJobStatus();
  const deleteStatus = useDeleteJobStatus();

  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editBranchPoint, setEditBranchPoint] = useState("");

  // Add status to branch
  const [addingToBranch, setAddingToBranch] = useState<string | null>(null);
  const [newStatusDisplay, setNewStatusDisplay] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6b7280");

  // Edit status in branch
  const [editStatusId, setEditStatusId] = useState<string | null>(null);
  const [editStatusName, setEditStatusName] = useState("");
  const [editStatusDisplay, setEditStatusDisplay] = useState("");
  const [editStatusColor, setEditStatusColor] = useState("");

  // Delete status
  const [deleteTarget, setDeleteTarget] = useState<{ status: JobStatus; branchId: string } | null>(null);

  const { data: deleteUsageCount } = useQuery({
    queryKey: ["branch-status-usage", deleteTarget?.status.name],
    enabled: !!deleteTarget,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", deleteTarget!.status.name as any);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const handleAddStatus = async (branchId: string) => {
    if (!newStatusDisplay.trim() || !newStatusName.trim()) return;
    try {
      const newStatus = await createStatus.mutateAsync({
        name: newStatusName.trim(),
        display_name: newStatusDisplay.trim(),
        sequence: allStatuses.length + 1,
        color: newStatusColor,
      });
      // Add the new status ID to the branch
      const branch = branches.find(b => b.id === branchId);
      if (branch && newStatus) {
        const newIds = [...(branch.statuses || []), newStatus.id];
        await updateBranch.mutateAsync({ id: branchId, statuses: newIds } as any);
      }
      toast({ title: "Status added to branch" });
      setAddingToBranch(null);
      setNewStatusDisplay("");
      setNewStatusName("");
      setNewStatusColor("#6b7280");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveStatusEdit = async () => {
    if (!editStatusId) return;
    try {
      await updateStatus.mutateAsync({
        id: editStatusId,
        name: editStatusName,
        display_name: editStatusDisplay,
        color: editStatusColor,
      });
      setEditStatusId(null);
      toast({ title: "Status updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveFromBranch = async (branchId: string, statusId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    const newIds = (branch.statuses || []).filter((id: string) => id !== statusId);
    try {
      await updateBranch.mutateAsync({ id: branchId, statuses: newIds } as any);
      toast({ title: "Status removed from branch" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteStatus = async () => {
    if (!deleteTarget) return;
    try {
      // Remove from branch first
      await handleRemoveFromBranch(deleteTarget.branchId, deleteTarget.status.id);
      // Then delete the status itself
      await deleteStatus.mutateAsync(deleteTarget.status.id);
      toast({ title: "Status deleted" });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateBranchStatuses = async (branchId: string, statusIds: string[]) => {
    try {
      await updateBranch.mutateAsync({ id: branchId, statuses: statusIds } as any);
      toast({ title: "Branch statuses updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveBranchPoint = async (branchId: string) => {
    try {
      await updateBranch.mutateAsync({ id: branchId, branch_point_status: editBranchPoint } as any);
      setEditingBranch(null);
      toast({ title: "Branch point updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleStatusInBranch = (branch: any, statusId: string) => {
    const currentIds = branch.statuses || [];
    const newIds = currentIds.includes(statusId)
      ? currentIds.filter((id: string) => id !== statusId)
      : [...currentIds, statusId];
    handleUpdateBranchStatuses(branch.id, newIds);
  };

  const handleReorderBranchStatuses = (branchId: string, statuses: any[], result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(statuses);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const newIds = reordered.map(s => s.id);
    updateBranch.mutate({ id: branchId, statuses: newIds });
  };

  const mainBranch = branches.find(b => b.name === "main");
  const mainStatusIds = mainBranch?.statuses || [];
  const mainStatuses = mainStatusIds.map((id: string) => allStatuses.find(s => s.id === id)).filter(Boolean);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" /> Status Branches (Workflow Flows)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {branches.map((branch) => {
          const isMain = branch.name === "main";
          const branchStatuses = (branch.statuses || [])
            .map((sid: string) => allStatuses.find(s => s.id === sid))
            .filter(Boolean) as JobStatus[];

          // Statuses NOT yet in this branch (for toggling in)
          const unassignedStatuses = allStatuses.filter(
            s => !(branch.statuses || []).includes(s.id) && !branches.some(b => b.id !== branch.id && (b.statuses || []).includes(s.id))
          );

          return (
            <div key={branch.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{branch.display_name}</h4>
                  <Badge variant="outline" className="text-[10px]">{branch.name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!isMain && (
                    <>
                      <Label className="text-xs text-muted-foreground">Branch Point:</Label>
                      {editingBranch === branch.id ? (
                        <div className="flex items-center gap-1">
                          <Select value={editBranchPoint} onValueChange={setEditBranchPoint}>
                            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {mainStatuses.map((s: any) => (
                                <SelectItem key={s.id} value={s.name} className="text-xs">{s.display_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSaveBranchPoint(branch.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingBranch(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs font-mono bg-muted px-2 py-0.5 rounded hover:bg-muted/80"
                          onClick={() => { setEditingBranch(branch.id); setEditBranchPoint(branch.branch_point_status || "inspected"); }}
                        >
                          {branch.branch_point_status || "inspected"}
                        </button>
                      )}
                    </>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    setAddingToBranch(branch.id);
                    setNewStatusDisplay("");
                    setNewStatusName("");
                    setNewStatusColor("#6b7280");
                  }}>
                    <Plus className="mr-1 h-3 w-3" /> Add Status
                  </Button>
                </div>
              </div>

              {/* Current flow preview */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {branchStatuses.map((s, i) => (
                  <span key={s.id} className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs" style={{ borderColor: s.color, color: s.color }}>
                      {s.display_name}
                    </Badge>
                    {i < branchStatuses.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                  </span>
                ))}
              </div>

              {/* Draggable statuses table */}
              <DragDropContext onDragEnd={(result) => handleReorderBranchStatuses(branch.id, branchStatuses, result)}>
                <Droppable droppableId={`branch-${branch.id}`}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                      {branchStatuses.map((s, idx) => (
                        <Draggable key={s.id} draggableId={`bs-${s.id}`} index={idx}>
                          {(dragProv) => (
                            <div ref={dragProv.innerRef} {...dragProv.draggableProps}
                              className="flex items-center gap-2 rounded border px-3 py-1.5 bg-card text-sm">
                              <span {...dragProv.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                              <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: s.color }} />
                              {editStatusId === s.id ? (
                                <div className="flex items-center gap-2 flex-1 flex-wrap">
                                  <Input value={editStatusDisplay} onChange={(e) => setEditStatusDisplay(e.target.value)} className="h-7 w-32 text-xs" />
                                  <Input value={editStatusName} onChange={(e) => setEditStatusName(e.target.value)} className="h-7 w-28 text-xs font-mono" />
                                  <Input type="color" value={editStatusColor} onChange={(e) => setEditStatusColor(e.target.value)} className="h-7 w-10 p-0.5" />
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSaveStatusEdit}>Save</Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditStatusId(null)}>Cancel</Button>
                                </div>
                              ) : (
                                <>
                                  <span className="font-medium flex-1">{s.display_name}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{s.name}</span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                                    setEditStatusId(s.id); setEditStatusDisplay(s.display_name); setEditStatusName(s.name); setEditStatusColor(s.color);
                                  }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget({ status: s, branchId: branch.id })}><Trash2 className="h-3 w-3" /></Button>
                                </>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          );
        })}
      </CardContent>

      {/* Add Status Dialog */}
      <Dialog open={!!addingToBranch} onOpenChange={(open) => !open && setAddingToBranch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Status to Branch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input value={newStatusDisplay} onChange={(e) => {
                setNewStatusDisplay(e.target.value);
                setNewStatusName(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
              }} placeholder="e.g. Appraisal Review" />
            </div>
            <div className="space-y-2">
              <Label>Key (auto-generated)</Label>
              <Input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="h-10 w-14 p-1" />
                <span className="text-sm text-muted-foreground">{newStatusColor}</span>
              </div>
            </div>
            <Button onClick={() => addingToBranch && handleAddStatus(addingToBranch)} className="w-full"
              disabled={createStatus.isPending || !newStatusName || !newStatusDisplay}>
              {createStatus.isPending ? "Adding..." : "Add Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Status Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.status.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsageCount && deleteUsageCount > 0
                ? `Warning: ${deleteUsageCount} job${deleteUsageCount !== 1 ? "s" : ""} currently use this status. They will retain the value but it won't appear in workflow bars.`
                : "No jobs are currently using this status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteStatus}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ── Main Export ──

export function CustomizationsTab() {
  return (
    <div className="space-y-6 mt-4">
      <LeadSourcesSection />
      <JobStatusesSection />
      <StatusBranchesSection />
      <ProductionItemStatusesSection />
      <ProductionMilestonesSection />
    </div>
  );
}
