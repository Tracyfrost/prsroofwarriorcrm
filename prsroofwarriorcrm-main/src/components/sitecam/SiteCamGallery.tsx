import { useState, useRef, useCallback } from "react";
import { useSiteCamMedia, useUploadSiteCamMedia, useDeleteSiteCamMedia, useMediaUrl, type SiteCamMedia } from "@/hooks/useSiteCam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Grid3X3, List, Trash2, Tag, Eye, Pencil, Share2, Image as ImageIcon, Video, Loader2, X, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { AnnotationEditor } from "./AnnotationEditor";
import { SiteCamCapture } from "./SiteCamCapture";
import { AiDamageButton } from "./AiDamageButton";

interface SiteCamGalleryProps {
  jobId: string;
}

export function SiteCamGallery({ jobId }: SiteCamGalleryProps) {
  const { data: media = [], isLoading } = useSiteCamMedia(jobId);
  const uploadMedia = useUploadSiteCamMedia();
  const deleteMedia = useDeleteSiteCamMedia();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [selectedMedia, setSelectedMedia] = useState<SiteCamMedia | null>(null);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [annotatingMedia, setAnnotatingMedia] = useState<SiteCamMedia | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const type = file.type.startsWith("video/") ? "video" : "photo";
        await uploadMedia.mutateAsync({ jobId, file, type: type as "photo" | "video" });
      }
      toast({ title: `${files.length} file(s) uploaded` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [jobId, uploadMedia, toast]);

  const handleCapturedPhoto = useCallback(async (blob: Blob) => {
    setShowCapture(false);
    setUploading(true);
    try {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadMedia.mutateAsync({ jobId, file, type: "photo" });
      toast({ title: "Photo captured & uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [jobId, uploadMedia, toast]);

  const handleDelete = useCallback(async (item: SiteCamMedia) => {
    try {
      await deleteMedia.mutateAsync({ id: item.id, jobId: item.job_id, originalPath: item.original_path });
      setSelectedMedia(null);
      toast({ title: "Media deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }, [deleteMedia, toast]);

  const allTags = [...new Set(media.flatMap(m => m.tags || []))];
  const filtered = filterTag
    ? media.filter(m => m.tags?.includes(filterTag))
    : media;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCapture(true)} className="gap-1.5">
            <Camera className="h-4 w-4" /> Capture
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
        </div>
        <div className="flex items-center gap-2">
          {allTags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {filterTag && (
                <Badge variant="secondary" className="cursor-pointer text-xs gap-1" onClick={() => setFilterTag("")}>
                  {filterTag} <X className="h-3 w-3" />
                </Badge>
              )}
              {!filterTag && allTags.slice(0, 5).map(tag => (
                <Badge key={tag} variant="outline" className="cursor-pointer text-xs" onClick={() => setFilterTag(tag)}>
                  <Tag className="h-3 w-3 mr-1" />{tag}
                </Badge>
              ))}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "timeline" : "grid")}>
            {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Gallery */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Camera className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No photos yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Capture a photo or upload files to get started</p>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => setShowCapture(true)}>
                <Camera className="mr-1 h-3.5 w-3.5" /> Take Photo
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1 h-3.5 w-3.5" /> Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} onClick={() => setSelectedMedia(item)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <TimelineRow key={item.id} item={item} onClick={() => setSelectedMedia(item)} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {selectedMedia && <MediaDetail media={selectedMedia} onDelete={handleDelete} onAnnotate={(m) => { setAnnotatingMedia(m); setShowAnnotationEditor(true); setSelectedMedia(null); }} />}
        </DialogContent>
      </Dialog>

      {/* Camera Capture */}
      <Dialog open={showCapture} onOpenChange={setShowCapture}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <SiteCamCapture onCapture={handleCapturedPhoto} onClose={() => setShowCapture(false)} />
        </DialogContent>
      </Dialog>

      {/* Annotation Editor */}
      {showAnnotationEditor && annotatingMedia && (
        <AnnotationEditor media={annotatingMedia} onClose={() => { setShowAnnotationEditor(false); setAnnotatingMedia(null); }} />
      )}
    </div>
  );
}

function MediaDetail({ media, onDelete, onAnnotate }: { media: SiteCamMedia; onDelete: (m: SiteCamMedia) => void; onAnnotate: (m: SiteCamMedia) => void }) {
  const imgUrl = useMediaUrl(media.annotated_path || media.original_path);
  const origUrl = useMediaUrl(media.original_path);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {media.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          {media.caption || "Media"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {media.type === "photo" ? (
          imgUrl ? <img src={imgUrl} alt={media.caption || "Photo"} className="w-full rounded-lg" /> : <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        ) : (
          origUrl ? <video src={origUrl} controls className="w-full rounded-lg" /> : <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">
            {media.tags?.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
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
              <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
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
            <p className="text-sm font-medium flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Comments</p>
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

function MediaCard({ item, onClick }: { item: SiteCamMedia; onClick: () => void }) {
  const url = useMediaUrl(item.annotated_path || item.original_path);
  return (
    <div onClick={onClick} className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border border-border hover:border-primary/50 transition-all">
      {item.type === "photo" ? (
        url ? <img src={url} alt={item.caption || ""} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted"><Video className="h-8 w-8 text-muted-foreground" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-2 left-2 right-2">
          {item.caption && <p className="text-white text-xs truncate">{item.caption}</p>}
          <p className="text-white/70 text-[10px]">{format(new Date(item.uploaded_at), "MMM d")}</p>
        </div>
      </div>
      {item.annotated_path && (
        <div className="absolute top-1.5 right-1.5">
          <Badge variant="secondary" className="text-[9px] px-1 py-0"><Pencil className="h-2.5 w-2.5" /></Badge>
        </div>
      )}
      {item.tags?.length > 0 && (
        <div className="absolute top-1.5 left-1.5">
          <Badge variant="secondary" className="text-[9px] px-1 py-0">{item.tags.length} tags</Badge>
        </div>
      )}
    </div>
  );
}

function TimelineRow({ item, onClick }: { item: SiteCamMedia; onClick: () => void }) {
  const url = useMediaUrl(item.annotated_path || item.original_path);
  return (
    <div onClick={onClick} className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {item.type === "photo" ? (
          url ? <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Video className="h-6 w-6 text-muted-foreground" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.caption || "Untitled"}</p>
        <p className="text-xs text-muted-foreground">{format(new Date(item.uploaded_at), "MMM d, yyyy h:mm a")}</p>
        <div className="flex gap-1 mt-1.5">
          {item.tags?.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
        </div>
      </div>
    </div>
  );
}
