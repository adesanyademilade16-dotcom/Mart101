import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Lock, Camera } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatNigerianWhatsapp } from "@/lib/formatWhatsapp";
import { sanitizeError } from "@/lib/errors";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
        .select("full_name, whatsapp_number, department, level, avatar_url")
        .eq("user_id", session.user.id)
        .single();

      setForm({
        fullName: profile?.full_name || "",
        whatsappNumber: profile?.whatsapp_number || "",
        department: profile?.department || "",
        level: profile?.level || "",
      });
      setAvatarUrl(profile?.avatar_url || null);
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

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAvatarError(`Image must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setAvatarError(null);

    // Show an instant local preview while the upload happens in the background.
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setAvatarUrl(data.secure_url);
      toast({ title: "Picture uploaded", description: "Don't forget to save changes." });
    } catch {
      setAvatarError("Failed to upload image. Please try again.");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        avatar_url: avatarUrl,
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

  const displayAvatar = avatarPreview || avatarUrl;

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
                Signed in with Google , no password confirmation needed.
              </p>
            )}

            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-2 py-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full cursor-pointer group"
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center text-secondary text-3xl font-bold border-2 border-border">
                    {form.fullName?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-secondary hover:underline"
                disabled={uploadingAvatar}
              >
                Change Profile Picture
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}
            </div>

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
            <Button type="submit" variant="secondary" className="w-full font-semibold" disabled={saving || uploadingAvatar}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

export default EditProfile;
