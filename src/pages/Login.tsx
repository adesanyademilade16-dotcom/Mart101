import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sanitizeError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";
const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: sanitizeError(error), variant: "destructive" });
      return;
    }

    // Check if the user is suspended
    const { data: profile } = await supabase
      .from("profiles")
      .select("suspended")
      .eq("user_id", data.user.id)
      .single();

    if (profile?.suspended) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({
        title: "Account Suspended",
        description: "Your account has been suspended. Contact support if you believe this is an error.",
        variant: "destructive",
      });
      return;
    }

    setLoading(false);
    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next");
    const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;
    navigate(safeNext ?? "/dashboard");
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/marketplace" className="inline-flex items-center text-primary-foreground/70 hover:text-secondary mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Marketplace
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <BrandLogo size="md" />
            <span className="font-cursive text-3xl text-gold">MART101</span>
          </div>
          <p className="text-primary-foreground/60">Login to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@university.edu" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {fieldError && (
            <p className="text-sm text-destructive text-center" role="alert">{fieldError}</p>
          )}
          <Button type="submit" variant="secondary" className="w-full font-semibold text-lg h-12" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/15" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <GoogleSignInButton />

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-secondary font-semibold hover:underline">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
