import { useState } from "react";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PasswordInput } from "@/components/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  LEVEL_CONFIG,
  LEVELS,
  type ProfileWithHierarchy,
  useUpdateProfileHierarchy,
} from "@/hooks/useHierarchy";
import { useUserRoles } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { invokeUserAdminFunction } from "@/integrations/supabase/invokeUserAdmin";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Edit2, Plus, MoreHorizontal, KeyRound, RefreshCw, Copy, CheckCircle2, AlertTriangle, Trash2, UserCog, Search, Crown } from "lucide-react";
import { useOverrideSubscription, useAllSubscriptions, type SubscriptionTier } from "@/hooks/useSubscription";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { formatUserAdminHttpError } from "@/lib/userAdminInvokeError";
import { CreateUserDialog, type CreateUserPayload } from "@/components/user-admin/CreateUserDialog";

const ROLES = ["sales_rep", "field_tech", "office_admin", "manager", "owner"] as const;
const USER_ADMIN_FUNCTION = "user-admin";

const getInvokeErrorMessage = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const status = res?.status;
    let body: Record<string, unknown> | null = null;
    let rawFallback = "";
    try {
      const raw = await res.clone().text();
      if (raw) {
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          rawFallback = raw;
        }
      }
    } catch {
      rawFallback = "";
    }
    return formatUserAdminHttpError(status, body, rawFallback);
  }

  if (error instanceof FunctionsRelayError) {
    return "Edge Function relay error. Check function deployment and project ref.";
  }

  if (error instanceof FunctionsFetchError) {
    const hasSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
    if (!hasSupabaseUrl) {
      return "Supabase URL is missing (VITE_SUPABASE_URL). Configure frontend env vars and restart the app.";
    }
    return `Could not reach the user-admin function (${error.message}). Confirm "${USER_ADMIN_FUNCTION}" is deployed and your Supabase URL matches this environment.`;
  }

  if (error instanceof Error) return error.message;
  return "Unexpected error while invoking Edge Function.";
};

interface UserAdminTableProps {
  users: ProfileWithHierarchy[];
  isLoading: boolean;
}

export function UserAdminTable({ users, isLoading }: UserAdminTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const updateHierarchy = useUpdateProfileHierarchy();
  const { data: myRoles = [] } = useUserRoles();
  const overrideSub = useOverrideSubscription();
  const { data: allSubs = [] } = useAllSubscriptions();

  // Check if current user is "highest" level
  const myProfile = users.find((u) => u.user_id === user?.id);
  const isOwner = myProfile?.level === "highest";

  // Search/filter
  const [searchQuery, setSearchQuery] = useState("");

  const [editUser, setEditUser] = useState<ProfileWithHierarchy | null>(null);
  const [editLevel, setEditLevel] = useState("");
  const [editManagerId, setEditManagerId] = useState<string>("none");
  const [editCommRate, setEditCommRate] = useState("");
  const [editOverride, setEditOverride] = useState("");

  const [showCreate, setShowCreate] = useState(false);

  // Success screen
  const [createdUser, setCreatedUser] = useState<{ email: string; role: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset password dialog
  const [resetUser, setResetUser] = useState<ProfileWithHierarchy | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMustChange, setResetMustChange] = useState(true);

  // Edit contact info dialog (Owner only)
  const [editContactUser, setEditContactUser] = useState<ProfileWithHierarchy | null>(null);
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");

  // Delete user dialog (Owner only)
  const [deleteUser, setDeleteUser] = useState<ProfileWithHierarchy | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [reassignUserId, setReassignUserId] = useState<string>("none");

  // Tier override dialog (Owner only)
  const [overrideUser, setOverrideUser] = useState<ProfileWithHierarchy | null>(null);
  const [overrideTier, setOverrideTier] = useState<SubscriptionTier>("free");
  const [overrideNotes, setOverrideNotes] = useState("");

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
      await writeAudit("role_change", userId, { role }, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["user_roles"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
      toast({ title: "Role updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleVerified = useMutation({
    mutationFn: async ({
      profileId,
      subjectUserId,
      verified,
    }: {
      profileId: string;
      subjectUserId: string;
      verified: boolean;
    }) => {
      const { error } = await supabase.from("profiles").update({ verified } as any).eq("id", profileId);
      if (error) throw error;
      await writeAudit(verified ? "verify_user" : "unverify_user", profileId, {}, subjectUserId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
      toast({ title: "Verification status updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({
      profileId,
      subjectUserId,
      active,
    }: {
      profileId: string;
      subjectUserId: string;
      active: boolean;
    }) => {
      const { error } = await supabase.from("profiles").update({ active }).eq("id", profileId);
      if (error) throw error;
      await writeAudit(active ? "activate_user" : "deactivate_user", profileId, {}, subjectUserId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
      toast({ title: "User status updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMustChange = useMutation({
    mutationFn: async ({
      profileId,
      subjectUserId,
      must_change_password,
    }: {
      profileId: string;
      subjectUserId: string;
      must_change_password: boolean;
    }) => {
      const { error } = await supabase.from("profiles").update({ must_change_password }).eq("id", profileId);
      if (error) throw error;
      await writeAudit("toggle_must_change_password", profileId, { must_change_password }, subjectUserId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
      toast({ title: "Must change password updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createUser = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const functionName = USER_ADMIN_FUNCTION;
      const hasSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
      if (!hasSupabaseUrl) {
        throw new Error("Missing VITE_SUPABASE_URL. Cannot invoke Supabase Edge Functions from browser.");
      }
      try {
        console.info("Create user invoking (JWT refreshed inside helper)", {
          functionName,
          action: payload.action,
          hasSupabaseUrl,
        });
        const { data, error } = await invokeUserAdminFunction(functionName, payload);
        if (error) throw error;
        if (data?.error) throw new Error(String(data.error));
        return data;
      } catch (error) {
        const normalizedMessage = await getInvokeErrorMessage(error);
        console.error("Create user invoke failed", {
          functionName,
          action: payload.action,
          hasSupabaseUrl,
          rawErrorMessage: error instanceof Error ? error.message : "unknown",
          errorMessage: normalizedMessage,
        });
        throw new Error(normalizedMessage);
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
      setCreatedUser({
        email: variables.email,
        role: variables.role,
        password: variables.password,
      });
      setShowCreate(false);
    },
    onError: (e: Error) => toast({ title: "Create user failed", description: e.message, variant: "destructive" }),
  });

  const resetUserPassword = useMutation({
    mutationFn: async () => {
      if (!resetUser) throw new Error("No user selected");
      try {
        const { data, error } = await invokeUserAdminFunction(USER_ADMIN_FUNCTION, {
          action: "reset-user-password",
          userId: resetUser.user_id,
          new_password: resetPassword,
          must_change_password: resetMustChange,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error as string);
        return data;
      } catch (e) {
        throw new Error(await getInvokeErrorMessage(e));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      toast({ title: "Password reset successfully" });
      setResetUser(null);
      setResetPassword("");
      setResetMustChange(true);
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  const editContact = useMutation({
    mutationFn: async () => {
      if (!editContactUser) throw new Error("No user selected");
      try {
        const { data, error } = await invokeUserAdminFunction(USER_ADMIN_FUNCTION, {
          action: "edit-user",
          userId: editContactUser.user_id,
          name: editContactName || undefined,
          email: editContactEmail || undefined,
          phone: editContactPhone || null,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error as string);
        return data;
      } catch (e) {
        throw new Error(await getInvokeErrorMessage(e));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      toast({ title: "User contact info updated" });
      setEditContactUser(null);
    },
    onError: (e: Error) => toast({ title: "Edit failed", description: e.message, variant: "destructive" }),
  });

  const softDeleteUser = useMutation({
    mutationFn: async () => {
      if (!deleteUser) throw new Error("No user selected");
      try {
        const { data, error } = await invokeUserAdminFunction(USER_ADMIN_FUNCTION, {
          action: "soft-delete-user",
          userId: deleteUser.user_id,
          reassign_to_user_id: reassignUserId !== "none" ? reassignUserId : null,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error as string);
        return data;
      } catch (e) {
        throw new Error(await getInvokeErrorMessage(e));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-profiles-hierarchy"] });
      toast({ title: "User deleted successfully" });
      setDeleteUser(null);
      setDeleteConfirmName("");
      setReassignUserId("none");
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const userAction = useMutation({
    mutationFn: async ({ action, email, userId }: { action: string; email: string; userId?: string }) => {
      try {
        const { data, error } = await invokeUserAdminFunction(USER_ADMIN_FUNCTION, {
          action,
          email,
          userId,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error as string);
        return data;
      } catch (e) {
        throw new Error(await getInvokeErrorMessage(e));
      }
    },
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = { "resend-invite": "Invitation resent" };
      toast({ title: labels[vars.action] || "Done" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const writeAudit = async (
    action: string,
    entityId: string,
    details?: Record<string, unknown>,
    subjectUserId?: string | null,
  ) => {
    if (!user) return;
    await supabase.from("audits").insert([{
      user_id: user.id,
      subject_user_id: subjectUserId ?? null,
      entity_type: "user",
      action,
      entity_id: entityId,
      details: (details || {}) as any,
    }]);
  };

  const openEdit = (u: ProfileWithHierarchy) => {
    setEditUser(u);
    setEditLevel(u.level || "lvl1");
    setEditManagerId(u.manager_id || "none");
    setEditCommRate(String(u.commission_rate ?? 0));
    setEditOverride(String(u.override_rate ?? 0));
  };

  const openEditContact = (u: ProfileWithHierarchy) => {
    setEditContactUser(u);
    setEditContactName(u.name || "");
    setEditContactEmail(u.email || "");
    setEditContactPhone(u.phone || "");
  };

  const openDelete = (u: ProfileWithHierarchy) => {
    setDeleteUser(u);
    setDeleteConfirmName("");
    setReassignUserId("none");
  };

  const openOverride = (u: ProfileWithHierarchy) => {
    const sub = allSubs.find((s) => s.user_id === u.user_id);
    setOverrideUser(u);
    setOverrideTier((sub?.tier as SubscriptionTier) || "free");
    setOverrideNotes("");
  };

  const handleOverrideSave = async () => {
    if (!overrideUser) return;
    try {
      await overrideSub.mutateAsync({
        userId: overrideUser.user_id,
        tier: overrideTier,
        notes: overrideNotes,
      });
      toast({ title: "Tier overridden", description: `${overrideUser.name || overrideUser.email} set to ${overrideTier}. Billing not affected unless synced.` });
      setOverrideUser(null);
    } catch (e: any) {
      toast({ title: "Override failed", description: e.message, variant: "destructive" });
    }
  };

  const getUserTier = (userId: string): SubscriptionTier => {
    const sub = allSubs.find((s) => s.user_id === userId);
    return (sub?.tier as SubscriptionTier) || "free";
  };

  const handleLevelChange = (lvl: string) => {
    setEditLevel(lvl);
    const config = LEVEL_CONFIG[lvl];
    if (config) {
      setEditCommRate(String(config.commissionRate));
      setEditOverride(String(config.overrideRate));
    }
  };

  const handleSaveHierarchy = async () => {
    if (!editUser) return;
    try {
      await updateHierarchy.mutateAsync({
        profileId: editUser.id,
        level: editLevel,
        manager_id: editManagerId === "none" ? null : editManagerId,
        commission_rate: parseFloat(editCommRate) || 0,
        override_rate: parseFloat(editOverride) || 0,
      });
      await writeAudit(
        "hierarchy_update",
        editUser.id,
        {
          level: editLevel,
          manager_id: editManagerId === "none" ? null : editManagerId,
          commission_rate: parseFloat(editCommRate) || 0,
          override_rate: parseFloat(editOverride) || 0,
        },
        editUser.user_id,
      );
      qc.invalidateQueries({ queryKey: ["audits-for-user"] });
      toast({ title: "Hierarchy updated" });
      setEditUser(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCopyPassword = () => {
    if (createdUser) {
      navigator.clipboard.writeText(createdUser.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isDeleteConfirmed = deleteUser && deleteConfirmName === (deleteUser.name || deleteUser.email);
  const isSelfUser = (u: ProfileWithHierarchy) => u.user_id === user?.id;

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Team Members
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-56 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-3 w-3" /> Create User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Comm %</TableHead>
                <TableHead>Override %</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Must Change PW</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users match your search" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const config = LEVEL_CONFIG[u.level] || LEVEL_CONFIG.lvl1;
                  const isDeleted = !!(u as any).deleted_at;
                  return (
                    <TableRow key={u.id} className={isDeleted ? "opacity-50 bg-muted/30" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/users/${u.user_id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {u.name || "—"}
                          </Link>
                          {isDeleted && <Badge variant="destructive" className="text-[9px] px-1">Deleted</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {config.badge} {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.roles[0] || ""}
                          onValueChange={(role) => assignRole.mutate({ userId: u.user_id, role })}
                          disabled={isDeleted}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.manager_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {(u.commission_rate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {u.override_rate > 0 ? `${(u.override_rate * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {getUserTier(u.user_id).charAt(0).toUpperCase() + getUserTier(u.user_id).slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={u.verified}
                          onCheckedChange={(checked) =>
                            toggleVerified.mutate({ profileId: u.id, subjectUserId: u.user_id, verified: checked })
                          }
                          disabled={toggleVerified.isPending || isDeleted}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={u.active ? "default" : "secondary"}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() =>
                            toggleActive.mutate({ profileId: u.id, subjectUserId: u.user_id, active: !u.active })
                          }
                          disabled={isDeleted}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={(u as any).must_change_password ?? false}
                          onCheckedChange={(checked) =>
                            toggleMustChange.mutate({
                              profileId: u.id,
                              subjectUserId: u.user_id,
                              must_change_password: checked,
                            })
                          }
                          disabled={toggleMustChange.isPending || isDeleted}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.last_login
                          ? formatDistanceToNow(new Date(u.last_login), { addSuffix: true })
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)} disabled={isDeleted}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => { setResetUser(u); setResetPassword(""); setResetMustChange(true); }}
                                disabled={isDeleted}
                              >
                                <KeyRound className="mr-2 h-3.5 w-3.5" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => userAction.mutate({ action: "resend-invite", email: u.email, userId: u.id })}
                                disabled={isDeleted}
                              >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Resend Invite
                              </DropdownMenuItem>
                              {isOwner && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openEditContact(u)} disabled={isDeleted}>
                                    <UserCog className="mr-2 h-3.5 w-3.5" /> Edit Contact Info
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openOverride(u)} disabled={isDeleted}>
                                    <Crown className="mr-2 h-3.5 w-3.5" /> Override Tier
                                  </DropdownMenuItem>
                                  {!isSelfUser(u) && (
                                    <DropdownMenuItem
                                      onClick={() => openDelete(u)}
                                      className="text-destructive focus:text-destructive"
                                      disabled={isDeleted}
                                    >
                                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete User
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        users={users}
        isPending={createUser.isPending}
        onSubmit={(payload) => createUser.mutate(payload)}
      />

      {/* User Created Success Dialog */}
      <Dialog open={!!createdUser} onOpenChange={() => { setCreatedUser(null); setCopied(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> User Created</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{createdUser?.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{createdUser?.role?.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Temp Password</span>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-background px-2 py-0.5 text-sm font-mono">{createdUser?.password}</code>
                  <Button variant="ghost" size="sm" onClick={handleCopyPassword} className="h-7 px-2">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">Store this password now — it will not be shown again.</p>
            </div>
            <Button onClick={() => { setCreatedUser(null); setCopied(false); }} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password — {resetUser?.name || resetUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password *</Label>
              <PasswordInput value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Enter new password" minLength={8} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="reset-must-change" checked={resetMustChange} onCheckedChange={(checked) => setResetMustChange(checked === true)} />
              <Label htmlFor="reset-must-change" className="text-sm font-normal">Require password change on next login</Label>
            </div>
            <Button onClick={() => resetUserPassword.mutate()} className="w-full" disabled={resetUserPassword.isPending || !resetPassword}>
              {resetUserPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Hierarchy Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hierarchy — {editUser?.name || editUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={editLevel} onValueChange={handleLevelChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{LEVEL_CONFIG[l].badge} {LEVEL_CONFIG[l].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reports To</Label>
              <Select value={editManagerId} onValueChange={setEditManagerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {users.filter((u) => u.id !== editUser?.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Commission Rate</Label>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.01" min="0" max="1" value={editCommRate} onChange={(e) => setEditCommRate(e.target.value)} />
                  <span className="text-sm text-muted-foreground">({((parseFloat(editCommRate) || 0) * 100).toFixed(0)}%)</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Override Rate</Label>
                <div className="flex items-center gap-1">
                  <Input type="number" step="0.01" min="0" max="1" value={editOverride} onChange={(e) => setEditOverride(e.target.value)} />
                  <span className="text-sm text-muted-foreground">({((parseFloat(editOverride) || 0) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            </div>
            <Button onClick={handleSaveHierarchy} className="w-full" disabled={updateHierarchy.isPending}>
              {updateHierarchy.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Info Dialog (Owner Only) */}
      <Dialog open={!!editContactUser} onOpenChange={(open) => !open && setEditContactUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Edit Contact Info
            </DialogTitle>
            <DialogDescription>
              Update contact details for {editContactUser?.name || editContactUser?.email}. Changes are audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editContactName} onChange={(e) => setEditContactName(e.target.value)} placeholder="Full name" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editContactEmail} onChange={(e) => setEditContactEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editContactPhone} onChange={(e) => setEditContactPhone(e.target.value)} placeholder="(555) 123-4567" maxLength={30} />
            </div>
            <Button onClick={() => editContact.mutate()} className="w-full" disabled={editContact.isPending || !editContactName || !editContactEmail}>
              {editContact.isPending ? "Saving..." : "Save Contact Info"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog (Owner Only) */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              This will deactivate <strong>{deleteUser?.name || deleteUser?.email}</strong>, ban their login, and reassign their jobs. This action is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-xs text-destructive space-y-1">
                <p><strong>Warning:</strong> The user will be permanently banned from logging in.</p>
                <p>Their job assignments will be reassigned to the selected user.</p>
                <p>Subordinates will have their manager reference cleared.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reassign Jobs To</Label>
              <Select value={reassignUserId} onValueChange={setReassignUserId}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reassignment</SelectItem>
                  {users
                    .filter((u) => u.user_id !== deleteUser?.user_id && !(u as any).deleted_at)
                    .map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.name || u.email}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type "<strong>{deleteUser?.name || deleteUser?.email}</strong>" to confirm</Label>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Type name to confirm"
                className="border-destructive/50"
              />
            </div>

            <Button
              variant="destructive"
              onClick={() => softDeleteUser.mutate()}
              className="w-full"
              disabled={softDeleteUser.isPending || !isDeleteConfirmed}
            >
              {softDeleteUser.isPending ? "Deleting..." : "Confirm Delete User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Tier Dialog (Owner Only) */}
      <Dialog open={!!overrideUser} onOpenChange={(open) => !open && setOverrideUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" /> Override Subscription Tier
            </DialogTitle>
            <DialogDescription>
              Manually set the tier for <strong>{overrideUser?.name || overrideUser?.email}</strong>. This bypasses billing — add notes for audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3">
              <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-xs text-accent-foreground">Overriding may desync billing. Unless synced to Stripe, the user's payment status won't change.</p>
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={overrideTier} onValueChange={(v) => setOverrideTier(v as SubscriptionTier)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Basic (Free)</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Override Notes *</Label>
              <Textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Reason for override (e.g., internal team member, trial extension...)"
                rows={3}
              />
            </div>
            <Button
              onClick={handleOverrideSave}
              className="w-full"
              disabled={overrideSub.isPending || !overrideNotes.trim()}
            >
              {overrideSub.isPending ? "Saving..." : "Override Tier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
