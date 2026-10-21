import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const VerifyAccount = () => {
const navigate = useNavigate();
const { toast } = useToast();
const fileInputRef = useRef<HTMLInputElement>(null);

const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [uploadingPhoto, setUploadingPhoto] = useState(false);
const [status, setStatus] = useState("not_requested");
const [matricNumber, setMatricNumber] = useState("");
const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
const [photoError, setPhotoError] = useState<string | null>(null);

useEffect(() => {
const load = async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
navigate("/login");
return;
}
const { data } = await supabase
.from("profiles")
.select("verification_status, matric_number, id_photo_url")
.eq("user_id", session.user.id)
.maybeSingle();

if (data) {  
    setStatus(data.verification_status);  
    setMatricNumber(data.matric_number || "");  
    setIdPhotoUrl(data.id_photo_url);  
  }  
  setLoading(false);  
};  
load();

}, [navigate]);

const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;

if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {  
  setPhotoError("Only JPEG, PNG, and WebP images are allowed.");  
  return;  
}  
if (file.size > MAX_FILE_SIZE_BYTES) {  
  setPhotoError("Image must be under 5MB.");  
  return;  
}  
setPhotoError(null);  
setUploadingPhoto(true);  

try {  
  const formData = new FormData();  
  formData.append("file", file);  
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);  

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });  
  if (!res.ok) throw new Error("Upload failed");  

  const data = await res.json();  
  setIdPhotoUrl(data.secure_url);  
  toast({ title: "ID photo uploaded" });  
} catch {  
  setPhotoError("Failed to upload image. Please try again.");  
} finally {  
  setUploadingPhoto(false);  
  if (fileInputRef.current) fileInputRef.current.value = "";  
}

};

const handleSubmit = async () => {
if (!matricNumber.trim()) {
toast({ title: "Enter your matric number", variant: "destructive" });
return;
}
if (!idPhotoUrl) {
toast({ title: "Upload a photo of your student ID", variant: "destructive" });
return;
}
setSubmitting(true);
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;

const { error } = await supabase  
  .from("profiles")  
  .update({  
    matric_number: matricNumber.trim(),  
    id_photo_url: idPhotoUrl,  
    verification_status: "pending",  
    verification_requested_at: new Date().toISOString(),  
  })  
  .eq("user_id", session.user.id);  

setSubmitting(false);  
if (error) {  
  toast({ title: "Could not submit request", variant: "destructive" });  
  return;  
}  
setStatus("pending");  
toast({ title: "Request submitted", description: "An admin will review your details shortly." });

};

if (loading) {
return (
<div className="min-h-screen bg-background flex items-center justify-center">
<div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
</div>
);
}

return (
<div className="min-h-screen bg-background">
<header className="bg-navy sticky top-0 z-50 shadow-lg">
<div className="container mx-auto px-4 py-4 flex items-center gap-2">
<Link to="/dashboard" className="flex items-center gap-2">
<BrandLogo size="md" />
<span className="font-cursive text-2xl text-gold">MART101</span>
</Link>
</div>
</header>

<main className="container mx-auto px-4 py-6 max-w-lg">  
    <Link to="/dashboard" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6">  
      <ArrowLeft className="w-4 h-4" /> Back to Dashboard  
    </Link>  

    <div className="flex items-center gap-2 mb-2">  
      <BadgeCheck className="w-6 h-6 text-secondary" />  
      <h1 className="text-2xl font-bold text-foreground">Verify Your Account</h1>  
    </div>  
    <p className="text-muted-foreground text-sm mb-6">  
      Verification unlocks the verified badge on your profile and is required before  
      Mart101 Pay can be enabled for your listings.  
    </p>  

    {status === "approved" && (  
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm mb-6">  
        You're verified. Your profile now shows the verified badge.  
      </div>  
    )}  
    {status === "pending" && (  
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-800 text-sm mb-6">  
        Your request is under review. An admin will approve this shortly.  
      </div>  
    )}  
    {status === "rejected" && (  
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-6">  
        Your previous request wasn't approved. You can update your details and resubmit below.  
      </div>  
    )}  

    <div className="space-y-4">  
      <div>  
        <Label htmlFor="matric">Matric Number</Label>  
        <Input id="matric" value={matricNumber} onChange={(e) => setMatricNumber(e.target.value)} placeholder="e.g. 2021/CS/045" />  
      </div>  

      <div>  
        <Label>Student ID Photo</Label>  
        <p className="text-xs text-muted-foreground mb-2">A clear photo of your student ID card.</p>  
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" id="id-photo-input" />  
        <label  
          htmlFor="id-photo-input"  
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-secondary transition-colors"  
        >  
          {idPhotoUrl ? (  
            <img src={idPhotoUrl} alt="Student ID" className="max-h-40 rounded-lg object-contain" />  
          ) : (  
            <>  
              <Camera className="w-6 h-6 text-muted-foreground" />  
              <span className="text-sm text-muted-foreground">  
                {uploadingPhoto ? "Uploading..." : "Tap to upload"}  
              </span>  
            </>  
          )}  
        </label>  
        {photoError && <p className="text-xs text-destructive mt-1">{photoError}</p>}  
      </div>  

      <Button onClick={handleSubmit} disabled={submitting || uploadingPhoto} className="w-full h-12 font-semibold">  
        {submitting ? "Submitting..." : status === "approved" ? "Update Details" : "Submit for Review"}  
      </Button>  
    </div>  
  </main>  
</div>

);
};

export default VerifyAccount;
