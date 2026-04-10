import { useState, useRef, useMemo } from "react";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  getDocumentUrl,
  formatSupabaseErr,
  type Document,
} from "@/hooks/useDocuments";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Upload, Trash2, Download, Image, File, Loader2, Ruler, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Constants, type Enums } from "@/integrations/supabase/types";

const DOC_TYPES = Constants.public.Enums.doc_type;
const TYPE_LABELS: Record<string, string> = {
  contract: "Contract",
  invoice: "Invoice",
  photo: "Photo",
  other: "Docs",
  measurements: "Measurements",
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  contract: FileText,
  invoice: FileText,
  photo: Image,
  other: File,
  measurements: Ruler,
};

type FolderTab = "all" | "photos" | "documents" | "measurements";

function documentMatchesFolder(doc: Document, tab: FolderTab): boolean {
  if (tab === "all") return true;
  if (tab === "photos") return doc.type === "photo";
  if (tab === "measurements") return doc.type === "measurements";
  return doc.type === "contract" || doc.type === "invoice" || doc.type === "other";
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({ jobId }: { jobId: string }) {
  const { data: documents = [], isLoading, isError, error, refetch, isFetching } = useDocuments(jobId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<Enums<"doc_type">>("other");
  const [folderTab, setFolderTab] = useState<FolderTab>("all");

  const filteredDocuments = useMemo(
    () => documents.filter((d) => documentMatchesFolder(d, folderTab)),
    [documents, folderTab],
  );

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
      } catch (err: unknown) {
        toast({ title: "Upload failed", description: formatSupabaseErr(err), variant: "destructive" });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (doc: Document) => {
    try {
      await deleteDoc.mutateAsync(doc);
      toast({ title: "Document deleted" });
    } catch (err: unknown) {
      toast({ title: "Error", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" /> Job files
          <Badge variant="secondary" className="text-[10px]">{documents.length}</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={uploadType} onValueChange={(v) => setUploadType(v as Enums<"doc_type">)}>
            <SelectTrigger className="h-7 min-w-[6.5rem] max-w-[9rem] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </SelectItem>
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
      <CardContent className="space-y-3">
        <Tabs value={folderTab} onValueChange={(v) => setFolderTab(v as FolderTab)}>
          <TabsList className="grid h-9 w-full grid-cols-4 p-0.5">
            <TabsTrigger value="all" className="text-[10px] px-1 sm:text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-[10px] px-1 sm:text-xs">
              Photos
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-[10px] px-1 sm:text-xs">
              Docs
            </TabsTrigger>
            <TabsTrigger value="measurements" className="text-[10px] px-1 sm:text-xs">
              Meas.
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Field snapshots also live in the SiteCam tab. Use Photos here for files you want next to contracts and PDFs.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          accept="application/pdf,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp"
        />
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could not load job files</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{formatSupabaseErr(error)}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : documents.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload contracts, invoices, photos, or measurement PDFs</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nothing in this folder</p>
            <p className="text-xs text-muted-foreground mt-1">Switch tabs or upload with the type dropdown above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => {
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
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {TYPE_LABELS[doc.type] ?? doc.type}
                      </Badge>
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
