import { useState, useRef } from "react";
import { useDocuments, useUploadDocument, useDeleteDocument, getDocumentUrl } from "@/hooks/useDocuments";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Upload, Trash2, Download, Image, File, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Constants } from "@/integrations/supabase/types";

const DOC_TYPES = Constants.public.Enums.doc_type;
const TYPE_LABELS: Record<string, string> = {
  contract: "Contract",
  invoice: "Invoice",
  photo: "Photo",
  other: "Other",
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  contract: FileText,
  invoice: FileText,
  photo: Image,
  other: File,
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({ jobId }: { jobId: string }) {
  const { data: documents = [], isLoading } = useDocuments(jobId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<string>("other");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 20MB limit`, variant: "destructive" });
        continue;
      }
      try {
        await uploadDoc.mutateAsync({
          file,
          jobId,
          type: uploadType,
          uploadedBy: user?.id,
        });
        toast({ title: "Uploaded", description: file.name });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (doc: any) => {
    try {
      await deleteDoc.mutateAsync(doc);
      toast({ title: "Document deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" /> Documents
          <Badge variant="secondary" className="text-[10px]">{documents.length}</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDoc.isPending}
          >
            {uploadDoc.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3 w-3" />
            )}
            Upload
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic"
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No documents yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload contracts, invoices, or photos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const Icon = TYPE_ICONS[doc.type] || File;
              const handleDownload = async () => {
                try {
                  const url = await getDocumentUrl(doc.file_path);
                  window.open(url, "_blank");
                } catch {
                  toast({ title: "Error", description: "Could not generate download link", variant: "destructive" });
                }
              };
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{TYPE_LABELS[doc.type]}</Badge>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>v{doc.version}</span>
                      <span>{format(new Date(doc.created_at), "MMM d")}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleDownload}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
