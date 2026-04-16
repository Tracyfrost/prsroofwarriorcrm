import { useState, useRef, useMemo, useEffect } from "react";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useJobDocumentFolders,
  useCreateJobDocumentFolder,
  useUpdateJobDocumentFolder,
  useDeleteJobDocumentFolder,
  useUpdateDocument,
  useMoveDocumentsToFolder,
  getDocumentUrl,
  formatSupabaseErr,
  jobFolderAncestors,
  jobFolderLabelPath,
  type Document,
  type JobDocumentFolder,
  type JobDocumentFolderScope,
} from "@/hooks/useDocuments";
import { DocumentPreview, documentPreviewKind } from "@/components/documents/DocumentPreview";
import { AiDamageAnalyzeUrlButton } from "@/components/sitecam/AiDamageButton";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Image,
  File,
  Loader2,
  Ruler,
  AlertCircle,
  Folder,
  FolderPlus,
  MoreVertical,
  Pencil,
  Camera,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { openFileViaProxy } from "@/lib/fileProxy";
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

function tabToFolderScope(tab: FolderTab): JobDocumentFolderScope | null {
  if (tab === "photos") return "photos";
  if (tab === "documents") return "documents";
  return null;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docTypeForDrop(tab: FolderTab): Enums<"doc_type"> {
  if (tab === "photos") return "photo";
  if (tab === "measurements") return "measurements";
  return "other";
}

function homogeneousFolderScopeForDocs(docs: Document[]): JobDocumentFolderScope | null {
  if (docs.length === 0) return null;
  if (docs.every((d) => d.type === "photo")) return "photos";
  if (docs.every((d) => d.type === "contract" || d.type === "invoice" || d.type === "other")) {
    return "documents";
  }
  return null;
}

export function DocumentsPanel({
  jobId,
  onGoToSiteCam,
}: {
  jobId: string;
  /** Switch parent UI to the SiteCam tab (annotate / field photos live there). */
  onGoToSiteCam?: () => void;
}) {
  const { data: documents = [], isLoading, isError, error, refetch, isFetching } = useDocuments(jobId);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const createFolder = useCreateJobDocumentFolder();
  const updateFolder = useUpdateJobDocumentFolder();
  const deleteFolder = useDeleteJobDocumentFolder();
  const updateDocument = useUpdateDocument();
  const moveDocumentsBulk = useMoveDocumentsToFolder();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<Enums<"doc_type">>("other");
  const [folderTab, setFolderTab] = useState<FolderTab>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const [folderIdByScope, setFolderIdByScope] = useState<{
    photos: string | null;
    documents: string | null;
  }>({ photos: null, documents: null });

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<JobDocumentFolder | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewPhotoDoc, setPreviewPhotoDoc] = useState<Document | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [previewNonPhotoDoc, setPreviewNonPhotoDoc] = useState<Document | null>(null);
  const [nonPhotoPreviewUrl, setNonPhotoPreviewUrl] = useState<string | null>(null);
  const [renamingFileDoc, setRenamingFileDoc] = useState<Document | null>(null);
  const [renameFileValue, setRenameFileValue] = useState("");

  const scope = tabToFolderScope(folderTab);
  const currentFolderId = scope ? folderIdByScope[scope] : null;

  const setCurrentFolderId = (id: string | null) => {
    if (!scope) return;
    setFolderIdByScope((prev) => ({ ...prev, [scope]: id }));
  };

  const { data: jobFolders = [], isFetched: foldersFetched } = useJobDocumentFolders(jobId, scope);

  useEffect(() => {
    if (!scope || !foldersFetched) return;
    if (currentFolderId && !jobFolders.some((f) => f.id === currentFolderId)) {
      setCurrentFolderId(null);
    }
  }, [scope, foldersFetched, jobFolders, currentFolderId]);

  useEffect(() => {
    if (!previewPhotoDoc) {
      setPhotoPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = await getDocumentUrl(previewPhotoDoc.file_path);
        if (!cancelled) setPhotoPreviewUrl(url);
      } catch {
        if (!cancelled) {
          setPhotoPreviewUrl(null);
          toast({
            title: "Error",
            description: "Could not load photo preview link",
            variant: "destructive",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewPhotoDoc, toast]);

  useEffect(() => {
    if (!previewNonPhotoDoc) {
      setNonPhotoPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = await getDocumentUrl(previewNonPhotoDoc.file_path);
        if (!cancelled) setNonPhotoPreviewUrl(url);
      } catch {
        if (!cancelled) {
          setNonPhotoPreviewUrl(null);
          toast({
            title: "Error",
            description: "Could not load document preview link",
            variant: "destructive",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewNonPhotoDoc, toast]);

  const tabDocuments = useMemo(
    () => documents.filter((d) => documentMatchesFolder(d, folderTab)),
    [documents, folderTab],
  );

  const visibleDocuments = useMemo(() => {
    if (!scope) return tabDocuments;
    return tabDocuments.filter((d) => (d.folder_id ?? null) === (currentFolderId ?? null));
  }, [tabDocuments, scope, currentFolderId]);

  const bulkHomogeneousScope = useMemo(() => {
    const selectedDocs = visibleDocuments.filter((d) => selectedIds.has(d.id));
    return homogeneousFolderScopeForDocs(selectedDocs);
  }, [visibleDocuments, selectedIds]);

  const { data: bulkPhotosFolders = [] } = useJobDocumentFolders(
    jobId,
    folderTab === "all" && bulkHomogeneousScope === "photos" ? "photos" : null,
  );
  const { data: bulkDocsFolders = [] } = useJobDocumentFolders(
    jobId,
    folderTab === "all" && bulkHomogeneousScope === "documents" ? "documents" : null,
  );

  const foldersForBulkMove = useMemo(() => {
    if (folderTab === "photos") return jobFolders;
    if (folderTab === "documents") return jobFolders;
    if (folderTab === "all" && bulkHomogeneousScope === "photos") return bulkPhotosFolders;
    if (folderTab === "all" && bulkHomogeneousScope === "documents") return bulkDocsFolders;
    return [];
  }, [folderTab, jobFolders, bulkHomogeneousScope, bulkPhotosFolders, bulkDocsFolders]);

  const bulkMoveFolderOptions = useMemo(() => {
    return [...foldersForBulkMove]
      .map((f) => ({
        id: f.id,
        label: jobFolderLabelPath(f.id, foldersForBulkMove),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [foldersForBulkMove]);

  const selectedDocIds = useMemo(
    () => visibleDocuments.filter((d) => selectedIds.has(d.id)).map((d) => d.id),
    [visibleDocuments, selectedIds],
  );

  const canBulkMove =
    selectedDocIds.length > 0 &&
    (folderTab === "photos" ||
      folderTab === "documents" ||
      (folderTab === "all" && bulkHomogeneousScope !== null));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [folderTab, currentFolderId]);

  const childFolders = useMemo(() => {
    if (!scope) return [];
    return jobFolders.filter((f) => (f.parent_id ?? null) === (currentFolderId ?? null));
  }, [jobFolders, scope, currentFolderId]);

  const breadcrumbFolders = useMemo(
    () => jobFolderAncestors(currentFolderId, jobFolders),
    [currentFolderId, jobFolders],
  );

  const moveFolderOptions = useMemo(() => {
    if (!scope) return [];
    return [...jobFolders]
      .map((f) => ({
        id: f.id,
        label: jobFolderLabelPath(f.id, jobFolders),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [jobFolders, scope]);

  const showGlobalEmpty =
    documents.length === 0 && jobFolders.length === 0 && (folderTab === "all" || folderTab === "measurements");

  const uploadFiles = async (files: File[], type: Enums<"doc_type">) => {
    const folderId = scope ? currentFolderId ?? null : null;
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} exceeds 20MB limit`, variant: "destructive" });
        continue;
      }
      try {
        await uploadDoc.mutateAsync({
          file,
          jobId,
          type,
          uploadedBy: user?.id,
          folderId,
        });
        toast({ title: "Uploaded", description: file.name });
      } catch (err: unknown) {
        toast({ title: "Upload failed", description: formatSupabaseErr(err), variant: "destructive" });
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files), uploadType);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadDoc.isPending) return;
    setDragDepth((prev) => prev + 1);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadDoc.isPending) return;
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadDoc.isPending) return;
    setDragDepth((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next === 0) setIsDragging(false);
      return next;
    });
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragDepth(0);
    setIsDragging(false);
    if (uploadDoc.isPending) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length === 0) return;
    await uploadFiles(files, docTypeForDrop(folderTab));
  };

  const handleDelete = async (doc: Document) => {
    try {
      await deleteDoc.mutateAsync(doc);
      toast({ title: "Document deleted" });
    } catch (err: unknown) {
      toast({ title: "Error", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const submitNewFolder = async () => {
    if (!scope) return;
    const name = newFolderName.trim();
    if (!name) {
      toast({ title: "Enter a folder name", variant: "destructive" });
      return;
    }
    try {
      await createFolder.mutateAsync({
        jobId,
        parentId: currentFolderId,
        name,
        scope,
      });
      toast({ title: "Folder created" });
      setNewFolderOpen(false);
      setNewFolderName("");
    } catch (err: unknown) {
      toast({ title: "Could not create folder", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const submitRenameFolder = async () => {
    if (!renamingFolder || !scope) return;
    const name = renameFolderValue.trim();
    if (!name) {
      toast({ title: "Enter a name", variant: "destructive" });
      return;
    }
    try {
      await updateFolder.mutateAsync({
        id: renamingFolder.id,
        name,
        jobId,
        scope,
      });
      toast({ title: "Folder renamed" });
      setRenamingFolder(null);
    } catch (err: unknown) {
      toast({ title: "Could not rename", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const handleDeleteFolder = async (f: JobDocumentFolder) => {
    try {
      await deleteFolder.mutateAsync(f);
      toast({ title: "Folder deleted" });
      if (currentFolderId === f.id) setCurrentFolderId(null);
    } catch (err: unknown) {
      toast({ title: "Could not delete folder", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const moveDocumentTo = async (doc: Document, targetFolderId: string | null) => {
    if ((doc.folder_id ?? null) === (targetFolderId ?? null)) return;
    try {
      await updateDocument.mutateAsync({ id: doc.id, jobId, folderId: targetFolderId });
      toast({ title: "File moved" });
    } catch (err: unknown) {
      toast({ title: "Could not move file", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const submitRenameFile = async () => {
    if (!renamingFileDoc) return;
    const v = renameFileValue.trim();
    if (!v) {
      toast({ title: "Enter a name", variant: "destructive" });
      return;
    }
    try {
      await updateDocument.mutateAsync({ id: renamingFileDoc.id, jobId, fileName: v });
      if (previewPhotoDoc?.id === renamingFileDoc.id) {
        setPreviewPhotoDoc((d) => (d && d.id === renamingFileDoc.id ? { ...d, file_name: v } : d));
      }
      if (previewNonPhotoDoc?.id === renamingFileDoc.id) {
        setPreviewNonPhotoDoc((d) => (d && d.id === renamingFileDoc.id ? { ...d, file_name: v } : d));
      }
      toast({ title: "File renamed" });
      setRenamingFileDoc(null);
    } catch (err: unknown) {
      toast({ title: "Could not rename", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const toggleDocSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allVisibleSelected =
    visibleDocuments.length > 0 && visibleDocuments.every((d) => selectedIds.has(d.id));

  const moveDocumentsBulkTo = async (targetFolderId: string | null) => {
    if (selectedDocIds.length === 0) return;
    try {
      await moveDocumentsBulk.mutateAsync({ ids: selectedDocIds, jobId, folderId: targetFolderId });
      toast({ title: "Files moved", description: `${selectedDocIds.length} file(s) updated.` });
      clearSelection();
    } catch (err: unknown) {
      toast({ title: "Could not move files", description: formatSupabaseErr(err), variant: "destructive" });
    }
  };

  const showBulkRoot =
    canBulkMove &&
    visibleDocuments.some((d) => selectedIds.has(d.id) && d.folder_id != null);

  const listEmpty =
    !isLoading &&
    !isError &&
    !showGlobalEmpty &&
    childFolders.length === 0 &&
    visibleDocuments.length === 0 &&
    tabDocuments.length > 0;

  const tabEmpty =
    !isLoading && !isError && !showGlobalEmpty && tabDocuments.length === 0 && childFolders.length === 0;

  const dropHint =
    folderTab === "photos"
      ? "Photos"
      : folderTab === "measurements"
        ? "Meas."
        : folderTab === "documents"
          ? "Docs"
          : "Docs";

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" /> Job files
          <Badge variant="secondary" className="text-[10px]">
            {documents.length}
          </Badge>
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
        <p className="text-[10px] text-muted-foreground leading-snug">
          Press Ctrl or ⌘ and click a file card to multi-select. Use the checkboxes or Select all for bulk move.
        </p>

        {scope ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Breadcrumb className="min-w-0 text-xs">
              <BreadcrumbList className="flex-wrap">
                <BreadcrumbItem>
                  {breadcrumbFolders.length === 0 ? (
                    <BreadcrumbPage>Root</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <button type="button" className="hover:underline" onClick={() => setCurrentFolderId(null)}>
                        Root
                      </button>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {breadcrumbFolders.map((f, i) => (
                  <span key={f.id} className="flex items-center gap-1">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {i === breadcrumbFolders.length - 1 ? (
                        <BreadcrumbPage className="max-w-[10rem] truncate">{f.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            className="max-w-[8rem] truncate hover:underline"
                            onClick={() => setCurrentFolderId(f.id)}
                          >
                            {f.name}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs"
              onClick={() => {
                setNewFolderName("");
                setNewFolderOpen(true);
              }}
            >
              <FolderPlus className="mr-1 h-3.5 w-3.5" />
              New folder
            </Button>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          accept="application/pdf,.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp"
        />
        <div
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          } ${uploadDoc.isPending ? "cursor-not-allowed opacity-70" : ""}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => void handleDrop(e)}
        >
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {isDragging ? "Drop files to upload" : "Drag and drop files here"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active tab upload target: {dropHint}
            {scope && currentFolderId ? ` · ${jobFolderLabelPath(currentFolderId, jobFolders)}` : ""}
          </p>
        </div>

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
        ) : showGlobalEmpty ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Drop files above or upload contracts, invoices, photos, or measurement PDFs
            </p>
          </div>
        ) : tabEmpty ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nothing in this tab</p>
            <p className="text-xs text-muted-foreground mt-1">Switch tabs, drop files above, or upload with the type dropdown</p>
          </div>
        ) : listEmpty ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg">
            <Folder className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nothing in this folder</p>
            <p className="text-xs text-muted-foreground mt-1">Open a subfolder above, upload files here, or go up to Root</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDocuments.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-fit text-xs"
                  onClick={() => {
                    if (allVisibleSelected) clearSelection();
                    else setSelectedIds(new Set(visibleDocuments.map((d) => d.id)));
                  }}
                >
                  {allVisibleSelected ? "Deselect all" : `Select all (${visibleDocuments.length})`}
                </Button>
                {selectedDocIds.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedDocIds.length} selected
                      {folderTab === "all" && !canBulkMove ? (
                        <span className="block sm:inline sm:ml-1 text-amber-700 dark:text-amber-500">
                          — select only photos or only documents to move as a group.
                        </span>
                      ) : null}
                      {folderTab === "measurements" ? (
                        <span className="block sm:inline sm:ml-1 text-muted-foreground">
                          — folders are not used on the Measurements tab.
                        </span>
                      ) : null}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={clearSelection}>
                        Clear
                      </Button>
                      {canBulkMove ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs"
                              disabled={moveDocumentsBulk.isPending}
                            >
                              {moveDocumentsBulk.isPending ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : null}
                              Move to…
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="max-h-56 overflow-y-auto">
                            {showBulkRoot ? (
                              <DropdownMenuItem onClick={() => void moveDocumentsBulkTo(null)}>Root</DropdownMenuItem>
                            ) : null}
                            {showBulkRoot && bulkMoveFolderOptions.length > 0 ? <DropdownMenuSeparator /> : null}
                            {bulkMoveFolderOptions.map((o) => (
                              <DropdownMenuItem key={o.id} onClick={() => void moveDocumentsBulkTo(o.id)}>
                                {o.label}
                              </DropdownMenuItem>
                            ))}
                            {!showBulkRoot && bulkMoveFolderOptions.length === 0 ? (
                              <DropdownMenuItem disabled>No folders yet — create one in Photos or Docs</DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {childFolders.map((f) => (
                <div
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-muted/30"
                  onClick={() => setCurrentFolderId(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCurrentFolderId(f.id);
                    }
                  }}
                >
                  <div className="flex aspect-square items-center justify-center bg-muted/50">
                    <Folder className="h-12 w-12 text-primary" />
                  </div>
                  <div className="flex items-start gap-1 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">Folder</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-70 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingFolder(f);
                            setRenameFolderValue(f.name);
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => void handleDeleteFolder(f)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {visibleDocuments.map((doc) => {
                const openDocumentInNewTab = async () => {
                  try {
                    await openFileViaProxy("job-documents", doc.file_path);
                  } catch {
                    toast({ title: "Error", description: "Could not open file", variant: "destructive" });
                  }
                };
                const selected = selectedIds.has(doc.id);
                return (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-muted/20",
                      selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toggleDocSelected(doc.id);
                        return;
                      }
                      if (doc.type === "photo") {
                        setPreviewPhotoDoc(doc);
                        return;
                      }
                      setPreviewNonPhotoDoc(doc);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (e.ctrlKey || e.metaKey) toggleDocSelected(doc.id);
                        else if (doc.type === "photo") setPreviewPhotoDoc(doc);
                        else setPreviewNonPhotoDoc(doc);
                      }
                    }}
                  >
                    <div className="relative">
                      <DocumentPreview doc={doc} />
                      <div
                        className="absolute left-2 top-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected}
                          className="border-border bg-background/95 shadow-sm data-[state=checked]:bg-primary"
                          onCheckedChange={() => toggleDocSelected(doc.id)}
                          aria-label={`Select ${doc.file_name}`}
                        />
                      </div>
                    </div>
                    <div className="flex min-h-[5rem] flex-1 flex-col gap-1 p-2">
                      <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">{doc.file_name}</p>
                      <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
                          {TYPE_LABELS[doc.type] ?? doc.type}
                        </Badge>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span title={format(new Date(doc.created_at), "PPp")}>
                          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {scope && doc.folder_id ? (
                        <p
                          className="truncate text-[10px] text-muted-foreground"
                          title={jobFolderLabelPath(doc.folder_id, jobFolders)}
                        >
                          in {jobFolderLabelPath(doc.folder_id, jobFolders)}
                        </p>
                      ) : null}
                      <div
                        className="flex justify-end gap-0.5 pt-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenamingFileDoc(doc);
                                setRenameFileValue(doc.file_name);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Rename
                            </DropdownMenuItem>
                            {scope ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>Move to…</DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent
                                    className="max-h-56 overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {doc.folder_id ? (
                                      <DropdownMenuItem onClick={() => void moveDocumentTo(doc, null)}>Root</DropdownMenuItem>
                                    ) : null}
                                    {doc.folder_id ? <DropdownMenuSeparator /> : null}
                                    {moveFolderOptions
                                      .filter((o) => o.id !== doc.folder_id)
                                      .map((o) => (
                                        <DropdownMenuItem key={o.id} onClick={() => void moveDocumentTo(doc, o.id)}>
                                          {o.label}
                                        </DropdownMenuItem>
                                      ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            void openDocumentInNewTab();
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Dialog
          open={!!previewPhotoDoc}
          onOpenChange={(open) => {
            if (!open) setPreviewPhotoDoc(null);
          }}
        >
          <DialogContent className="!flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto overscroll-contain p-6">
            {previewPhotoDoc ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 pr-8">
                    <Image className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{previewPhotoDoc.file_name}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {TYPE_LABELS[previewPhotoDoc.type] ?? previewPhotoDoc.type}
                    </Badge>
                    <span>{formatFileSize(previewPhotoDoc.file_size)}</span>
                    <span title={format(new Date(previewPhotoDoc.created_at), "PPp")}>
                      {formatDistanceToNow(new Date(previewPhotoDoc.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Annotate and AI damage tools use photos in the <strong className="font-medium text-foreground">SiteCam</strong> tab.
                    Job Files keeps copies next to contracts and PDFs.
                  </p>
                  <div className="flex max-h-[min(55vh,600px)] w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!previewPhotoDoc}
                      onClick={() => {
                        if (previewPhotoDoc) {
                          void openFileViaProxy("job-documents", previewPhotoDoc.file_path).catch(() =>
                            toast({ title: "Error", description: "Could not open file", variant: "destructive" }),
                          );
                        }
                      }}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Open in new tab
                    </Button>
                    <AiDamageAnalyzeUrlButton imageUrl={photoPreviewUrl} />
                    {onGoToSiteCam ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onGoToSiteCam();
                          setPreviewPhotoDoc(null);
                        }}
                      >
                        <Camera className="mr-1 h-3.5 w-3.5" />
                        Go to SiteCam
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!previewNonPhotoDoc}
          onOpenChange={(open) => {
            if (!open) setPreviewNonPhotoDoc(null);
          }}
        >
          <DialogContent className="!flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto overscroll-contain p-6">
            {previewNonPhotoDoc ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 pr-8">
                    {(() => {
                      const Icon = TYPE_ICONS[previewNonPhotoDoc.type] || File;
                      return <Icon className="h-4 w-4 shrink-0" aria-hidden />;
                    })()}
                    <span className="truncate">{previewNonPhotoDoc.file_name}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {TYPE_LABELS[previewNonPhotoDoc.type] ?? previewNonPhotoDoc.type}
                    </Badge>
                    <span>{formatFileSize(previewNonPhotoDoc.file_size)}</span>
                    <span title={format(new Date(previewNonPhotoDoc.created_at), "PPp")}>
                      {formatDistanceToNow(new Date(previewNonPhotoDoc.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {(() => {
                    const kind = documentPreviewKind(previewNonPhotoDoc);
                    if ((kind === "pdf" || kind === "image") && !nonPhotoPreviewUrl) {
                      return (
                        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-muted">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      );
                    }
                    if (kind === "pdf" && nonPhotoPreviewUrl) {
                      return (
                        <div className="w-full overflow-hidden rounded-lg bg-muted" style={{ height: "min(55vh, 600px)" }}>
                          <iframe title={previewNonPhotoDoc.file_name} src={nonPhotoPreviewUrl} className="h-full w-full border-0" />
                        </div>
                      );
                    }
                    if (kind === "image" && nonPhotoPreviewUrl) {
                      return (
                        <div className="flex max-h-[min(55vh,600px)] w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
                          <img src={nonPhotoPreviewUrl} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                      );
                    }
                    const Icon = TYPE_ICONS[previewNonPhotoDoc.type] || File;
                    return (
                      <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg bg-muted gap-2">
                        <Icon className="h-16 w-16 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!previewNonPhotoDoc}
                      onClick={() => {
                        if (previewNonPhotoDoc) {
                          void openFileViaProxy("job-documents", previewNonPhotoDoc.file_path).catch(() =>
                            toast({ title: "Error", description: "Could not open file", variant: "destructive" }),
                          );
                        }
                      }}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Open in new tab
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
          <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-job-folder-name">Name</Label>
              <Input
                id="new-job-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitNewFolder();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitNewFolder()} disabled={createFolder.isPending}>
                {createFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!renamingFileDoc} onOpenChange={(o) => !o && setRenamingFileDoc(null)}>
          <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Rename file</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rename-job-file-name">Title / file name</Label>
              <Input
                id="rename-job-file-name"
                value={renameFileValue}
                onChange={(e) => setRenameFileValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitRenameFile();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setRenamingFileDoc(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitRenameFile()} disabled={updateDocument.isPending}>
                {updateDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!renamingFolder} onOpenChange={(o) => !o && setRenamingFolder(null)}>
          <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Rename folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rename-job-folder-name">Name</Label>
              <Input
                id="rename-job-folder-name"
                value={renameFolderValue}
                onChange={(e) => setRenameFolderValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitRenameFolder();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setRenamingFolder(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitRenameFolder()} disabled={updateFolder.isPending}>
                {updateFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
