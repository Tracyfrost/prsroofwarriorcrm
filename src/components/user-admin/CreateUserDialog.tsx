import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner"; // or your toast library
import { uiToDbRole, type UiRole } from "@/lib/role-utils";

const UI_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "office", label: "Office" },
  { value: "sales", label: "Sales" },
] as const;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "office" | "sales">("sales");
  const [password, setPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(true);

  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("user-admin", {
        body: {
          action: "create-user",
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role: uiToDbRole(role as UiRole),
          password,
          must_change_password: mustChangePassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["audits-for-user"] });

      // Show one-time temp password (Edge Function doesn't echo it back, use form value)
      showTempPasswordModal(password);

      // Reset form
      setFullName("");
      setEmail("");
      setPassword("");
      setMustChangePassword(true);
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user. Check console.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error("All fields are required");
      return;
    }
    createUserMutation.mutate();
  };

  const showTempPasswordModal = (tempPassword: string) => {
    toast.success("User Created", {
      description: (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Temporary Password (shown once):</p>
            <div className="flex items-center gap-2 mt-1 bg-muted p-3 rounded font-mono text-sm break-all">
              {tempPassword}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(tempPassword);
              toast.success("Password copied!");
            }}
          >
            Copy Password
          </Button>
          <p className="text-amber-600 text-xs font-medium">
            ⚠️ Store this password securely. It will not be shown again.
          </p>
        </div>
      ),
      duration: 10000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create User</Button>
      </DialogTrigger>

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
            <Select value={role} onValueChange={(v: any) => setRole(v)}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating User..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}