import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useSiteCamFeed, useMediaUrl, useUpdateSiteCamMedia, type SiteCamMedia } from "@/hooks/useSiteCam";
import { useJobs, type Job } from "@/hooks/useJobs";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Video, Image as ImageIcon, Search, Pencil, Loader2, Link2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnnotationEditor } from "@/components/sitecam/AnnotationEditor";
import { AiDamageButton } from "@/components/sitecam/AiDamageButton";
import { formatSupabaseErr } from "@/hooks/useDocuments";

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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="default" size="sm" asChild>
              <Link to="/sitecam/capture">Create photo</Link>
            </Button>
            <div className="relative w-64 min-w-[12rem]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by tag, job, customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Camera className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No media yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Photos uploaded on job pages will appear here. From the feed, open an item to attach it to another job (if you can edit SiteCam).
              </p>
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
        <DialogContent className="!flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto overscroll-contain p-6">
          {selectedMedia && (
            <FeedDetail
              media={selectedMedia}
              navigate={navigate}
              onAnnotate={(m) => {
                setAnnotating(m);
                setSelectedMedia(null);
              }}
              onMediaJobAttached={(m) => setSelectedMedia(m)}
            />
          )}
        </DialogContent>
      </Dialog>

      {annotating && <AnnotationEditor media={annotating} onClose={() => setAnnotating(null)} />}
    </AppLayout>
  );
}

function FeedDetail({
  media,
  navigate,
  onAnnotate,
  onMediaJobAttached,
}: {
  media: SiteCamMedia;
  navigate: (p: string) => void;
  onAnnotate: (m: SiteCamMedia) => void;
  onMediaJobAttached: (m: SiteCamMedia) => void;
}) {
  const { can } = usePermissions();
  const { toast } = useToast();
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const updateMedia = useUpdateSiteCamMedia();
  const [attachOpen, setAttachOpen] = useState(false);
  const [jobQuery, setJobQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const imgUrl = useMediaUrl(media.annotated_path || media.original_path);
  const origUrl = useMediaUrl(media.original_path);
  const jobJoin = media.jobs as { job_id?: string; customers?: { name: string } | null } | null | undefined;

  const filteredJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const idMatch = j.id.toLowerCase().includes(q);
      const code = (j.job_id || "").toLowerCase();
      const name = (j.customers?.name || "").toLowerCase();
      return idMatch || code.includes(q) || name.includes(q);
    });
  }, [jobs, jobQuery]);

  const onConfirmAttach = async () => {
    if (!selectedJob || selectedJob.id === media.job_id) return;
    try {
      await updateMedia.mutateAsync({
        id: media.id,
        job_id: selectedJob.id,
        previousJobId: media.job_id,
      });
      toast({ title: "Attached to job", description: `${selectedJob.job_id} — ${selectedJob.customers?.name ?? "Job"}` });
      onMediaJobAttached({
        ...media,
        job_id: selectedJob.id,
        folder_id: null,
        jobs: {
          job_id: selectedJob.job_id,
          customers: selectedJob.customers ? { name: selectedJob.customers.name } : null,
        },
      });
      setAttachOpen(false);
      setSelectedJob(null);
      setJobQuery("");
    } catch (e) {
      toast({
        title: "Could not attach",
        description: formatSupabaseErr(e),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {media.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          {media.caption || "Media"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="flex max-h-[min(55vh,600px)] w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
          {media.type === "photo" ? (
            imgUrl ? (
              <img src={imgUrl} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )
          ) : origUrl ? (
            <video src={origUrl} controls className="max-h-full max-w-full object-contain" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1">{media.tags?.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
          <p className="text-xs text-muted-foreground">{format(new Date(media.uploaded_at), "MMM d h:mm a")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {media.job_id && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/operations/${media.job_id}`)}>
              {jobJoin?.job_id ? `View Job: ${jobJoin.job_id}` : "View job"}
            </Button>
          )}
          {can("edit_sitecam") && (
            <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
              <Link2 className="mr-1 h-3.5 w-3.5" /> Attach to job
            </Button>
          )}
          {media.type === "photo" && (
            <>
              <Button variant="outline" size="sm" onClick={() => onAnnotate(media)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Annotate
              </Button>
              <AiDamageButton media={media} />
            </>
          )}
        </div>
      </div>

      <Dialog open={attachOpen} onOpenChange={(o) => { setAttachOpen(o); if (!o) { setSelectedJob(null); setJobQuery(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach to job</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Move this media to another job. Folder placement is cleared so it appears at the job root in SiteCam.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="Search by job code, customer, or id…"
              value={jobQuery}
              onChange={(e) => setJobQuery(e.target.value)}
              disabled={jobsLoading}
            />
            <ScrollArea className="h-56 rounded-md border">
              {jobsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredJobs.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No jobs match.</p>
              ) : (
                <ul className="p-1">
                  {filteredJobs.map((j) => {
                    const active = selectedJob?.id === j.id;
                    return (
                      <li key={j.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedJob(j)}
                          className={
                            "w-full rounded-md px-2 py-2 text-left text-sm transition-colors " +
                            (active ? "bg-accent text-accent-foreground" : "hover:bg-muted/80")
                          }
                        >
                          <span className="font-mono text-xs">{j.job_id}</span>
                          {j.customers?.name ? (
                            <span className="mt-0.5 block text-muted-foreground">{j.customers.name}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAttachOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedJob || selectedJob.id === media.job_id || updateMedia.isPending}
              onClick={() => void onConfirmAttach()}
            >
              {updateMedia.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
