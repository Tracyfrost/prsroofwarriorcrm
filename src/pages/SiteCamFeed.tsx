import { useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useSiteCamFeed, useMediaUrl, type SiteCamMedia } from "@/hooks/useSiteCam";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Video, Image as ImageIcon, Search, Tag, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnnotationEditor } from "@/components/sitecam/AnnotationEditor";

export default function SiteCamFeed() {
  const { data: feed = [], isLoading } = useSiteCamFeed(100);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SiteCamMedia | null>(null);
  const [annotating, setAnnotating] = useState<SiteCamMedia | null>(null);

  const filtered = search
    ? feed.filter(m =>
        (m.caption || "").toLowerCase().includes(search.toLowerCase()) ||
        m.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        (m.jobs as any)?.job_id?.toLowerCase().includes(search.toLowerCase()) ||
        (m.jobs as any)?.customers?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : feed;

  const grouped = filtered.reduce<Record<string, SiteCamMedia[]>>((acc, m) => {
    const key = format(new Date(m.uploaded_at), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <AppLayout>
      <PageWrapper>
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
              <Camera className="h-6 w-6" /> Forge Vision — Forge Cam
            </h1>
            <p className="text-muted-foreground text-sm">Field recon intel — all photos & videos across operations</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by tag, job, customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Camera className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No media yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Photos uploaded on job pages will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-sm font-semibold text-muted-foreground mb-2">{format(new Date(date), "EEEE, MMMM d, yyyy")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {items.map(item => <FeedCard key={item.id} item={item} onClick={() => setSelectedMedia(item)} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageWrapper>

      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {selectedMedia && <FeedDetail media={selectedMedia} navigate={navigate} onAnnotate={(m) => { setAnnotating(m); setSelectedMedia(null); }} />}
        </DialogContent>
      </Dialog>

      {annotating && <AnnotationEditor media={annotating} onClose={() => setAnnotating(null)} />}
    </AppLayout>
  );
}

function FeedDetail({ media, navigate, onAnnotate }: { media: SiteCamMedia; navigate: (p: string) => void; onAnnotate: (m: SiteCamMedia) => void }) {
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
      <div className="space-y-3">
        {media.type === "photo" ? (
          imgUrl ? <img src={imgUrl} alt="" className="w-full rounded-lg" /> : <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        ) : (
          origUrl ? <video src={origUrl} controls className="w-full rounded-lg" /> : <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">{media.tags?.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
          <p className="text-xs text-muted-foreground">{format(new Date(media.uploaded_at), "MMM d h:mm a")}</p>
        </div>
        <div className="flex gap-2">
          {(media.jobs as any)?.job_id && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/jobs/${media.job_id}`)}>
              View Job: {(media.jobs as any).job_id}
            </Button>
          )}
          {media.type === "photo" && (
            <Button variant="outline" size="sm" onClick={() => onAnnotate(media)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Annotate
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function FeedCard({ item, onClick }: { item: SiteCamMedia; onClick: () => void }) {
  const url = useMediaUrl(item.annotated_path || item.original_path);
  const jobInfo = item.jobs as any;

  return (
    <div onClick={onClick} className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border border-border hover:border-primary/50 transition-all">
      {item.type === "photo" ? (
        url ? <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Video className="h-8 w-8 text-muted-foreground" /></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-2 left-2 right-2">
          {jobInfo?.job_id && <p className="text-white text-xs font-mono">{jobInfo.job_id}</p>}
          {jobInfo?.customers?.name && <p className="text-white/70 text-[10px]">{jobInfo.customers.name}</p>}
        </div>
      </div>
      {item.annotated_path && (
        <div className="absolute top-1.5 right-1.5">
          <Badge variant="secondary" className="text-[9px] px-1 py-0"><Pencil className="h-2.5 w-2.5" /></Badge>
        </div>
      )}
    </div>
  );
}
