import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNigerianWhatsapp } from "@/lib/formatWhatsapp";
import { sanitizeError } from "@/lib/errors";

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [email, setEmail] = useState("");
  const [isPasswordAccount, setIsPasswordAccount] = useState(true);

  // Gate: user must confirm their current password before the form unlocks.
  // OAuth accounts (e.g. Google) have no password on file, so they skip
  // this step — their live session already proves a fresh sign-in.
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    whatsappNumber: "",
    department: "",
    level: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setEmail(session.user.email || "");

      // Determine whether this account has a password at all.
      // app_metadata.provider is "email" for password-based signups;
      // OAuth providers (e.g. "google") never had a password set.
      const provider = session.user.app_metadata?.provider;
      const hasPassword = provider === "email";
      setIsPasswordAccount(hasPassword);
      if (!hasPassword) setUnlocked(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_number, department, level")
        .eq("user_id", session.user.id)
        .single();

      setForm({
        fullName: profile?.full_name || "",
        whatsappNumber: profile?.whatsapp_number || "",
        department: profile?.department || "",
        level: profile?.level || "",
      });
      setBootstrapping(false);
    })();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Re-authenticate with the current password to unlock editing.
  // signInWithPassword re-validates credentials against Supabase Auth
  // without changing anything — it's the standard way to confirm identity
  // before a sensitive action, since a live session alone doesn't prove
  // the person at the keyboard still knows the password (e.g. an
  // unattended device, a shared computer, a stolen session).
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setVerifying(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setVerifying(false);

    if (error) {
      toast({
        title: "Incorrect password",
        description: "Please re-enter your current password to continue.",
        variant: "destructive",
      });
      return;
    }
    setPassword("");
    setUnlocked(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    const whatsapp = formatNigerianWhatsapp(form.whatsappNumber);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.fullName.trim(),
        whatsapp_number: whatsapp,
        department: form.department.trim(),
        level: form.level.trim(),
      })
      .eq("user_id", session.user.id);

    setSaving(false);
    if (error) {
      toast({
        title: "Could not save changes",
        description: sanitizeError(error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Profile updated" });
    navigate("/dashboard");
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-md">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {!unlocked ? (
          <form onSubmit={handleVerifyPassword} className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h1 className="text-lg font-semibold text-foreground">Confirm your password</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              For your security, re-enter your current password to edit your profile.
            </p>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full font-semibold" disabled={verifying}>
              {verifying ? "Verifying…" : "Confirm"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
            <h1 className="text-lg font-semibold text-foreground mb-1">Edit Profile</h1>
            {!isPasswordAccount && (
              <p className="text-xs text-muted-foreground -mt-2">
                Signed in with Google — no password confirmation needed.
              </p>
            )}
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" required value={form.fullName} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input id="whatsappNumber" name="whatsappNumber" required value={form.whatsappNumber} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" required value={form.department} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="level">Level</Label>
                <Input id="level" name="level" required value={form.level} onChange={handleChange} />
              </div>
            </div>
            <Button type="submit" variant="secondary" className="w-full font-semibold" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

export default EditProfile;
