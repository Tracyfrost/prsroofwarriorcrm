import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/PasswordInput";
import { Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KnotShieldLogo } from "@/components/KnotShieldLogo";
import { useWhiteLabelDefaults } from "@/hooks/useWhiteLabel";
import { motion } from "framer-motion";
import { BattleTooltip } from "@/components/BattleTooltip";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyName, logoUrl } = useWhiteLabelDefaults();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Access Denied", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Etched-steel background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo & Branding Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={`${companyName} logo`} className="h-16 w-16 rounded-2xl object-contain shadow-card" />
          ) : (
            <div className="rounded-2xl shadow-card p-1">
              <KnotShieldLogo size={56} />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide text-foreground">
              {companyName}
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mt-1">
              Command CRM
            </p>
          </div>
        </motion.div>

        <Card className="shadow-card border-border/60">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg font-display uppercase tracking-wide">
              Seize Command
            </CardTitle>
            <CardDescription>
              Authenticate to enter the war room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Deploy Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@command.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Secure Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <BattleTooltip phraseKey="login">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enter War Room
                </Button>
              </BattleTooltip>
            </form>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Access by invitation only — contact your admin</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
