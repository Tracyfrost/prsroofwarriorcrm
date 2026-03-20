import { useState } from "react";
import { useJobLogs, useCreateJobLog, useSoftDeleteJobLog, useUpdateJobLog } from "@/hooks/useJobLogs";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Search, Trash2, Pencil, ScrollText, FileText, Zap, Filter } from "lucide-react";

const LOG_TYPES = ["Note", "Diary", "Action"] as const;

const TYPE_CONFIG: Record<string, { icon: typeof ScrollText; color: string }> = {
  Note: { icon: ScrollText, color: "bg-muted text-muted-foreground" },
  Diary: { icon: FileText, color: "bg-accent/20 text-accent-foreground" },
  Action: { icon: Zap, color: "bg-primary/15 text-primary" },
};

interface Props {
  jobId: string;
}

export function JobLogsTab({ jobId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOwnerOrAdmin } = usePermissions();
  const { data: logs = [], isLoading } = useJobLogs(jobId);
  const { data: allProfiles = [] } = useAllProfiles();
  const createLog = useCreateJobLog();
  const softDelete = useSoftDeleteJobLog();
  const updateLog = useUpdateJobLog();

  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<string>("Note");
  const [newContent, setNewContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const profileMap = new Map(allProfiles.map(p => [p.user_id, p]));

  const filteredLogs = logs.filter(log => {
    if (filterType !== "all" && log.type !== filterType) return false;
    if (searchQuery && !log.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!newContent.trim() || !user?.id) return;
    try {
      await createLog.mutateAsync({
        job_id: jobId,
        type: newType,
        content: newContent.trim(),
        user_id: user.id,
      });
      setShowAdd(false);
      setNewContent("");
      setNewType("Note");
      toast({ title: "Battle log entry forged" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm("Archive this log entry?")) return;
    try {
      await softDelete.mutateAsync({ id: logId, jobId });
      toast({ title: "Log entry archived" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!editId || !editContent.trim() || !user?.id) return;
    try {
      await updateLog.mutateAsync({
        id: editId,
        content: editContent.trim(),
        editedBy: user.id,
        jobId,
      });
      setEditId(null);
      setEditContent("");
      toast({ title: "Log entry updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold font-display tracking-wide uppercase text-foreground">
          Battle Log
        </h3>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {LOG_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" /> Forge Entry
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading battle log...</div>
      ) : filteredLogs.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-8 text-center">
            <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No log entries yet. Forge your first battle log.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-6 border-l-2 border-border space-y-4">
          {filteredLogs.map(log => {
            const cfg = TYPE_CONFIG[log.type] || TYPE_CONFIG.Note;
            const Icon = cfg.icon;
            const author = profileMap.get(log.user_id);
            const editor = log.edited_by ? profileMap.get(log.edited_by) : null;

            return (
              <div key={log.id} className="relative">
                {/* Timeline dot */}
                <div className={`absolute -left-[calc(1.5rem+5px)] top-2 h-2.5 w-2.5 rounded-full border-2 border-background ${log.type === "Action" ? "bg-primary" : log.type === "Diary" ? "bg-accent" : "bg-muted-foreground"}`} />
                <Card className="shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                          <Icon className="h-2.5 w-2.5" /> {log.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {author?.name || "System"} • {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                        {log.edited_at && (
                          <span className="text-[10px] text-muted-foreground italic">
                            (edited {editor?.name ? `by ${editor.name}` : ""})
                          </span>
                        )}
                      </div>
                      {isOwnerOrAdmin && (
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => { setEditId(log.id); setEditContent(log.content); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                            onClick={() => handleDelete(log.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap text-foreground">{log.content}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">Forge Battle Log Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Entry Type" />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Record your intel, action, or diary entry..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newContent.trim() || createLog.isPending}>
              {createLog.isPending ? "Forging..." : "Forge Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">Edit Log Entry</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editContent.trim() || updateLog.isPending}>
              {updateLog.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
