import { useCallback, useEffect, useState } from "react";
import { Camera, MessageSquare, Send, ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

type ViewerMode = "buyer" | "seller" | "admin";

interface DisputeCase {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  reason: string;
  status: "open" | "under_review" | "resolved";
  resolution: "seller_favor" | "buyer_refund" | "other" | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  evidence_url: string | null;
  created_at: string;
}

interface DisputeThreadProps {
  orderId: string;
  mode: ViewerMode;
}

const DisputeThread = ({ orderId, mode }: DisputeThreadProps) => {
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<DisputeCase | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [decision, setDecision] = useState("seller_favor");
  const [decisionNote, setDecisionNote] = useState("");
  const [savingDecision, setSavingDecision] = useState(false);

  const loadThread = useCallback(async () => {
    const [{ data: { session } }, { data: dispute, error: disputeError }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.from("order_disputes").select("*").eq("order_id", orderId).maybeSingle(),
    ]);
    if (session?.user?.id) setCurrentUserId(session.user.id);
    if (disputeError) {
      toast({ title: "Could not load dispute", description: disputeError.message, variant: "destructive" });
      setCaseData(null);
      setMessages([]);
      setLoading(false);
      return;
    }
    if (!dispute) {
      setCaseData(null);
      setMessages([]);
      setLoading(false);
      return;
    }
    setCaseData(dispute as DisputeCase);
    setDecision((dispute as DisputeCase).resolution || "seller_favor");
    setDecisionNote((dispute as DisputeCase).resolution_note || "");
    const { data: messageRows, error: messageError } = await supabase
      .from("order_dispute_messages")
      .select("*")
      .eq("dispute_id", dispute.id)
      .order("created_at", { ascending: true });
    if (messageError) {
      toast({ title: "Could not load dispute messages", description: messageError.message, variant: "destructive" });
    } else {
      setMessages((messageRows || []) as DisputeMessage[]);
    }
    setLoading(false);
  }, [orderId, toast]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadThread().then(() => { if (!active) return; });
    return () => { active = false; };
  }, [loadThread]);

  const refreshThread = async () => {
    setLoading(true);
    await loadThread();
  };

  const sendMessage = async () => {
    if (!caseData || !currentUserId) return;
    if (!draft.trim() && !evidence) {
      toast({ title: "Add a message or evidence", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      let evidenceUrl: string | null = null;
      if (evidence) {
        if (!evidence.type.startsWith("image/")) throw new Error("Please choose an image file.");
        if (evidence.size > 10 * 1024 * 1024) throw new Error("Evidence image must be smaller than 10 MB.");
        const formData = new FormData();
        formData.append("file", evidence);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error?.message || `Evidence upload failed (${response.status}).`);
        evidenceUrl = payload?.secure_url;
        if (typeof evidenceUrl !== "string" || !evidenceUrl.startsWith(`https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`)) {
          throw new Error("Cloudinary did not return a valid evidence image URL.");
        }
      }

      const { data, error } = await supabase
        .from("order_dispute_messages")
        .insert({
          dispute_id: caseData.id,
          sender_id: currentUserId,
          message: draft.trim(),
          evidence_url: evidenceUrl,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setMessages((previous) => [...previous, data as DisputeMessage]);
      setDraft("");
      setEvidence(null);
      toast({ title: "Response sent" });
    } catch (error) {
      toast({ title: "Could not send response", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const startReview = async () => {
    if (!caseData) return;
    const { data, error } = await supabase
      .from("order_disputes")
      .update({ status: "under_review" })
      .eq("id", caseData.id)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Could not update case", description: error.message, variant: "destructive" });
      return;
    }
    setCaseData(data as DisputeCase);
    toast({ title: "Dispute moved to review" });
  };

  const resolveCase = async () => {
    if (!caseData || !currentUserId) return;
    if (!decisionNote.trim()) {
      toast({ title: "Add the reason for your decision", variant: "destructive" });
      return;
    }
    setSavingDecision(true);
    const { data, error } = await supabase
      .from("order_disputes")
      .update({
        status: "resolved",
        resolution: decision,
        resolution_note: decisionNote.trim(),
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", caseData.id)
      .select("*")
      .single();
    setSavingDecision(false);
    if (error) {
      toast({ title: "Could not record decision", description: error.message, variant: "destructive" });
      return;
    }
    setCaseData(data as DisputeCase);
    toast({ title: "Dispute decision recorded", description: "The order remains blocked from payout until the separate payout/refund process is completed." });
  };

  if (loading) return <div className="mt-3 rounded-lg border border-border p-3 text-xs text-muted-foreground">Loading dispute conversation…</div>;
  if (!caseData) return <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">Dispute case not found. Refresh after the dispute has been submitted.</div>;

  const senderLabel = (senderId: string) => senderId === caseData.buyer_id ? "Buyer" : senderId === caseData.seller_id ? "Seller" : "MART101 Admin";

  return (
    <section className="mt-4 rounded-xl border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-sm"><MessageSquare className="w-4 h-4" /> Dispute conversation</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={refreshThread} disabled={loading} className="h-7 px-2 text-[11px]"><RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${caseData.status === "resolved" ? "bg-emerald-500/10 text-emerald-600" : caseData.status === "under_review" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
            {caseData.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>
      <div className="rounded-lg bg-background p-3 text-xs">
        <p className="font-medium mb-1">Original issue reported by buyer</p>
        <p className="whitespace-pre-wrap">{caseData.reason}</p>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No responses or evidence have been added yet.</p>
        ) : messages.map((item) => (
          <div key={item.id} className={`rounded-lg p-3 text-xs ${item.sender_id === currentUserId ? "bg-primary/10 ml-3" : "bg-background mr-3"}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold">{senderLabel(item.sender_id)}</span>
              <span className="text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
            </div>
            {item.message && <p className="whitespace-pre-wrap break-words">{item.message}</p>}
            {item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer" className="inline-flex mt-2 items-center gap-2 text-secondary underline"><img src={item.evidence_url} alt="Dispute evidence" className="h-16 w-16 rounded-md border border-border object-cover" /> View evidence</a>}
          </div>
        ))}
      </div>

      {caseData.status !== "resolved" && (
        <div className="space-y-2 border-t border-border pt-3">
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={mode === "seller" ? "Write your response to the buyer and MART101…" : mode === "buyer" ? "Add more details for the seller and MART101…" : "Add an admin update…"} rows={3} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-xs hover:bg-accent">
              <Camera className="w-4 h-4" /> {evidence ? evidence.name : "Attach evidence image"}
              <input type="file" accept="image/*" className="hidden" onChange={(event) => setEvidence(event.target.files?.[0] || null)} />
            </label>
            <Button size="sm" onClick={sendMessage} disabled={sending || (!draft.trim() && !evidence)}><Send className="w-3.5 h-3.5" /> {sending ? "Sending…" : "Send response"}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Evidence images are stored using MART101's existing Cloudinary upload configuration.</p>
        </div>
      )}

      {mode === "admin" && caseData.status !== "resolved" && (
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Admin review</p>
            {caseData.status === "open" && <Button size="sm" variant="outline" onClick={startReview}>Mark under review</Button>}
          </div>
          <label className="block text-xs font-medium">Decision</label>
          <select value={decision} onChange={(event) => setDecision(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="seller_favor">Seller's favour — eligible for later payout review</option>
            <option value="buyer_refund">Buyer refund approved — not yet processed</option>
            <option value="other">Other / manual follow-up required</option>
          </select>
          <Textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Explain the decision and any next steps…" rows={3} />
          <Button size="sm" onClick={resolveCase} disabled={savingDecision || !decisionNote.trim()}>{savingDecision ? "Saving decision…" : "Record final decision"}</Button>
          <p className="text-[11px] text-muted-foreground">Recording a buyer-refund decision does not process a Paystack refund. The order stays disputed until the actual refund or payout workflow is completed.</p>
        </div>
      )}

      {caseData.status === "resolved" && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-1">
          <p className="font-semibold text-emerald-700">Decision recorded: {caseData.resolution?.replaceAll("_", " ")}</p>
          {caseData.resolution_note && <p className="whitespace-pre-wrap">{caseData.resolution_note}</p>}
          <p className="text-muted-foreground">This decision does not itself transfer money or process a refund. The order remains excluded from payout until the appropriate next step is completed.</p>
        </div>
      )}
    </section>
  );
};

export default DisputeThread;
