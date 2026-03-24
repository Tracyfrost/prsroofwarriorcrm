// MOBILE-PORT-READY – maps 1:1 to React Native
import { useState } from "react";
import { useLeadSegments, useCreateSegment } from "@/hooks/useCallSetter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Plus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SegmentsTab() {
  const { data: segments = [] } = useLeadSegments();
  const createSegment = useCreateSegment();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", filter_type: "zip", filter_value: "" });

  const handleCreate = () => {
    if (!form.name || !form.filter_value) return;
    createSegment.mutate(form);
    setForm({ name: "", filter_type: "zip", filter_value: "" });
    setShow(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lead Segments</h2>
        <Button onClick={() => setShow(true)} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" /> Create Segment</Button>
      </div>

      {segments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No segments yet. Create one to organize your leads.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Filter</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell className="font-medium">{seg.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{seg.filter_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{seg.filter_value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ResponsiveModal open={show} onOpenChange={setShow} title="Create Segment">
        <div className="space-y-3 py-2">
          <div><Label>Segment Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dallas 75001" /></div>
          <div>
            <Label>Filter Type</Label>
            <Select value={form.filter_type} onValueChange={(v) => setForm({ ...form, filter_type: v })}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="zip">ZIP Code</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Filter Value</Label><Input value={form.filter_value} onChange={(e) => setForm({ ...form, filter_value: e.target.value })} placeholder="e.g. 75001,75002" /></div>
          <Button onClick={handleCreate} className="w-full min-h-[44px]">Forge Segment</Button>
        </div>
      </ResponsiveModal>
    </div>
  );
}
