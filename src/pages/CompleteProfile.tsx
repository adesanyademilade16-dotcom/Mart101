import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNigerianWhatsapp } from "@/lib/formatWhatsapp";
import { sanitizeError } from "@/lib/errors";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_number, department, level")
        .eq("user_id", session.user.id)
        .single();

      // If already complete, skip to dashboard.
      if (profile?.whatsapp_number && profile?.department && profile?.level) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setForm({
        fullName:
          profile?.full_name ||
          (session.user.user_metadata?.full_name as string) ||
          (session.user.user_metadata?.name as string) ||
          "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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

    setLoading(false);
    if (error) {
      toast({
        title: "Could not save profile",
        description: sanitizeError(error),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Profile complete!", description: "Welcome to MART101." });
    navigate("/dashboard", { replace: true });
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BrandLogo size="md" />
            <span className="font-cursive text-3xl text-gold">MART101</span>
          </div>
          <p className="text-primary-foreground/60">Finish setting up your seller account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" required value={form.fullName} onChange={handleChange} placeholder="John Doe" />
          </div>
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input id="whatsappNumber" name="whatsappNumber" required value={form.whatsappNumber} onChange={handleChange} placeholder="09065757430" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" required value={form.department} onChange={handleChange} placeholder="Computer Science" />
            </div>
            <div>
              <Label htmlFor="level">Level</Label>
              <Input id="level" name="level" required value={form.level} onChange={handleChange} placeholder="300" />
            </div>
          </div>
          <Button type="submit" variant="secondary" className="w-full font-semibold text-lg h-12" disabled={loading}>
            {loading ? "Saving…" : "Continue to Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
