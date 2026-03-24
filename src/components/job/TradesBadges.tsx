// MOBILE-PORT: maps to React Native Badge list
import { Badge } from "@/components/ui/badge";

const TRADE_COLORS: Record<string, string> = {
  roofing: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  siding: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  gutters: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  windows: "bg-violet-500/20 text-violet-700 border-violet-500/30",
  paint: "bg-rose-500/20 text-rose-700 border-rose-500/30",
  fencing: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  drywall: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
  interior: "bg-pink-500/20 text-pink-700 border-pink-500/30",
};

function getTradeColor(trade: string) {
  const key = trade.toLowerCase();
  for (const [k, v] of Object.entries(TRADE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-muted text-muted-foreground border-muted";
}

export function TradesBadges({ trades, size = "sm" }: { trades: string[]; size?: "xs" | "sm" }) {
  if (!trades || trades.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {trades.map((t) => (
        <Badge
          key={t}
          variant="outline"
          className={`${getTradeColor(t)} ${size === "xs" ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0"} font-medium`}
        >
          {t}
        </Badge>
      ))}
    </div>
  );
}
