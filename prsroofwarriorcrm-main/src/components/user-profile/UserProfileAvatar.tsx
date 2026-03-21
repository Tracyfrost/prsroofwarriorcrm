import { useQuery } from "@tanstack/react-query";
import { getUserDocumentUrl } from "@/hooks/useUserDocuments";

export function UserProfileAvatar({
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
  const initial = (profile.name || "?")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
