import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Shield, UserCircle, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { computeProfileCompletionPercent } from "@/lib/profileCompletion";
import { useProfileByProfileId } from "@/hooks/useHierarchy";
import { useDirectReportsCount } from "@/hooks/useDirectReportsCount";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export function UserProfileIdentityZone({
  profile,
  completionPercent,
}: {
  profile: Profile;
  completionPercent: number;
}) {
  const { data: manager } = useProfileByProfileId(profile.manager_id ?? undefined);
  const { data: directReports = 0 } = useDirectReportsCount(profile.id);

  const pct = completionPercent || computeProfileCompletionPercent(profile);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Identity &amp; trust</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={profile.verified ? "default" : "secondary"} className="gap-1">
            {profile.verified ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
            {profile.verified ? "Verified" : "Unverified"}
          </Badge>
          <Badge variant={profile.active ? "outline" : "destructive"}>
            {profile.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Profile completion</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            Manager
          </div>
          {manager ? (
            <p className="text-sm pl-6">{manager.name || manager.email}</p>
          ) : (
            <p className="text-sm text-muted-foreground pl-6">No manager assigned</p>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            <span className="text-muted-foreground">Direct reports: </span>
            <span className="font-medium">{directReports}</span>
          </span>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Last login: </span>
          {profile.last_login ? (
            <span>{formatDistanceToNow(new Date(profile.last_login), { addSuffix: true })}</span>
          ) : (
            <span className="text-muted-foreground">Never recorded</span>
          )}
        </div>

        <div className="border-2 border-dashed rounded-lg p-4 min-h-[100px] flex flex-col items-center justify-center bg-muted/20">
          <span className="text-xs text-muted-foreground mb-2">Signature</span>
          {profile.signature_url ? (
            <img src={profile.signature_url} alt="Signature" className="max-h-20 w-auto object-contain" />
          ) : profile.signature_text ? (
            <p className="text-lg italic text-muted-foreground font-serif">{profile.signature_text}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No signature on file</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
