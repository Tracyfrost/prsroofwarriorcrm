import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, Milestone, Palette, Tag, Pencil, Save, Trash2, Plus } from "lucide-react";
import {
  type JobStatus,
  type LeadSource,
  type ProductionItemStatus,
  type ProductionMilestone,
  useBulkUpdateJobStatusOrder,
  useBulkUpdateLeadSourceOrder,
  useBulkUpdateMilestoneOrder,
  useBulkUpdateProductionItemStatusOrder,
  useCreateJobStatus,
  useCreateLeadSource,
  useCreateProductionItemStatus,
  useCreateProductionMilestone,
  useDeleteJobStatus,
  useDeleteLeadSource,
  useDeleteProductionItemStatus,
  useDeleteProductionMilestone,
  useJobStatuses,
  useLeadSources,
  useProductionItemStatuses,
  useProductionMilestones,
  useUpdateJobStatus,
  useUpdateLeadSource,
  useUpdateProductionItemStatus,
  useUpdateProductionMilestone,
} from "@/hooks/useCustomizations";
import { useCreateStatusBranch, useDeleteStatusBranch, useStatusBranches, useUpdateStatusBranch } from "@/hooks/useStatusBranches";

const toSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

function LeadSourcesSection() {
  const { toast } = useToast();
  const { data: sources = [] } = useLeadSources();
  const createLeadSource = useCreateLeadSource();
  const updateLeadSource = useUpdateLeadSource();
  const deleteLeadSource = useDeleteLeadSource();
  const reorderLeadSources = useBulkUpdateLeadSourceOrder();

  const [newDisplay, setNewDisplay] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDisplay, setEditDisplay] = useState("");
  const [editColor, setEditColor] = useState("");

  const moveSource = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= sources.length) return;
    const reordered = [...sources];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    reorderLeadSources.mutate(reordered.map((s, i) => ({ id: s.id, sort_order: i + 1 })));
  };

  const saveEdit = () => {
    if (!editId || !editDisplay.trim()) return;
    updateLeadSource.mutate({ id: editId, display_name: editDisplay.trim(), color: editColor });
    setEditId(null);
  };

  const addSource = () => {
    if (!newDisplay.trim()) return;
    createLeadSource.mutate({
      name: toSlug(newDisplay),
      display_name: newDisplay.trim(),
      color: newColor,
      active: true,
      sort_order: sources.length + 1,
      requires_pool: false,
      default_cost_per_lead: 0,
    });
    setNewDisplay("");
    setNewColor("#6b7280");
    toast({ title: "Lead source added" });
  };

  return (
    <Card className="min-w-0 max-w-full shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Lead Sources
        </CardTitle>
        <Badge variant="outline">{sources.length}</Badge>
      </CardHeader>
      <CardContent className="border-b p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Add lead source display name" value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} />
          <Input type="color" className="h-10 w-20" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          <Button onClick={addSource}><Plus className="mr-1 h-3 w-3" />Add</Button>
        </div>
      </CardContent>
      <CardContent className="p-0">
        <Table containerClassName="overflow-visible" className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-0 w-[22%]">Display</TableHead>
              <TableHead className="min-w-0 w-[18%]">Key</TableHead>
              <TableHead className="min-w-0 w-[18%]">Color</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="min-w-0">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source, index) => (
              <TableRow key={source.id}>
                <TableCell className="min-w-0 break-words font-medium">
                  {editId === source.id ? (
                    <Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} />
                  ) : source.display_name}
                </TableCell>
                <TableCell className="min-w-0 break-all font-mono text-xs text-muted-foreground">{source.name}</TableCell>
                <TableCell>
                  {editId === source.id ? (
                    <Input type="color" className="h-9 w-20" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: source.color }} />
                      <span className="font-mono text-xs text-muted-foreground">{source.color}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Switch checked={source.active} onCheckedChange={(checked) => updateLeadSource.mutate({ id: source.id, active: checked })} />
                </TableCell>
                <TableCell className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    {editId === source.id ? (
                      <Button size="sm" variant="outline" onClick={saveEdit}><Save className="h-3 w-3" /></Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditId(source.id);
                          setEditDisplay(source.display_name);
                          setEditColor(source.color);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => moveSource(index, -1)}>Up</Button>
                    <Button size="sm" variant="outline" onClick={() => moveSource(index, 1)}>Down</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteLeadSource.mutate(source.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function JobStatusesSection() {
  const { toast } = useToast();
  const { data: statuses = [] } = useJobStatuses();
  const createStatus = useCreateJobStatus();
  const updateStatus = useUpdateJobStatus();
  const deleteStatus = useDeleteJobStatus();
  const reorderStatuses = useBulkUpdateJobStatusOrder();
  const [newDisplay, setNewDisplay] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDisplay, setEditDisplay] = useState("");
  const [editColor, setEditColor] = useState("");

  const moveStatus = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= statuses.length) return;
    const reordered = [...statuses];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    reorderStatuses.mutate(reordered.map((s, i) => ({ id: s.id, sequence: i + 1 })));
  };

  const addStatus = () => {
    if (!newDisplay.trim()) return;
    createStatus.mutate({
      name: toSlug(newDisplay),
      display_name: newDisplay.trim(),
      color: newColor,
      active: true,
      sequence: statuses.length + 1,
    });
    setNewDisplay("");
    setNewColor("#6b7280");
    toast({ title: "Status added" });
  };

  return (
    <Card className="min-w-0 max-w-full shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Job Status Flow
        </CardTitle>
        <Badge variant="outline">{statuses.length}</Badge>
      </CardHeader>
      <CardContent className="border-b p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Add status display name" value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} />
          <Input type="color" className="h-10 w-20" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          <Button onClick={addStatus}><Plus className="mr-1 h-3 w-3" />Add</Button>
        </div>
      </CardContent>
      <CardContent className="p-0">
        <Table containerClassName="overflow-visible" className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Seq</TableHead>
              <TableHead className="min-w-0 w-[20%]">Display</TableHead>
              <TableHead className="min-w-0 w-[16%]">Key</TableHead>
              <TableHead className="min-w-0 w-[16%]">Color</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="min-w-0">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((status, index) => (
              <TableRow key={status.id}>
                <TableCell>{status.sequence}</TableCell>
                <TableCell className="min-w-0 break-words font-medium">
                  {editId === status.id ? (
                    <Input value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} />
                  ) : status.display_name}
                </TableCell>
                <TableCell className="min-w-0 break-all font-mono text-xs text-muted-foreground">{status.name}</TableCell>
                <TableCell>
                  {editId === status.id ? (
                    <Input type="color" className="h-9 w-20" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: status.color }} />
                      <span className="font-mono text-xs text-muted-foreground">{status.color}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Switch checked={status.active} onCheckedChange={(checked) => updateStatus.mutate({ id: status.id, active: checked })} />
                </TableCell>
                <TableCell className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    {editId === status.id ? (
                      <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ id: status.id, display_name: editDisplay, color: editColor }); setEditId(null); }}>
                        <Save className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setEditId(status.id); setEditDisplay(status.display_name); setEditColor(status.color); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => moveStatus(index, -1)}>Up</Button>
                    <Button size="sm" variant="outline" onClick={() => moveStatus(index, 1)}>Down</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteStatus.mutate(status.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatusBranchesSection() {
  const { toast } = useToast();
  const { data: branches = [] } = useStatusBranches();
  const createBranch = useCreateStatusBranch();
  const updateBranch = useUpdateStatusBranch();
  const deleteBranch = useDeleteStatusBranch();
  const { data: allStatuses = [] } = useJobStatuses();
  const [newBranchName, setNewBranchName] = useState("");
  const [branchAddStatus, setBranchAddStatus] = useState<Record<string, string>>({});

  return (
    <Card className="min-w-0 max-w-full shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Status Branches (Workflow Flows)
        </CardTitle>
      </CardHeader>
      <CardContent className="border-b p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="New branch display name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
          <Button
            onClick={() => {
              if (!newBranchName.trim()) return;
              createBranch.mutate({
                name: toSlug(newBranchName),
                display_name: newBranchName.trim(),
                statuses: [],
                active: true,
                parent_branch_id: null,
                branch_point_status: null,
              });
              setNewBranchName("");
              toast({ title: "Branch created" });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />Add Branch
          </Button>
        </div>
      </CardContent>
      <CardContent className="space-y-6">
        {branches.map((branch) => {
          const branchStatuses = (branch.statuses || [])
            .map((sid: string) => allStatuses.find((status) => status.id === sid))
            .filter(Boolean);

          return (
            <div key={branch.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{branch.display_name || branch.name}</h4>
                <div className="flex items-center gap-2">
                  <Switch checked={branch.active} onCheckedChange={(checked) => updateBranch.mutate({ id: branch.id, active: checked })} />
                  <Button size="sm" variant="destructive" onClick={() => deleteBranch.mutate(branch.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={branchAddStatus[branch.id] ?? ""}
                  onValueChange={(value) => setBranchAddStatus((prev) => ({ ...prev, [branch.id]: value }))}
                >
                  <SelectTrigger className="min-w-0 w-full sm:max-w-xs">
                    <SelectValue placeholder="Add status to branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {allStatuses
                      .filter((status) => !(branch.statuses || []).includes(status.id))
                      .map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.display_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const statusId = branchAddStatus[branch.id];
                    if (!statusId) return;
                    updateBranch.mutate({ id: branch.id, statuses: [...(branch.statuses || []), statusId] });
                    setBranchAddStatus((prev) => ({ ...prev, [branch.id]: "" }));
                  }}
                >
                  Add Status
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {branchStatuses.map((status) => (
                  <Badge key={status?.id} variant="outline" className="gap-2 px-2 py-1">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status?.color }} />
                    {status?.display_name}
                    <button
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        updateBranch.mutate({
                          id: branch.id,
                          statuses: (branch.statuses || []).filter((sid) => sid !== status?.id),
                        })
                      }
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ProductionMilestonesSection() {
  const { toast } = useToast();
  const { data: milestones = [] } = useProductionMilestones();
  const createMilestone = useCreateProductionMilestone();
  const updateMilestone = useUpdateProductionMilestone();
  const deleteMilestone = useDeleteProductionMilestone();
  const reorderMilestones = useBulkUpdateMilestoneOrder();
  const [newDisplay, setNewDisplay] = useState("");

  const moveMilestone = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= milestones.length) return;
    const reordered = [...milestones];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    reorderMilestones.mutate(reordered.map((m, i) => ({ id: m.id, sequence: i + 1 })));
  };

  return (
    <Card className="min-w-0 max-w-full shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Milestone className="h-4 w-4" />
          Production Milestones
        </CardTitle>
        <Badge variant="outline">{milestones.length}</Badge>
      </CardHeader>
      <CardContent className="border-b p-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input className="min-w-0 flex-1 sm:min-w-[12rem]" placeholder="Add milestone display name" value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} />
          <Button
            onClick={() => {
              if (!newDisplay.trim()) return;
              createMilestone.mutate({
                name: toSlug(newDisplay),
                display_name: newDisplay.trim(),
                active: true,
                sequence: milestones.length + 1,
              });
              setNewDisplay("");
              toast({ title: "Milestone added" });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />Add
          </Button>
        </div>
      </CardContent>
      <CardContent className="space-y-2">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="break-words font-medium">{milestone.display_name}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{milestone.name}</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Switch checked={milestone.active} onCheckedChange={(checked) => updateMilestone.mutate({ id: milestone.id, active: checked })} />
              <Button size="sm" variant="outline" onClick={() => moveMilestone(index, -1)}>Up</Button>
              <Button size="sm" variant="outline" onClick={() => moveMilestone(index, 1)}>Down</Button>
              <Button size="sm" variant="destructive" onClick={() => deleteMilestone.mutate(milestone.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProductionItemStatusesSection() {
  const { toast } = useToast();
  const { data: statuses = [] } = useProductionItemStatuses();
  const createStatus = useCreateProductionItemStatus();
  const updateStatus = useUpdateProductionItemStatus();
  const deleteStatus = useDeleteProductionItemStatus();
  const reorderStatuses = useBulkUpdateProductionItemStatusOrder();
  const [newDisplay, setNewDisplay] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");

  const moveStatus = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= statuses.length) return;
    const reordered = [...statuses];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    reorderStatuses.mutate(reordered.map((s, i) => ({ id: s.id, sequence: i + 1 })));
  };

  return (
    <Card className="min-w-0 max-w-full shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Production Item Statuses
        </CardTitle>
        <Badge variant="outline">{statuses.length}</Badge>
      </CardHeader>
      <CardContent className="border-b p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Add production item status" value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} />
          <Input type="color" className="h-10 w-20" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          <Button
            onClick={() => {
              if (!newDisplay.trim()) return;
              createStatus.mutate({
                name: toSlug(newDisplay),
                display_name: newDisplay.trim(),
                color: newColor,
                active: true,
                sequence: statuses.length + 1,
              });
              setNewDisplay("");
              setNewColor("#6b7280");
              toast({ title: "Production item status added" });
            }}
          >
            <Plus className="mr-1 h-3 w-3" />Add
          </Button>
        </div>
      </CardContent>
      <CardContent className="space-y-2">
        {statuses.map((status, index) => (
          <div key={status.id} className="flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full border" style={{ backgroundColor: status.color }} />
              <div className="min-w-0">
                <p className="break-words font-medium">{status.display_name}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{status.name}</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Switch checked={status.active} onCheckedChange={(checked) => updateStatus.mutate({ id: status.id, active: checked })} />
              <Button size="sm" variant="outline" onClick={() => moveStatus(index, -1)}>Up</Button>
              <Button size="sm" variant="outline" onClick={() => moveStatus(index, 1)}>Down</Button>
              <Button size="sm" variant="destructive" onClick={() => deleteStatus.mutate(status.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CustomizationsTab() {
  return (
    <div className="min-w-0 max-w-full space-y-8 p-4 sm:p-6">
      <LeadSourcesSection />
      <JobStatusesSection />
      <StatusBranchesSection />
      <ProductionMilestonesSection />
      <ProductionItemStatusesSection />
    </div>
  );
}