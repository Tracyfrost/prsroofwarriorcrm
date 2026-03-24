import { ExternalLink, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AddressFields {
  street?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

function formatAddress(addr: AddressFields): string {
  return [addr.street, addr.line2, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(", ");
}

interface AddressLinkProps {
  address: AddressFields | null | undefined;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export function AddressLink({ address, className = "", showIcon = true, compact = false }: AddressLinkProps) {
  if (!address || (!address.street && !address.city)) return null;

  const formatted = formatAddress(address);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;

  const display = compact
    ? [address.city, address.state].filter(Boolean).join(", ")
    : formatted;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {showIcon && <MapPin className="h-3 w-3 shrink-0" />}
            <span className="group-hover:underline">{display}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Deploy Nav — Open in Google Maps</p>
          {!compact && <p className="text-muted-foreground">{formatted}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
