import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Image as ImageIcon, ShoppingBag } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CLOUDINARY_CLOUD_NAME = "oxt5nzu7";
const CLOUDINARY_UPLOAD_PRESET = "mart101_avatars";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

const Conversation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);

      const { data: convo, error: convoError } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single();

      if (convoError || !convo) {
        toast({ title: "Conversation not found", variant: "destructive" });
        navigate("/messages");
        return;
      }

      const otherId = convo.buyer_id === session.user.id ? convo.seller_id : convo.buyer_id;
      const { data: profileArr } = await supabase
        .rpc("get_seller_public_info", { seller_ids: [otherId] });
      const other = profileArr?.[0];
      setOtherName(other?.full_name || "User");
      setOtherAvatar(other?.avatar_url || null);

      if (convo.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("id, name")
          .eq("id", convo.product_id)
          .maybeSingle();
        setProductName(product?.name || null);
        setProductId(product?.id || null);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
      setLoading(false);

      await supabase.rpc("mark_conversation_read", { _conversation_id: id });
    };
    load();
  }, [id, navigate, toast]);

  // Realtime: listen for new messages in this conversation
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if ((payload.new as Message).sender_id !== userId) {
            supabase.rpc("mark_conversation_read", { _conversation_id: id });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !id || !userId) return;

    setSending(true);
    setText("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: userId,
      content: trimmed,
    });
    setSending(false);

    if (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
      setText(trimmed);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !userId) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Only JPEG, PNG, and WebP images are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "Image must be under 5MB.", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: userId,
        image_url: data.secure_url,
      });
      if (error) throw error;
    } catch {
      toast({ title: "Failed to send image", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="container mx-auto px-4 py-3 max-w-2xl flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 pb-3 border-b border-border/50">
          <Link to="/messages" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {otherAvatar ? (
            <img src={otherAvatar} alt={otherName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
              {otherName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground truncate">{otherName}</h1>
            {productName && productId && (
              <Link to={`/product/${productId}`} className="text-xs text-secondary flex items-center gap-1 hover:underline truncate">
                <ShoppingBag className="w-3 h-3 shrink-0" /> {productName}
              </Link>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Say hello 👋 — start the conversation.
            </p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMine
                        ? "bg-secondary text-secondary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.image_url && (
                      <img src={msg.image_url} alt="Sent" className="rounded-lg max-w-full mb-1" loading="lazy" />
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                    <p className={`text-[10px] mt-1 ${isMine ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSendText} className="flex items-center gap-2 py-3 border-t border-border/50">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary"
          />
          <Button type="submit" size="icon" variant="secondary" disabled={sending || !text.trim()} className="shrink-0 rounded-full">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Conversation;
