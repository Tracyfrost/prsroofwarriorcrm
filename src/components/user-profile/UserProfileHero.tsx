import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, ExternalLink, Pencil } from "lucide-react";
import { format } from "date-fns";
import { LEVEL_CONFIG } from "@/hooks/useHierarchy";
import { UserProfileAvatar } from "./UserProfileAvatar";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

/** Hero strip: identity, contact shortcuts, edit entry. */
export function UserProfileHero({
  profile,
  roleLabel,
  onEdit,
  canEdit,
  backNavHref,
  backNavLabel,
}: {
  profile: Profile;
  roleLabel: string;
  onEdit: () => void;
  canEdit: boolean;
  backNavHref: string;
  backNavLabel: string;
}) {
  const levelCfg = LEVEL_CONFIG[profile.level] || LEVEL_CONFIG.lvl1;
  const mailto = profile.email ? `mailto:${profile.email}` : undefined;
  const tel = profile.phone ? `tel:${profile.phone.replace(/\D/g, "")}` : undefined;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <UserProfileAvatar profile={profile} className="h-20 w-20 rounded-full object-cover shrink-0" />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{profile.name}</h1>
              <Badge variant="secondary" className="shrink-0">
                {levelCfg.badge} {levelCfg.label}
              </Badge>
              <Badge variant="outline" className="shrink-0 capitalize">
                {roleLabel.replace(/_/g, " ")}
              </Badge>
            </div>
            {profile.address && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{profile.address}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm pt-1">
              {profile.email && (
                <a href={mailto} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </a>
              )}
              {profile.phone && (
                <a href={tel} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />
                  {profile.phone}
                </a>
              )}
              <span className="text-muted-foreground">
                User since {format(new Date(profile.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {profile.google_drive_link && (
              <a
                href={profile.google_drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline pt-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Google Drive
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {mailto && (
            <Button variant="outline" size="sm" asChild>
              <a href={mailto}>Email</a>
            </Button>
          )}
          {tel && (
            <Button variant="outline" size="sm" asChild>
              <a href={tel}>Call</a>
            </Button>
          )}
          {profile.google_drive_link && (
            <Button variant="outline" size="sm" asChild>
              <a href={profile.google_drive_link} target="_blank" rel="noopener noreferrer">
                Drive
              </a>
            </Button>
          )}
          {canEdit && (
            <Button variant="default" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit profile
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to={backNavHref}>{backNavLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
