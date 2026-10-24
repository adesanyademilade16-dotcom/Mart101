import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";

type PaymentStatus = "not_requested" | "pending" | "approved" | "rejected";

const EnablePayments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("not_requested");
  const [editingApproved, setEditingApproved] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const isLocked = status === "pending" || (status === "approved" && !editingApproved);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("payment_status, bank_name, account_number, account_name")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setStatus(data.payment_status);
        setBankName(data.bank_name || "");
        setAccountNumber(data.account_number || "");
        setAccountName(data.account_name || "");
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!bankName || !accountNumber || !accountName) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let query = supabase
      .from("profiles")
      .update({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        payment_status: "pending",
        payment_requested_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    // Guard against a stale tab: only allow the exact transition we think we're making
    query = editingApproved
      ? query.eq("payment_status", "approved")
      : query.neq("payment_status", "pending").neq("payment_status", "approved");

    const { data, error } = await query.select("payment_status");
    setSubmitting(false);

    if (error) {
      toast({ title: "Could not submit request", variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: "Your status changed — please refresh and try again", variant: "destructive" });
      return;
    }

    setStatus("pending");
    setEditingApproved(false);
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
          <ShieldCheck className="w-6 h-6 text-secondary" />
          <h1 className="text-2xl font-bold text-foreground">Enable Mart101 Pay</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Let buyers pay securely through Mart101. Payment is held until the buyer confirms
          they've received their item, then sent to the bank details below.
        </p>

        {status === "approved" && !editingApproved && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm mb-6 space-y-2">
            <p>You're approved. Buyers can pay for your eligible listings.</p>
            <Button size="sm" variant="outline" onClick={() => setEditingApproved(true)}>
              Request to Edit Details
            </Button>
          </div>
        )}
        {status === "pending" && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-800 text-sm mb-6">
            Your request is under review. You can't submit again until the admin responds.
          </div>
        )}
        {status === "rejected" && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm mb-6">
            Your previous request wasn't approved. Update your details and resubmit below.
          </div>
        )}
        {editingApproved && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm mb-6">
            Updating your details will pause Mart101 Pay on your listings until an admin re-approves them.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" disabled={isLocked} />
          </div>
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="10-digit account number" disabled={isLocked} />
          </div>
          <div>
            <Label htmlFor="accountName">Account Name</Label>
            <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Must match your bank account" disabled={isLocked} />
          </div>

          {!isLocked && (
            <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 font-semibold">
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default EnablePayments;
