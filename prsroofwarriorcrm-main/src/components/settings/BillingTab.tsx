import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubscription, useAllSubscriptions, useOverrideSubscription, type SubscriptionTier } from "@/hooks/useSubscription";
import { useAllProfiles } from "@/hooks/useHierarchy";
import { useMyProfile } from "@/hooks/useHierarchy";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Zap, Building2, Search, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const PLANS: {
  tier: SubscriptionTier;
  name: string;
  price: string;
  icon: React.ReactNode;
  features: string[];
  highlight?: boolean;
}[] = [
  {
    tier: "free",
    name: "Basic",
    price: "Free",
    icon: <Zap className="h-5 w-5" />,
    features: [
      "Up to 50 jobs",
      "Basic job management",
      "Standard reports",
      "SiteCam photo capture",
      "Email support",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$49/mo",
    icon: <Crown className="h-5 w-5" />,
    highlight: true,
    features: [
      "Unlimited jobs",
      "Custom workflow branches",
      "AI damage detection",
      "Advanced reports & analytics",
      "Priority support",
      "Commission automation",
    ],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "$149/mo",
    icon: <Building2 className="h-5 w-5" />,
    features: [
      "Everything in Pro",
      "Multi-team management",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Bulk data exports",
    ],
  },
];

export function BillingTab() {
  const { data: subscription, isLoading } = useSubscription();
  const { toast } = useToast();
  const currentTier = subscription?.tier ?? "free";
  const { data: myProfile } = useMyProfile();
  const isHighest = myProfile?.level === "highest";

  // Override section state
  const { data: allSubs = [] } = useAllSubscriptions();
  const { data: allUsers = [] } = useAllProfiles();
  const overrideSub = useOverrideSubscription();
  const [overrideSearch, setOverrideSearch] = useState("");
  const [bulkTier, setBulkTier] = useState<SubscriptionTier>("pro");
  const [bulkNotes, setBulkNotes] = useState("");

  const handleSubscribe = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    toast({
      title: "Stripe integration coming soon",
      description: `Upgrade to ${tier} will be available when Stripe is connected.`,
    });
  };

  const overriddenSubs = allSubs.filter((s) => s.overridden_by);

  const filteredUsers = allUsers.filter((u) => {
    if (!overrideSearch) return false;
    const q = overrideSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const handleBulkOverride = async (userId: string, userName: string) => {
    try {
      await overrideSub.mutateAsync({ userId, tier: bulkTier, notes: bulkNotes || "Bulk override from billing" });
      toast({ title: "Tier overridden", description: `${userName} set to ${bulkTier}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex items-center gap-3">
              <Badge variant={currentTier === "free" ? "secondary" : "default"} className="text-sm px-3 py-1">
                {currentTier === "free" ? "Basic (Free)" : currentTier === "pro" ? "Pro" : "Enterprise"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {subscription?.active !== false ? "Active" : "Inactive"}
              </span>
              {(subscription as any)?.overridden_by && (
                <Badge variant="outline" className="text-[10px] border-accent text-accent">
                  Admin Override
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          return (
            <Card
              key={plan.tier}
              className={`shadow-card relative ${
                plan.highlight ? "border-primary ring-1 ring-primary/20" : ""
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2 text-primary">{plan.icon}</div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-2xl font-bold text-foreground mt-1">{plan.price}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.highlight ? "default" : "outline"}
                  disabled={isCurrent}
                  onClick={() => handleSubscribe(plan.tier)}
                >
                  {isCurrent ? "Current Plan" : plan.tier === "free" ? "Downgrade" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subscription Overrides — Highest only */}
      {isHighest && (
        <>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4" /> Subscription Overrides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3">
                <AlertTriangle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">Manual overrides bypass billing. Changes are audited.</p>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Search User</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={overrideSearch}
                      onChange={(e) => setOverrideSearch(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Tier</Label>
                  <Select value={bulkTier} onValueChange={(v) => setBulkTier(v as SubscriptionTier)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-48 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    placeholder="Override reason..."
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {filteredUsers.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredUsers.map((u) => {
                    const sub = allSubs.find((s) => s.user_id === u.user_id);
                    const currentT = (sub?.tier || "free") as string;
                    return (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{u.name || u.email}</p>
                          <p className="text-xs text-muted-foreground">{u.email} · Current: {currentT}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={overrideSub.isPending}
                          onClick={() => handleBulkOverride(u.user_id, u.name || u.email)}
                        >
                          Set {bulkTier}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overridden Subscriptions Review */}
          {overriddenSubs.length > 0 && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Overridden Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Overridden</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overriddenSubs.map((s) => {
                      const u = allUsers.find((u) => u.user_id === s.user_id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm font-medium">{u?.name || u?.email || s.user_id}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{s.override_notes || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
