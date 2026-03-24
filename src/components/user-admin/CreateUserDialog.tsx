import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PasswordInput } from "@/components/PasswordInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LEVEL_CONFIG, LEVELS, type ProfileWithHierarchy } from "@/hooks/useHierarchy";

const ROLES = ["sales_rep", "field_tech", "office_admin", "manager", "owner"] as const;

const ROLE_DEFAULT_LEVEL: Record<string, keyof typeof LEVEL_CONFIG> = {
  sales_rep: "lvl2",
  field_tech: "lvl1",
  office_admin: "admin",
  manager: "manager",
  owner: "highest",
};

const ROLE_HINT: Record<string, string> = {
  sales_rep: "Defaults to Rep tier (lvl2). Adjust level and commission if needed.",
  field_tech: "Defaults to canvasser / field tier.",
  office_admin: "Defaults to Admin tier.",
  manager: "Defaults to Manager tier.",
  owner: "Defaults to Owner — grant only when appropriate.",
};

export type CreateUserPayload = {
  action: "create-user";
  email: string;
  password: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  phone?: string | null;
  phone_secondary?: string | null;
  address?: string | null;
  manager_id?: string | null;
  profile_picture_url?: string | null;
  google_drive_link?: string | null;
  signature_text?: string | null;
  signature_url?: string | null;
  level?: string;
  commission_rate?: number;
  override_rate?: number;
  active?: boolean;
  verified?: boolean;
};

function computeProfileCompletion(p: {
  nameOk: boolean;
  emailOk: boolean;
  passOk: boolean;
  phone: string;
  phone_secondary: string;
  address: string;
  manager_id: string;
  profile_picture_url: string;
  google_drive_link: string;
  signature_text: string;
  signature_url: string;
}): number {
  const req = [p.nameOk, p.emailOk, p.passOk].filter(Boolean).length;
  const reqPct = (req / 3) * 45;
  const opt = [
    p.phone,
    p.phone_secondary,
    p.address,
    p.manager_id && p.manager_id !== "none",
    p.profile_picture_url,
    p.google_drive_link,
    p.signature_text,
    p.signature_url,
  ].filter(Boolean).length;
  const optPct = Math.min(55, opt * 6.875);
  return Math.min(100, Math.round(reqPct + optPct));
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ProfileWithHierarchy[];
  isPending: boolean;
  onSubmit: (payload: CreateUserPayload) => void;
};

export function CreateUserDialog({ open, onOpenChange, users, isPending, onSubmit }: Props) {
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<string>("sales_rep");
  const [createPassword, setCreatePassword] = useState("");
  const [createMustChange, setCreateMustChange] = useState(true);
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [createPhone, setCreatePhone] = useState("");
  const [createPhoneSecondary, setCreatePhoneSecondary] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createManagerId, setCreateManagerId] = useState<string>("none");
  const [createProfileUrl, setCreateProfileUrl] = useState("");
  const [createDriveUrl, setCreateDriveUrl] = useState("");
  const [createSigText, setCreateSigText] = useState("");
  const [createSigUrl, setCreateSigUrl] = useState("");

  const [createLevel, setCreateLevel] = useState<string>("lvl2");
  const [createCommRate, setCreateCommRate] = useState("0.3");
  const [createOverride, setCreateOverride] = useState("0");
  const [createActive, setCreateActive] = useState(true);
  const [createVerified, setCreateVerified] = useState(false);

  const activeManagers = useMemo(
    () => users.filter((u) => u.active && !(u as { deleted_at?: string | null }).deleted_at),
    [users],
  );

  useEffect(() => {
    if (!open) return;
    const lvl = ROLE_DEFAULT_LEVEL[createRole] ?? "lvl2";
    setCreateLevel(lvl);
  }, [createRole, open]);

  useEffect(() => {
    if (!open) return;
    const cfg = LEVEL_CONFIG[createLevel as keyof typeof LEVEL_CONFIG];
    if (cfg) {
      setCreateCommRate(String(cfg.commissionRate));
      setCreateOverride(String(cfg.overrideRate));
    }
  }, [createLevel, open]);

  const completion = computeProfileCompletion({
    nameOk: createName.trim().length > 0,
    emailOk: createEmail.includes("@"),
    passOk: createPassword.length >= 8,
    phone: createPhone,
    phone_secondary: createPhoneSecondary,
    address: createAddress,
    manager_id: createManagerId,
    profile_picture_url: createProfileUrl,
    google_drive_link: createDriveUrl,
    signature_text: createSigText,
    signature_url: createSigUrl,
  });

  const reset = () => {
    setCreateName("");
    setCreateEmail("");
    setCreateRole("sales_rep");
    setCreatePassword("");
    setCreateMustChange(true);
    setOptionalOpen(false);
    setCreatePhone("");
    setCreatePhoneSecondary("");
    setCreateAddress("");
    setCreateManagerId("none");
    setCreateProfileUrl("");
    setCreateDriveUrl("");
    setCreateSigText("");
    setCreateSigUrl("");
    setCreateLevel("lvl2");
    setCreateCommRate("0.3");
    setCreateOverride("0");
    setCreateActive(true);
    setCreateVerified(false);
  };

  useEffect(() => {
    reset();
  }, [open]);

  const buildPayload = (): CreateUserPayload => {
    const payload: CreateUserPayload = {
      action: "create-user",
      email: createEmail.trim(),
      password: createPassword,
      full_name: createName.trim(),
      role: createRole,
      must_change_password: createMustChange,
      level: createLevel,
      commission_rate: parseFloat(createCommRate) || 0,
      override_rate: parseFloat(createOverride) || 0,
      active: createActive,
      verified: createVerified,
    };
    if (createPhone.trim()) payload.phone = createPhone.trim();
    if (createPhoneSecondary.trim()) payload.phone_secondary = createPhoneSecondary.trim();
    if (createAddress.trim()) payload.address = createAddress.trim();
    if (createManagerId !== "none") payload.manager_id = createManagerId;
    if (createProfileUrl.trim()) payload.profile_picture_url = createProfileUrl.trim();
    if (createDriveUrl.trim()) payload.google_drive_link = createDriveUrl.trim();
    if (createSigText.trim()) payload.signature_text = createSigText.trim();
    if (createSigUrl.trim()) payload.signature_url = createSigUrl.trim();
    return payload;
  };

  const handleSubmit = () => {
    onSubmit(buildPayload());
  };

  const handleSkipOptional = () => {
    onSubmit({
      action: "create-user",
      email: createEmail.trim(),
      password: createPassword,
      full_name: createName.trim(),
      role: createRole,
      must_change_password: createMustChange,
      level: createLevel,
      commission_rate: parseFloat(createCommRate) || 0,
      override_rate: parseFloat(createOverride) || 0,
      active: createActive,
      verified: createVerified,
    });
  };

  const canSubmit =
    createName.trim() && createEmail.trim() && createPassword.length >= 8 && createEmail.includes("@");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Required fields create the account. Optional details can be added now or later on the profile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Profile completion (optional fields)</span>
              <span>{completion}%</span>
            </div>
            <Progress value={completion} className="h-2" />
          </div>

          <div className="space-y-2">
            <Label>Full name *</Label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="John Smith"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={createRole} onValueChange={setCreateRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_HINT[createRole]}</p>
          </div>
          <div className="space-y-2">
            <Label>Temporary password *</Label>
            <PasswordInput
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Min 8 characters"
              minLength={8}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="must-change"
              checked={createMustChange}
              onCheckedChange={(checked) => setCreateMustChange(checked === true)}
            />
            <Label htmlFor="must-change" className="text-sm font-normal">
              Require password change on first login
            </Label>
          </div>

          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between px-0 font-normal">
                <span>Contact, hierarchy &amp; signature (optional)</span>
                {optionalOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="Cell" />
                </div>
                <div className="space-y-2">
                  <Label>Secondary phone</Label>
                  <Input
                    value={createPhoneSecondary}
                    onChange={(e) => setCreatePhoneSecondary(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={createAddress} onChange={(e) => setCreateAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={createManagerId} onValueChange={setCreateManagerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {activeManagers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profile image URL</Label>
                <Input
                  value={createProfileUrl}
                  onChange={(e) => setCreateProfileUrl(e.target.value)}
                  placeholder="https:// or storage path"
                />
              </div>
              <div className="space-y-2">
                <Label>Google Drive URL</Label>
                <Input
                  type="url"
                  value={createDriveUrl}
                  onChange={(e) => setCreateDriveUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Signature text</Label>
                <Input value={createSigText} onChange={(e) => setCreateSigText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Signature image URL</Label>
                <Input value={createSigUrl} onChange={(e) => setCreateSigUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label>Commission tier (level)</Label>
                <Select value={createLevel} onValueChange={setCreateLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LEVEL_CONFIG[l].badge} {LEVEL_CONFIG[l].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Commission rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={createCommRate}
                    onChange={(e) => setCreateCommRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Override rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={createOverride}
                    onChange={(e) => setCreateOverride(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-active"
                    checked={createActive}
                    onCheckedChange={(c) => setCreateActive(c === true)}
                  />
                  <Label htmlFor="create-active" className="text-sm font-normal">
                    Active
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-verified"
                    checked={createVerified}
                    onCheckedChange={(c) => setCreateVerified(c === true)}
                  />
                  <Label htmlFor="create-verified" className="text-sm font-normal">
                    Verified
                  </Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleSkipOptional}
              disabled={isPending || !canSubmit}
            >
              {isPending ? "Creating…" : "Create (skip optional)"}
            </Button>
            <Button type="button" className="flex-1" onClick={handleSubmit} disabled={isPending || !canSubmit}>
              {isPending ? "Creating…" : "Create user"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
