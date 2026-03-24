import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface PhoneEntry {
  type: string;
  number: string;
  extension?: string;
}

export interface EmailEntry {
  type: string;
  address: string;
}

const PHONE_TYPES = ["home", "mobile", "work", "other"] as const;
const EMAIL_TYPES = ["primary", "billing", "other"] as const;

interface MultiPhoneInputProps {
  phones: PhoneEntry[];
  onChange: (phones: PhoneEntry[]) => void;
}

export function MultiPhoneInput({ phones, onChange }: MultiPhoneInputProps) {
  const add = () => onChange([...phones, { type: "mobile", number: "", extension: "" }]);
  const remove = (i: number) => onChange(phones.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<PhoneEntry>) =>
    onChange(phones.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">Phone Numbers</label>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3 w-3 mr-1" />Add
        </Button>
      </div>
      {phones.map((p, i) => (
        <div key={i} className="flex gap-2">
          <Select value={p.type} onValueChange={(v) => update(i, { type: v })}>
            <SelectTrigger className="w-[100px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHONE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={p.number}
            onChange={(e) => update(i, { number: e.target.value })}
            placeholder="Phone number"
            maxLength={20}
            className="flex-1"
          />
          <Input
            value={p.extension || ""}
            onChange={(e) => update(i, { extension: e.target.value })}
            placeholder="Ext"
            maxLength={10}
            className="w-[70px] shrink-0"
          />
          {phones.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => remove(i)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

interface MultiEmailInputProps {
  emails: EmailEntry[];
  onChange: (emails: EmailEntry[]) => void;
}

export function MultiEmailInput({ emails, onChange }: MultiEmailInputProps) {
  const add = () => onChange([...emails, { type: "other", address: "" }]);
  const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<EmailEntry>) =>
    onChange(emails.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">Email Addresses</label>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3 w-3 mr-1" />Add
        </Button>
      </div>
      {emails.map((e, i) => (
        <div key={i} className="flex gap-2">
          <Select value={e.type} onValueChange={(v) => update(i, { type: v })}>
            <SelectTrigger className="w-[100px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="email"
            value={e.address}
            onChange={(ev) => update(i, { address: ev.target.value })}
            placeholder="Email address"
            maxLength={255}
            className="flex-1"
          />
          {emails.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => remove(i)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
