import { useState, useEffect } from "react";
import { FileText, File, Image, Loader2, Ruler } from "lucide-react";
import { useDocumentSignedUrl, type Document } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "avif", "bmp", "svg"]);

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i < 0) return "";
  return fileName.slice(i + 1).toLowerCase();
}

export type DocumentPreviewKind = "image" | "pdf" | "icon";

export function documentPreviewKind(doc: Document): DocumentPreviewKind {
  const ext = extensionOf(doc.file_name);
  if (doc.type === "photo" || IMAGE_EXT.has(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "icon";
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  contract: FileText,
  invoice: FileText,
  photo: Image,
  other: File,
  measurements: Ruler,
};

type Props = {
  doc: Document;
  className?: string;
};

export function DocumentPreview({ doc, className }: Props) {
  const kind = documentPreviewKind(doc);
  const needsUrl = kind === "image" || kind === "pdf";
  const { data: url, isLoading, isError } = useDocumentSignedUrl(doc.file_path, needsUrl);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    setMediaFailed(false);
  }, [doc.id, doc.file_path]);

  const Icon = TYPE_ICONS[doc.type] || File;

  if (!needsUrl || isError || !url || mediaFailed) {
    return (
      <div
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-t-lg bg-muted",
          className,
        )}
      >
        {needsUrl && isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Icon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className={cn("relative aspect-square w-full overflow-hidden rounded-t-lg bg-muted", className)}>
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setMediaFailed(true)}
        />
      </div>
    );
  }

  // PDF
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-t-lg bg-muted", className)}>
      <iframe
        title=""
        src={url}
        className="h-full w-full border-0"
        onError={() => setMediaFailed(true)}
      />
    </div>
  );
}
