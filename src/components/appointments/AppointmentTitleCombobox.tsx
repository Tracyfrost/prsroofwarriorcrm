import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { APPOINTMENT_TITLE_PRESETS } from "@/lib/appointmentConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
};

export function AppointmentTitleCombobox({ value, onValueChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [...APPOINTMENT_TITLE_PRESETS];
    return APPOINTMENT_TITLE_PRESETS.filter((p) => p.toLowerCase().includes(q));
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          className="h-10 w-full justify-between px-3 font-normal"
        >
          <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
            {value || "Type or choose a title…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex flex-col gap-1 p-2">
          <Input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Custom title…"
            className="h-9"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <p className="px-1 pt-1 text-xs text-muted-foreground">Suggestions</p>
          <ScrollArea className="h-[min(200px,40vh)]">
            <div className="flex flex-col pr-3">
              {filtered.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onValueChange(p);
                    setOpen(false);
                  }}
                >
                  {p}
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted-foreground">No matching presets — keep typing for a custom title.</p>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
