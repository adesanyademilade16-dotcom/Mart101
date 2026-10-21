
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Camera, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type VerificationStatus =
  | "not_requested"
  | "pending"
  | "approved"
  | "rejected";

interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: { message?: string };
}

const VerifyAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [status, setStatus] =
    useState<VerificationStatus>("not_requested");
  const [matricNumber, setMatricNumber] = useState("");
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const isLocked = status === "pending" || status === "approved";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "verification_status, matric_number, id_photo_url"
          )
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        if (data) {
          const savedStatus = data.verification_status;

          if (
            savedStatus === "pending" ||
            savedStatus === "approved" ||
            savedStatus === "rejected"
          ) {
            setStatus(savedStatus);
          } else {
            setStatus("not_requested");
          }

          setMatricNumber(data.matric_number || "");
          setIdPhotoUrl(data.id_photo_url || null);
        }
      } catch (error) {
        console.error("Failed to load verification details:", error);

        if (!cancelled) {
          toast({
            title: "Could not load verification details",
            description: "Please refresh the page and try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  const handlePhotoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Allow selecting the same file again after an error.
    e.target.value = "";

    if (isLocked || submitting) return;

    setPhotoError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError(
        "Only JPEG, PNG, and WebP images are allowed."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPhotoError("Image must be 5MB or smaller.");
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      const result =
        (await response.json()) as CloudinaryUploadResponse;

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Cloudinary upload failed."
        );
      }

      if (!result.secure_url) {
        throw new Error("No image URL was returned.");
      }

      setIdPhotoUrl(result.secure_url);

      toast({
        title: "ID photo uploaded",
        description: "You can remove it or replace it before submitting.",
      });
    } catch (error) {
      console.error("Student ID upload failed:", error);

      setPhotoError(
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Failed to upload image. Please try again."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    if (isLocked || submitting || uploadingPhoto) return;

    setIdPhotoUrl(null);
    setPhotoError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    toast({
      title: "Photo removed",
      description: "You can upload the correct ID photo whenever you're ready.",
    });
  };

  const handleSubmit = async () => {
    if (submitting || uploadingPhoto || isLocked) return;

    const trimmedMatricNumber = matricNumber.trim();

    if (!trimmedMatricNumber) {
      toast({
        title: "Enter your matric number",
        variant: "destructive",
      });
      return;
    }

    if (!idPhotoUrl) {
      toast({
        title: "Upload a photo of your student ID",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        toast({
          title: "Session expired",
          description: "Please log in again to submit your request.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Only submit if the current database status allows a request.
      // A rejection can be resubmitted; pending/approved requests cannot.
      let updateQuery = supabase
        .from("profiles")
        .update({
          matric_number: trimmedMatricNumber,
          id_photo_url: idPhotoUrl,
          verification_status: "pending",
          verification_requested_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.id);

      if (status === "rejected") {
        updateQuery = updateQuery.eq(
          "verification_status",
          "rejected"
        );
      } else {
        updateQuery = updateQuery
          .neq("verification_status", "pending")
          .neq("verification_status", "approved");
      }

      const { data, error } = await updateQuery
        .select("verification_status");

      if (error) throw error;

      if (!data || data.length === 0) {
        // The database may have changed since the page was loaded.
        const { data: latest, error: latestError } = await supabase
          .from("profiles")
          .select("verification_status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (latestError) throw latestError;

        const latestStatus = latest?.verification_status;

        if (
          latestStatus === "pending" ||
          latestStatus === "approved" ||
          latestStatus === "rejected"
        ) {
          setStatus(latestStatus);
        }

        toast({
          title: "Request not submitted",
          description:
            latestStatus === "pending"
              ? "Your request is already pending admin review."
              : latestStatus === "approved"
                ? "Your account is already verified."
                : "Please refresh the page and try again.",
          variant: "destructive",
        });

        return;
      }

      setStatus("pending");

      toast({
        title: "Request submitted",
        description:
          "Your details have been submitted. The button will stay disabled while your request is pending.",
      });
    } catch (error) {
      console.error("Verification submission failed:", error);

      toast({
        title: "Could not submit request",
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
            <span className="font-cursive text-2xl text-gold">
              MART101
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <BadgeCheck className="w-6 h-6 text-secondary" />
          <h1 className="text-2xl font-bold text-foreground">
            Verify Your Account
          </h1>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          Verification unlocks the verified badge on your profile and is
          required before Mart101 Pay can be enabled for your listings.
        </p>

        {status === "approved" && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm mb-6">
            You're verified. Your profile now shows the verified badge.
          </div>
        )}

        {status === "pending" && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-800 text-sm mb-6">
            Your request is under review. You cannot submit another
            request until the admin responds.
          </div>
        )}

        {status === "rejected" && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-6">
            Your previous request wasn't approved. You can update your
            details and resubmit below.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="matric">Matric Number</Label>
            <Input
              id="matric"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. 2021/CS/045"
              disabled={isLocked || submitting}
            />
          </div>

          <div>
            <Label htmlFor="id-photo-input">Student ID Photo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              A clear photo of your student ID card.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
              id="id-photo-input"
              disabled={isLocked || uploadingPhoto || submitting}
            />

            <div
              className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 transition-colors ${
                isLocked || uploadingPhoto || submitting
                  ? "opacity-70"
                  : "hover:border-secondary"
              }`}
            >
              {idPhotoUrl ? (
                <>
                  <img
                    src={idPhotoUrl}
                    alt="Student ID preview"
                    className="max-h-40 rounded-lg object-contain"
                  />

                  {!isLocked && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto || submitting}
                      aria-label="Remove student ID photo"
                      title="Remove photo"
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-white shadow-md transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  {!isLocked && (
                    <label
                      htmlFor="id-photo-input"
                      className="text-sm text-secondary cursor-pointer hover:underline"
                    >
                      {uploadingPhoto
                        ? "Uploading..."
                        : "Tap to replace photo"}
                    </label>
                  )}

                  {isLocked && (
                    <span className="text-xs text-muted-foreground">
                      Photo locked while your request is being reviewed.
                    </span>
                  )}
                </>
              ) : (
                <label
                  htmlFor="id-photo-input"
                  className={`flex w-full flex-col items-center justify-center gap-2 ${
                    isLocked || uploadingPhoto || submitting
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadingPhoto
                      ? "Uploading..."
                      : isLocked
                        ? "Photo upload unavailable"
                        : "Tap to upload"}
                  </span>
                </label>
              )}
            </div>

            {photoError && (
              <p className="text-xs text-destructive mt-1">
                {photoError}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              JPEG, PNG, or WebP. Maximum size: 5MB.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              uploadingPhoto ||
              isLocked
            }
            className="w-full h-12 font-semibold"
          >
            {submitting
              ? "Submitting..."
              : status === "pending"
                ? "Request Pending"
                : status === "approved"
                  ? "Verified"
                  : "Submit for Review"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default VerifyAccount;
