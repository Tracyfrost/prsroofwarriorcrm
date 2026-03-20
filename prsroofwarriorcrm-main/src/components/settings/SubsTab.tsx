import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSubs, useCreateSub, useUpdateSub, useDeleteSub } from "@/hooks/useSubs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";

export function SubsTab() {
  const { toast } = useToast();
  const { data: subs = [] } = useSubs(false);
  const createSub = useCreateSub();
  const updateSub = useUpdateSub();
  const deleteSub = useDeleteSub();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [rate, setRate] = useState("0");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editRate, setEditRate] = useState("");

  const handleAdd = async () => {
    if (!name) return;
    try {
      await createSub.mutateAsync({ name, specialty, rate: parseFloat(rate) || 0 });
      toast({ title: "Subcontractor enlisted" });
      setShowAdd(false);
      setName(""); setSpecialty(""); setRate("0");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4" /> Subcontractors</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Sub</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Rate ($)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map(s => (
                <TableRow key={s.id}>
                  {editId === s.id ? (
                    <>
                      <TableCell><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" /></TableCell>
                      <TableCell><Input value={editSpecialty} onChange={e => setEditSpecialty(e.target.value)} className="h-8" /></TableCell>
                      <TableCell><Input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="h-8 w-20 font-mono" /></TableCell>
                      <TableCell><Switch checked={s.active} onCheckedChange={checked => updateSub.mutate({ id: s.id, active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => {
                            await updateSub.mutateAsync({ id: s.id, name: editName, specialty: editSpecialty, rate: parseFloat(editRate) || 0 });
                            setEditId(null);
                            toast({ title: "Sub updated" });
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.specialty || "—"}</TableCell>
                      <TableCell className="font-mono">${s.rate}</TableCell>
                      <TableCell><Switch checked={s.active} onCheckedChange={checked => updateSub.mutate({ id: s.id, active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(s.id); setEditName(s.name); setEditSpecialty(s.specialty); setEditRate(String(s.rate)); }}><Pencil className="h-3 w-3" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle><AlertDialogDescription>This subcontractor will be removed.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteSub.mutate(s.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {subs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No subcontractors yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subcontractor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Sub name" /></div>
            <div className="space-y-2"><Label>Specialty</Label><Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g. Roofing, Gutters" /></div>
            <div className="space-y-2"><Label>Rate ($)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
            <Button onClick={handleAdd} className="w-full" disabled={createSub.isPending || !name}>{createSub.isPending ? "Adding..." : "Add Subcontractor"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
