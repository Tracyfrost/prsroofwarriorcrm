import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CustomerSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomerSearchBar({ value, onChange }: CustomerSearchBarProps) {
  return (
    <div className="relative w-full sm:max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Scout by name, #, phone, email, address, carrier..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 min-h-[48px] sm:min-h-0 text-base sm:text-sm"
      />
    </div>
  );
}
