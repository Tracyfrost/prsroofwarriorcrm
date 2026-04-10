import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  useSiteCamMedia,
  useUploadSiteCamMedia,
  useDeleteSiteCamMedia,
  useUpdateSiteCamMedia,
  useMediaUrl,
  useSiteCamFolders,
  useCreateSiteCamFolder,
  useUpdateSiteCamFolder,
  useDeleteSiteCamFolder,
  type SiteCamMedia,
  type SiteCamFolder,
} from "@/hooks/useSiteCam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  Upload,
  Grid3X3,
  List,
  Trash2,
  Tag,
  Eye,
  Pencil,
  Image as ImageIcon,
  Video,
  Loader2,
  X,
  MessageSquare,
  Folder,
  MoreVertical,
  FolderPlus,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { AnnotationEditor } from "./AnnotationEditor";
import { SiteCamCapture } from "./SiteCamCapture";
import { AiDamageButton } from "./AiDamageButton";
import { cn } from "@/lib/utils";

interface SiteCamGalleryProps {
  jobId: string;
}

const ROOT_VALUE = "__root__";

/** HTML5 drag type for moving media between folders (desktop). */
const SITECAM_MEDIA_DRAG_TYPE = "application/x-sitecam-media-id";

function dataTransferHasSiteCamMedia(types: DataTransfer["types"]): boolean {
  if (!types || types.length === 0) return false;
  return Array.from(types as unknown as string[]).includes(SITECAM_MEDIA_DRAG_TYPE);
}

function folderPathSegments(currentFolderId: string | null, folders: SiteCamFolder[]): SiteCamFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const segments: SiteCamFolder[] = [];
  let id: string | null = currentFolderId;
  while (id) {
    const f = byId.get(id);
    if (!f) break;
    segments.unshift(f);
    id = f.parent_id;
  }
  return segments;
}

function folderBreadcrumbLabel(folderId: string, folders: SiteCamFolder[]): string {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let id: string | null = folderId;
  while (id) {
    const f = byId.get(id);
    if (!f) break;
    parts.unshift(f.name);
    id = f.parent_id;
  }
  return parts.join(" / ");
}

export function SiteCamGallery({ jobId }: SiteCamGalleryProps) {
  const { data: media = [], isLoading } = useSiteCamMedia(jobId);
  const { data: folders = [] } = useSiteCamFolders(jobId);
  const uploadMedia = useUploadSiteCamMedia();
  const deleteMedia = useDeleteSiteCamMedia();
  const createFolder = useCreateSiteCamFolder();
  const updateFolder = useUpdateSiteCamFolder();
  const deleteFolder = useDeleteSiteCamFolder();
  const updateSiteCamMedia = useUpdateSiteCamMedia();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SiteCamMedia | null>(null);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [annotatingMedia, setAnnotatingMedia] = useState<SiteCamMedia | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<SiteCamFolder | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");

  const [moveMediaOpen, setMoveMediaOpen] = useState(false);
  const [movingMedia, setMovingMedia] = useState<SiteCamMedia | null>(null);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>(ROOT_VALUE);

  const folderPath = useMemo(
    () => folderPathSegments(currentFolderId, folders),
    [currentFolderId, folders],
  );

  const childFolders = useMemo(
    () => folders.filter((f) => (f.parent_id ?? null) === (currentFolderId ?? null)),
    [folders, currentFolderId],
  );

  const filteredByFolder = useMemo(
    () =>
      media.filter((m) => {
        const fid = m.folder_id ?? null;
        return fid === (currentFolderId ?? null);
      }),
    [media, currentFolderId],
  );

  const filtered = filterTag ? filteredByFolder.filter((m) => m.tags?.includes(filterTag)) : filteredByFolder;

  const handleFileUpload = useCallback(
    async (files: FileList | null, folderIdOverride?: string | null) => {
      if (!files || files.length === 0) return;
      const targetFolder = folderIdOverride !== undefined ? folderIdOverride : currentFolderId;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const type = file.type.startsWith("video/") ? "video" : "photo";
          await uploadMedia.mutateAsync({
            jobId,
            file,
            type: type as "photo" | "video",
            folderId: targetFolder ?? null,
          });
        }
        toast({ title: `${files.length} file(s) uploaded` });
      } catch (e: any) {
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [jobId, uploadMedia, toast, currentFolderId],
  );

  const handleCapturedPhoto = useCallback(
    async (blob: Blob) => {
      setShowCapture(false);
      setUploading(true);
      try {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        await uploadMedia.mutateAsync({
          jobId,
          file,
          type: "photo",
          folderId: currentFolderId ?? null,
        });
        toast({ title: "Photo captured & uploaded" });
      } catch (e: any) {
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [jobId, uploadMedia, toast, currentFolderId],
  );

  const handleDelete = useCallback(
    async (item: SiteCamMedia) => {
      try {
        await deleteMedia.mutateAsync({
          id: item.id,
          jobId: item.job_id,
          originalPath: item.original_path,
          annotatedPath: item.annotated_path,
          thumbnailPath: item.thumbnail_path,
        });
        setSelectedMedia(null);
        toast({ title: "Media deleted" });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
    [deleteMedia, toast],
  );

  const onCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder.mutateAsync({
        jobId,
        name,
        parentId: currentFolderId,
      });
      setNewFolderName("");
      setNewFolderOpen(false);
      toast({ title: "Folder created" });
    } catch (e: any) {
      toast({ title: "Could not create folder", description: e.message, variant: "destructive" });
    }
  };

  const openRenameFolder = (f: SiteCamFolder) => {
    setRenamingFolder(f);
    setRenameFolderValue(f.name);
    setRenameFolderOpen(true);
  };

  const onSaveRenameFolder = async () => {
    if (!renamingFolder) return;
    try {
      await updateFolder.mutateAsync({ id: renamingFolder.id, name: renameFolderValue });
      setRenameFolderOpen(false);
      setRenamingFolder(null);
      toast({ title: "Folder renamed" });
    } catch (e: any) {
      toast({ title: "Rename failed", description: e.message, variant: "destructive" });
    }
  };

  const onDeleteFolder = async (f: SiteCamFolder) => {
    try {
      await deleteFolder.mutateAsync({ id: f.id, jobId });
      toast({ title: "Folder deleted" });
      if (currentFolderId === f.id) setCurrentFolderId(f.parent_id);
    } catch (e: any) {
      toast({ title: "Could not delete folder", description: e.message, variant: "destructive" });
    }
  };

  const openMoveMedia = (m: SiteCamMedia) => {
    setMovingMedia(m);
    setMoveTargetFolder(m.folder_id ?? ROOT_VALUE);
    setMoveMediaOpen(true);
  };

  const performMediaMove = useCallback(
    async (mediaId: string, targetFolderId: string | null) => {
      const m = media.find((x) => x.id === mediaId);
      if (!m) return;
      if ((m.folder_id ?? null) === targetFolderId) return;
      try {
        await updateSiteCamMedia.mutateAsync({ id: mediaId, folder_id: targetFolderId });
        toast({ title: "Moved" });
      } catch (e: any) {
        toast({ title: "Move failed", description: e.message, variant: "destructive" });
      }
    },
    [media, updateSiteCamMedia, toast],
  );

  const allTags = [...new Set(media.flatMap((m) => m.tags || []))];

  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      if (dataTransferHasSiteCamMedia(e.dataTransfer.types) || e.dataTransfer.types?.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = dataTransferHasSiteCamMedia(e.dataTransfer.types) ? "move" : "copy";
      }
    },
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.types?.includes("Files") || dataTransferHasSiteCamMedia(e.dataTransfer.types)) {
        setIsFileOver(true);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      const related = e.relatedTarget as Node | null;
      if (!e.currentTarget.contains(related)) setIsFileOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsFileOver(false);
      const mediaId = e.dataTransfer.getData(SITECAM_MEDIA_DRAG_TYPE);
      if (mediaId) {
        void performMediaMove(mediaId, currentFolderId ?? null);
        return;
      }
      const list = e.dataTransfer.files;
      if (list?.length) void handleFileUpload(list);
    },
  };

  const showEmpty = !isLoading && childFolders.length === 0 && filtered.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            {folderPath.length === 0 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>Gallery</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      className="cursor-pointer bg-transparent border-0 p-0 font-inherit"
                      onClick={() => setCurrentFolderId(null)}
                      onDragOver={(e) => {
                        if (dataTransferHasSiteCamMedia(e.dataTransfer.types)) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      }}
                      onDrop={(e) => {
                        const mediaId = e.dataTransfer.getData(SITECAM_MEDIA_DRAG_TYPE);
                        if (!mediaId) return;
                        e.preventDefault();
                        void performMediaMove(mediaId, null);
                      }}
                    >
                      Gallery
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {folderPath.map((seg, i) => {
                  const isLast = i === folderPath.length - 1;
                  return (
                    <React.Fragment key={seg.id}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{seg.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <button
                              type="button"
                              className="cursor-pointer bg-transparent border-0 p-0 font-inherit"
                              onClick={() => setCurrentFolderId(seg.id)}
                            >
                              {seg.name}
                            </button>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCapture(true)} className="gap-1.5">
            <Camera className="h-4 w-4" /> Capture
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)} className="gap-1.5">
            <FolderPlus className="h-4 w-4" /> New folder
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
        <div className="flex items-center gap-2">
          {allTags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {filterTag && (
                <Badge variant="secondary" className="cursor-pointer text-xs gap-1" onClick={() => setFilterTag("")}>
                  {filterTag} <X className="h-3 w-3" />
                </Badge>
              )}
              {!filterTag &&
                allTags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline" className="cursor-pointer text-xs" onClick={() => setFilterTag(tag)}>
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "timeline" : "grid")}>
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border border-dashed border-transparent transition-colors min-h-[120px]",
          isFileOver && "border-primary/60 bg-primary/5",
        )}
        {...dragProps}
      >
        <p className="text-xs text-muted-foreground px-1 pb-2">
          Drag files from your computer here or into a folder to upload. Drag media by the grip handle onto a folder or this area to move (desktop). Use the menu on touch devices.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showEmpty ? (
          <Card className="shadow-card border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Camera className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No photos or folders here yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                Create a folder, capture a photo, upload files, or drop images and videos from your desktop.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap justify-center">
                <Button size="sm" onClick={() => setNewFolderOpen(true)}>
                  <FolderPlus className="mr-1 h-3.5 w-3.5" /> New folder
                </Button>
                <Button size="sm" onClick={() => setShowCapture(true)}>
                  <Camera className="mr-1 h-3.5 w-3.5" /> Take Photo
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {childFolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {childFolders.map((f) => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    mediaCount={media.filter((m) => m.folder_id === f.id).length}
                    onOpen={() => setCurrentFolderId(f.id)}
                    onRename={() => openRenameFolder(f)}
                    onDelete={() => onDeleteFolder(f)}
                    onDropFiles={(files) => handleFileUpload(files, f.id)}
                    onMoveMediaHere={(mediaId) => void performMediaMove(mediaId, f.id)}
                  />
                ))}
              </div>
            )}

            {filtered.length > 0 &&
              (viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filtered.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedMedia(item)}
                      onMove={() => openMoveMedia(item)}
                      dragType={SITECAM_MEDIA_DRAG_TYPE}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((item) => (
                    <TimelineRow
                      key={item.id}
                      item={item}
                      folders={folders}
                      onClick={() => setSelectedMedia(item)}
                      onMove={() => openMoveMedia(item)}
                      dragType={SITECAM_MEDIA_DRAG_TYPE}
                    />
                  ))}
                </div>
              ))}

            {childFolders.length > 0 && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No media in this folder. Upload or drop files above.</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sitecam-folder-name">Name</Label>
            <Input
              id="sitecam-folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Front elevation"
              onKeyDown={(e) => e.key === "Enter" && onCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreateFolder()} disabled={createFolder.isPending}>
              {createFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sitecam-rename-folder">Name</Label>
            <Input
              id="sitecam-rename-folder"
              value={renameFolderValue}
              onChange={(e) => setRenameFolderValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void onSaveRenameFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSaveRenameFolder()} disabled={updateFolder.isPending}>
              {updateFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveMediaOpen} onOpenChange={setMoveMediaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Destination</Label>
            <Select value={moveTargetFolder} onValueChange={setMoveTargetFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Choose folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_VALUE}>Gallery root</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {folderBreadcrumbLabel(f.id, folders)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveMediaOpen(false)}>
              Cancel
            </Button>
            <MoveMediaButton
              movingMedia={movingMedia}
              moveTargetFolder={moveTargetFolder}
              onDone={() => {
                setMoveMediaOpen(false);
                setMovingMedia(null);
                toast({ title: "Moved" });
              }}
              onError={(msg) => toast({ title: "Move failed", description: msg, variant: "destructive" })}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {selectedMedia && (
            <MediaDetail
              media={selectedMedia}
              onDelete={handleDelete}
              onAnnotate={(m) => {
                setAnnotatingMedia(m);
                setShowAnnotationEditor(true);
                setSelectedMedia(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCapture} onOpenChange={setShowCapture}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <SiteCamCapture onCapture={handleCapturedPhoto} onClose={() => setShowCapture(false)} />
        </DialogContent>
      </Dialog>

      {showAnnotationEditor && annotatingMedia && (
        <AnnotationEditor
          media={annotatingMedia}
          onClose={() => {
            setShowAnnotationEditor(false);
            setAnnotatingMedia(null);
          }}
        />
      )}
    </div>
  );
}

function MoveMediaButton({
  movingMedia,
  moveTargetFolder,
  onDone,
  onError,
}: {
  movingMedia: SiteCamMedia | null;
  moveTargetFolder: string;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const updateMedia = useUpdateSiteCamMedia();
  const handle = async () => {
    if (!movingMedia) return;
    const next = moveTargetFolder === ROOT_VALUE ? null : moveTargetFolder;
    if ((movingMedia.folder_id ?? null) === next) {
      onDone();
      return;
    }
    try {
      await updateMedia.mutateAsync({ id: movingMedia.id, folder_id: next });
      onDone();
    } catch (e: any) {
      onError(e.message ?? "Unknown error");
    }
  };
  return (
    <Button onClick={() => void handle()} disabled={updateMedia.isPending}>
      {updateMedia.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move"}
    </Button>
  );
}

function FolderCard({
  folder,
  mediaCount,
  onOpen,
  onRename,
  onDelete,
  onDropFiles,
  onMoveMediaHere,
}: {
  folder: SiteCamFolder;
  mediaCount: number;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDropFiles: (files: FileList) => void;
  onMoveMediaHere: (mediaId: string) => void;
}) {
  const [over, setOver] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      onClick={onOpen}
      onDragOver={(e) => {
        const files = e.dataTransfer.types?.includes("Files");
        const mediaDrag = dataTransferHasSiteCamMedia(e.dataTransfer.types);
        if (!files && !mediaDrag) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = mediaDrag ? "move" : "copy";
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types?.includes("Files") || dataTransferHasSiteCamMedia(e.dataTransfer.types)) {
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        const related = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(related)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const mediaId = e.dataTransfer.getData(SITECAM_MEDIA_DRAG_TYPE);
        if (mediaId) {
          onMoveMediaHere(mediaId);
          return;
        }
        if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center aspect-square rounded-lg border bg-muted/40 cursor-pointer hover:border-primary/50 transition-colors",
        over && "border-primary ring-2 ring-primary/20 bg-primary/5",
      )}
    >
      <Folder className="h-12 w-12 text-primary/70 mb-2" />
      <p className="text-sm font-medium truncate max-w-[90%] px-1">{folder.name}</p>
      <p className="text-[10px] text-muted-foreground">{mediaCount} item{mediaCount !== 1 ? "s" : ""}</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="icon" className="absolute top-1.5 right-1.5 h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Only empty folders can be deleted. Subfolders and photos must be moved or removed first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MediaCard({
  item,
  onClick,
  onMove,
  dragType,
}: {
  item: SiteCamMedia;
  onClick: () => void;
  onMove: () => void;
  dragType: string;
}) {
  const url = useMediaUrl(item.annotated_path || item.original_path);
  const title = item.caption?.trim() || "Untitled";
  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all">
      <button type="button" onClick={onClick} className="absolute inset-0 z-0 cursor-pointer" aria-label={`Open ${title}`} />
      {item.type === "photo" ? (
        url ? (
          <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted pointer-events-none">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white text-xs truncate">{title}</p>
          <p className="text-white/70 text-[10px]">{format(new Date(item.uploaded_at), "MMM d")}</p>
        </div>
      </div>
      {item.annotated_path && (
        <div className="absolute top-1.5 right-[5.5rem] pointer-events-none">
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            <Pencil className="h-2.5 w-2.5" />
          </Badge>
        </div>
      )}
      {item.tags?.length > 0 && (
        <div className="absolute top-1.5 left-1.5 pointer-events-none">
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            {item.tags.length} tags
          </Badge>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drag to move to folder"
        draggable
        className="absolute top-1.5 right-10 z-10 flex h-8 w-8 cursor-grab active:cursor-grabbing items-center justify-center rounded-md bg-secondary/90 text-muted-foreground shadow-sm hover:bg-secondary"
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData(dragType, item.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-1.5 right-1.5 h-8 w-8 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onMove}>Move to folder…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function TimelineRow({
  item,
  folders,
  onClick,
  onMove,
  dragType,
}: {
  item: SiteCamMedia;
  folders: SiteCamFolder[];
  onClick: () => void;
  onMove: () => void;
  dragType: string;
}) {
  const url = useMediaUrl(item.annotated_path || item.original_path);
  const title = item.caption?.trim() || "Untitled";
  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors relative">
      <button type="button" onClick={onClick} className="flex gap-3 flex-1 min-w-0 text-left">
        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {item.type === "photo" ? (
            url ? (
              <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(item.uploaded_at), "MMM d, yyyy h:mm a")}</p>
          {item.folder_id && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              In {folderBreadcrumbLabel(item.folder_id, folders)}
            </p>
          )}
          <div className="flex gap-1 mt-1.5">
            {item.tags?.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </button>
      <div
        role="button"
        tabIndex={0}
        aria-label="Drag to move to folder"
        draggable
        className="flex h-9 w-9 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData(dragType, item.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onMove}>Move to folder…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MediaDetail({
  media,
  onDelete,
  onAnnotate,
}: {
  media: SiteCamMedia;
  onDelete: (m: SiteCamMedia) => void;
  onAnnotate: (m: SiteCamMedia) => void;
}) {
  const imgUrl = useMediaUrl(media.annotated_path || media.original_path);
  const origUrl = useMediaUrl(media.original_path);
  const updateMedia = useUpdateSiteCamMedia();
  const { toast } = useToast();
  const [titleDraft, setTitleDraft] = useState(media.caption || "");

  useEffect(() => {
    setTitleDraft(media.caption || "");
  }, [media.id, media.caption]);

  const saveTitle = async () => {
    const v = titleDraft.trim();
    try {
      await updateMedia.mutateAsync({ id: media.id, caption: v || null });
      toast({ title: "Title updated" });
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  const displayTitle = media.caption?.trim() || "Untitled";

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {media.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          {displayTitle}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sitecam-media-title">Title / file name</Label>
          <div className="flex gap-2 flex-wrap">
            <Input
              id="sitecam-media-title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="max-w-md"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => void saveTitle()} disabled={updateMedia.isPending}>
              {updateMedia.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save title"}
            </Button>
          </div>
        </div>
        {media.type === "photo" ? (
          imgUrl ? (
            <img src={imgUrl} alt={displayTitle} className="w-full rounded-lg" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          )
        ) : origUrl ? (
          <video src={origUrl} controls className="w-full rounded-lg" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">
            {media.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{format(new Date(media.uploaded_at), "MMM d, yyyy h:mm a")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {media.type === "photo" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onAnnotate(media)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Annotate
              </Button>
              <AiDamageButton media={media} />
            </>
          )}
          {origUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={origUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-1 h-3.5 w-3.5" /> Original
              </a>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this media?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove this file.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(media)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {((media.comments as any[]) || []).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Comments
            </p>
            {((media.comments as any[]) || []).map((c: any, i: number) => (
              <div key={i} className="text-sm bg-muted p-2 rounded">
                <p>{c.text}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(c.timestamp), "MMM d h:mm a")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
