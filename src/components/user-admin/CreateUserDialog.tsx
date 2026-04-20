import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { uiToDbRole, type UiRole } from "@/lib/role-utils";
import type { ProfileWithHierarchy } from "@/hooks/useHierarchy";

const UI_ROLES: Array<{ value: UiRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "office", label: "Office" },
  { value: "sales", label: "Sales" },
];

export interface CreateUserPayload {
  action: "create-user";
  full_name: string;
  email: string;
  role: ReturnType<typeof uiToDbRole>;
  password: string;
  must_change_password: boolean;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ProfileWithHierarchy[];
  isPending?: boolean;
  onSubmit: (payload: CreateUserPayload) => void;
}

export function CreateUserDialog({ open, onOpenChange, users, isPending = false, onSubmit }: CreateUserDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UiRole>("sales");
  const [password, setPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailInUse = useMemo(
    () => users.some((u) => (u.email ?? "").trim().toLowerCase() === normalizedEmail),
    [normalizedEmail, users],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !normalizedEmail || !password) {
      toast.error("All fields are required");
      return;
    }
    if (emailInUse) {
      toast.error("This email is already in use");
      return;
    }
    onSubmit({
      action: "create-user",
      full_name: fullName.trim(),
      email: normalizedEmail,
      role: uiToDbRole(role),
      password,
      must_change_password: mustChangePassword,
    });
    setFullName("");
    setEmail("");
    setPassword("");
    setMustChangePassword(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Admin can set initial password and role. New user will be forced to change password on first login if checked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UiRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UI_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PasswordInput
            label="Temporary Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            minLength={8}
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="mustChange"
              checked={mustChangePassword}
              onCheckedChange={(checked) => setMustChangePassword(!!checked)}
            />
            <Label htmlFor="mustChange" className="text-sm cursor-pointer">
              Require password change on first login (recommended)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || emailInUse}>
              {isPending ? "Creating User..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}