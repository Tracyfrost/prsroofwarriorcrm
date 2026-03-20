import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { useProfileByUserId, useUpdateProfile, LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { useAuditsByUserId } from "@/hooks/useAudits";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, MapPin, ExternalLink, Pencil, FileText, Image, Car, Calendar, FolderOpen, User } from "lucide-react";
import { format, formatDistanceToNow, addDays } from "date-fns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/NotFound";
import {
  getUserDocumentUrl,
  useUserDocuments,
  useUploadUserDocument,
  useDeleteUserDocument,
} from "@/hooks/useUserDocuments";
import { useQuery } from "@tanstack/react-query";
import { useTimeOffRequests, useCreateTimeOffRequest, useUpdateTimeOffRequest } from "@/hooks/useTimeOff";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format as fmt, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

const DOC_TYPES = [
  { value: "document", label: "Documents", icon: FileText },
  { value: "w2", label: "W2 Upload", icon: FileText },
  { value: "dl", label: "DL Upload", icon: Car },
  { value: "timeoff", label: "Time off Request", icon: Calendar },
  { value: "misc", label: "Misc Docs", icon: FolderOpen },
  { value: "profile_pic", label: "Profile Pics", icon: Image },
] as const;

function ProfileAvatar({
  profile,
  className = "h-16 w-16 rounded-full object-cover",
}: {
  profile: { name: string; profile_picture_url?: string | null; user_id: string };
  className?: string;
}) {
  const path = profile.profile_picture_url && !profile.profile_picture_url.startsWith("http")
    ? profile.profile_picture_url
    : null;
  const { data: avatarUrl } = useQuery({
    queryKey: ["profile-avatar-url", profile.user_id, path],
    enabled: !!path,
    queryFn: () => getUserDocumentUrl(path!),
  });
  const src = path ? avatarUrl : (profile.profile_picture_url?.startsWith("http") ? profile.profile_picture_url : null);
  const initial = (profile.name || "?").trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  if (src) {
    return <img src={src} alt={profile.name} className={className} />;
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold ${className}`}
    >
      {initial || "?"}
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can, isOwnerOrAdmin } = usePermissions();

  const resolvedUserId = id === "me" ? user?.id : id;
  useEffect(() => {
    if (id === "me" && user) {
      navigate(`/users/${user.id}`, { replace: true });
    }
  }, [id, user, navigate]);

  const { data: profile, isLoading: profileLoading } = useProfileByUserId(resolvedUserId);
  const { data: audits = [] } = useAuditsByUserId(resolvedUserId);
  const canEdit =
    profile && user && (user.id === profile.user_id || can("manage_users") || isOwnerOrAdmin);

  usePageTitle(profile ? `${profile.name} – Profile` : "User Profile");

  if (resolvedUserId && !profileLoading && !profile) {
    return <NotFound />;
  }

  const levelConfig = profile ? (LEVEL_CONFIG[profile.level] || LEVEL_CONFIG.lvl1) : null;

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Command Center</Link>
            <span className="mx-1">/</span>
            <span className="text-foreground">{profile?.name ?? "Profile"}</span>
          </span>
        </div>

        {profile && (
          <>
            {/* Header: name, address, avatar, level, Edit */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <ProfileAvatar profile={profile} />
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                      {profile.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3" /> {profile.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {levelConfig && (
                      <Badge variant="secondary" className="text-sm">
                        {levelConfig.badge} {levelConfig.label}
                      </Badge>
                    )}
                    {canEdit && (
                      <EditProfileButton profile={profile} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Three columns: Left (contact + Drive), Center (signature), Right (activity) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: contact + Google Drive */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> My profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {profile.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      {profile.address}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    {profile.email}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    {profile.phone || "—"}
                  </p>
                  {profile.phone_secondary && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">JP Phone:</span> {profile.phone_secondary}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    User since {format(new Date(profile.created_at), "MMM d, yyyy")}
                  </p>
                  {profile.google_drive_link && (
                    <div className="pt-2">
                      <a
                        href={profile.google_drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" /> Open Google Drive
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Center: signature */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Signature</CardTitle>
                </CardHeader>
                <CardContent>
                  {(profile.signature_url || profile.signature_text) ? (
                    <div className="border-2 border-dashed rounded-lg p-4 min-h-[100px] flex items-center justify-center">
                      {profile.signature_url ? (
                        <img
                          src={profile.signature_url}
                          alt="Signature"
                          className="max-h-24 w-auto object-contain"
                        />
                      ) : (
                        <p className="text-lg italic text-muted-foreground font-serif">
                          {profile.signature_text}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-4 min-h-[100px] flex items-center justify-center text-muted-foreground text-sm">
                      No signature
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right: activity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 max-h-[320px] overflow-y-auto">
                    {audits.length === 0 ? (
                      <li className="text-sm text-muted-foreground">No activity yet.</li>
                    ) : (
                      audits.map((a) => (
                        <li key={a.id} className="flex gap-3 text-sm">
                          <ProfileAvatar
                            profile={{ name: profile.name, profile_picture_url: profile.profile_picture_url, user_id: profile.user_id }}
                            className="h-8 w-8 rounded-full shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-foreground">
                              {formatAuditAction(a.action, a.entity_type, a.details)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Card>
              <Tabs defaultValue="document" className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 p-2 border rounded-lg bg-muted/50">
                  {DOC_TYPES.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="p-4">
                  <TabsContent value="document" className="mt-0">
                    <UserDocumentsTab userId={profile.user_id} documentType="document" />
                  </TabsContent>
                  <TabsContent value="w2" className="mt-0">
                    <UserDocumentsTab userId={profile.user_id} documentType="w2" />
                  </TabsContent>
                  <TabsContent value="dl" className="mt-0">
                    <UserDocumentsTab userId={profile.user_id} documentType="dl" />
                  </TabsContent>
                  <TabsContent value="timeoff" className="mt-0">
                    <TimeOffTab
                      userId={profile.user_id}
                      canEdit={!!canEdit}
                      canApprove={can("manage_users") || isOwnerOrAdmin}
                    />
                  </TabsContent>
                  <TabsContent value="misc" className="mt-0">
                    <UserDocumentsTab userId={profile.user_id} documentType="misc" />
                  </TabsContent>
                  <TabsContent value="profile_pic" className="mt-0">
                    <ProfilePicsTab userId={profile.user_id} profileId={profile.id} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </>
        )}

        {profileLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function formatAuditAction(action: string, entityType: string, details: unknown): string {
  const d = details as Record<string, unknown> | null;
  if (action === "edit_user_contact" && d?.email) {
    return `Updated contact info`;
  }
  if (action === "soft_delete_user") {
    return `Account deactivated`;
  }
  return `${action.replace(/_/g, " ")} (${entityType})`;
}

function EditProfileButton({ profile }: { profile: { id: string; name: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        Edit profile
      </Button>
      {open && (
        <EditProfileModal
          profile={profile}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditProfileModal({
  profile,
  onClose,
}: {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    phone_secondary: string | null;
    address: string | null;
    google_drive_link: string | null;
    signature_url: string | null;
    signature_text: string | null;
    profile_picture_url: string | null;
  };
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [phoneSecondary, setPhoneSecondary] = useState(profile.phone_secondary ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [googleDriveLink, setGoogleDriveLink] = useState(profile.google_drive_link ?? "");
  const [signatureText, setSignatureText] = useState(profile.signature_text ?? "");
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        profileId: profile.id,
        name: name || undefined,
        phone: phone || null,
        phone_secondary: phoneSecondary || null,
        address: address || null,
        google_drive_link: googleDriveLink || null,
        signature_text: signatureText || null,
      });
      toast({ title: "Profile updated" });
      onClose();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>×</Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Cell"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Secondary phone (e.g. JP)</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Google Drive link</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              type="url"
              value={googleDriveLink}
              onChange={(e) => setGoogleDriveLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Signature (text)</label>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDocumentsTab({
  userId,
  documentType,
}: {
  userId: string;
  documentType: "document" | "w2" | "dl" | "misc";
}) {
  const { data: docs = [], isLoading } = useUserDocuments(userId, documentType);
  const upload = useUploadUserDocument();
  const deleteDoc = useDeleteUserDocument();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ file, userId, documentType });
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="file"
          id={`upload-${documentType}`}
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(`upload-${documentType}`)?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <DocumentRow key={d.id} doc={d} userId={userId} onDelete={() => deleteDoc.mutate(d)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  userId,
  onDelete,
}: {
  doc: { id: string; file_name: string; file_path: string; created_at: string };
  userId: string;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getUserDocumentUrl(doc.file_path).then(setUrl);
  }, [doc.file_path]);
  return (
    <li className="flex items-center justify-between text-sm py-1 border-b border-border/50">
      <div>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {doc.file_name}
          </a>
        ) : (
          <span>{doc.file_name}</span>
        )}
        <span className="text-muted-foreground ml-2">
          {format(new Date(doc.created_at), "MMM d, yyyy")}
        </span>
      </div>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}

const timeOffLocalizer = dateFnsLocalizer({
  format: fmt,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

function TimeOffTab({
  userId,
  canEdit,
  canApprove,
}: {
  userId: string;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const { user: currentUser } = useAuth();
  const { data: requests = [], isLoading } = useTimeOffRequests(userId);
  const createRequest = useCreateTimeOffRequest();
  const updateRequest = useUpdateTimeOffRequest();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    try {
      await createRequest.mutateAsync({
        userId,
        startDate,
        endDate,
        notes: notes || null,
        location: location || null,
      });
      toast({ title: "Time off request submitted" });
      setStartDate("");
      setEndDate("");
      setNotes("");
      setLocation("");
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const events = requests.map((r) => ({
    id: r.id,
    title: `Time off (${r.status})`,
    start: new Date(r.start_date),
    end: addDays(new Date(r.end_date), 1),
    allDay: true,
    resource: r,
  }));

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Request time off</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Start date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Location (optional)</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Home, Office"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createRequest.isPending}>
                  {createRequest.isPending ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-medium mb-2">Requests</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time off requests.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/50 text-sm"
              >
                <span>
                  {format(new Date(r.start_date), "MMM d")} – {format(new Date(r.end_date), "MMM d, yyyy")}
                  {r.location && ` · ${r.location}`}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      r.status === "approved" ? "default" : r.status === "denied" ? "destructive" : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                  {canApprove && r.status === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateRequest.mutate({
                            id: r.id,
                            status: "approved",
                            reviewedBy: currentUser?.id,
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          updateRequest.mutate({
                            id: r.id,
                            status: "denied",
                            reviewedBy: currentUser?.id,
                          })
                        }
                      >
                        Deny
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Calendar</h3>
        <div className="h-[360px]">
          <BigCalendar
            localizer={timeOffLocalizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="month"
            views={["month", "agenda"]}
            className="rounded-lg border"
          />
        </div>
      </div>
    </div>
  );
}

function ProfilePicsTab({ userId, profileId }: { userId: string; profileId: string }) {
  const { data: pics = [], isLoading } = useUserDocuments(userId, "profile_pic");
  const upload = useUploadUserDocument();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ file, userId, documentType: "profile_pic", setAsProfilePicture: true });
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="file"
          id="upload-profile-pic"
          className="hidden"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("upload-profile-pic")?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload profile photo"}
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : pics.length === 0 ? (
        <p className="text-sm text-muted-foreground">No profile photos yet.</p>
      ) : (
        <ul className="space-y-2">
          {pics.map((d) => (
            <DocumentRow key={d.id} doc={d} userId={userId} onDelete={() => {}} />
          ))}
        </ul>
      )}
    </div>
  );
}
