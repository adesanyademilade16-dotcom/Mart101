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
import { formatNigerianWhatsapp } from "@/lib/formatWhatsapp";
import { mapSignupError } from "@/lib/errors";

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include both letters and numbers (e.g Gremlinboy123)";
const isStrongPassword = (pw: string) =>
  pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    whatsappNumber: "",
    department: "",
    level: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear relevant errors as user types
    setErrors((prev) => {
      const next = { ...prev, form: undefined };
      if (name === "email") next.email = undefined;
      if (name === "password") next.password = undefined;
      return next;
    });
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
if (!EMAIL_REGEX.test(form.email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!isStrongPassword(form.password)) {
      next.password = PASSWORD_MESSAGE;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Preserve ?next= (e.g. an OAuth consent URL) after email confirmation.
    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next");
    const safeNext = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + (safeNext ?? ""),
        data: {
          full_name: form.fullName,
          whatsapp_number: formatNigerianWhatsapp(form.whatsappNumber),
          department: form.department,
          level: form.level,
        },
      },
    });

    setLoading(false);

    if (error) {
      const mapped = mapSignupError(error);
      setErrors((prev) => ({ ...prev, [mapped.field]: mapped.message }));
    } else {
      toast({ title: "Account created!", description: "Welcome to MART101." });
      navigate(safeNext ?? "/dashboard");
    }
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
          <p className="text-primary-foreground/60">Create your seller account</p>
        </div>
        <div className="glass-card px-4 py-3 mb-4 flex items-start gap-2 text-sm">
  <span className="text-secondary shrink-0 mt-0.5">💡</span>
  <p className="text-muted-foreground">
    We recommend signing up with <span className="font-semibold text-foreground">Google</span> for instant access — no email confirmation needed.
  </p>
</div>
        <form onSubmit={handleSubmit} noValidate className="glass-card p-6 space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" required value={form.fullName} onChange={handleChange} placeholder="Omotola ayo" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="omotola@gmail.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive mt-1">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input id="whatsappNumber" name="whatsappNumber" required value={form.whatsappNumber} onChange={handleChange} placeholder="09065757430" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" required value={form.department} onChange={handleChange} placeholder="Biochemistry" />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Input id="level" name="level" required value={form.level} onChange={handleChange} placeholder="300" />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="pr-10"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive mt-1">
                {errors.password}
              </p>
            )}
          </div>
          {errors.form && (
            <p className="text-sm text-destructive text-center" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" variant="secondary" className="w-full font-semibold text-lg h-12" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/15" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
          <GoogleSignInButton />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-secondary font-semibold hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
