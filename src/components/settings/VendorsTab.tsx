import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from "@/hooks/useVendors";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Store } from "lucide-react";

export function VendorsTab() {
  const { toast } = useToast();
  const { data: vendors = [] } = useVendors(false);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("material");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const handleAdd = async () => {
    if (!name) return;
    try {
      await createVendor.mutateAsync({ name, type });
      toast({ title: "Vendor enlisted" });
      setShowAdd(false);
      setName("");
      setType("material");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> Vendors</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="mr-1 h-3 w-3" /> Add Vendor</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map(v => (
                <TableRow key={v.id}>
                  {editId === v.id ? (
                    <>
                      <TableCell><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" /></TableCell>
                      <TableCell>
                        <Select value={editType} onValueChange={setEditType}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{["material","labor","misc"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Switch checked={v.active} onCheckedChange={checked => updateVendor.mutate({ id: v.id, active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => {
                            await updateVendor.mutateAsync({ id: v.id, name: editName, type: editType });
                            setEditId(null);
                            toast({ title: "Vendor updated" });
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>Cancel</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="capitalize">{v.type}</TableCell>
                      <TableCell><Switch checked={v.active} onCheckedChange={checked => updateVendor.mutate({ id: v.id, active: checked })} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(v.id); setEditName(v.name); setEditType(v.type); }}><Pencil className="h-3 w-3" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete "{v.name}"?</AlertDialogTitle><AlertDialogDescription>This vendor will be removed.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteVendor.mutate(v.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {vendors.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No vendors yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Vendor name" /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["material","labor","misc"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={createVendor.isPending || !name}>{createVendor.isPending ? "Adding..." : "Add Vendor"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
