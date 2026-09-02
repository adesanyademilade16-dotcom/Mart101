import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Image as ImageIcon, ShoppingBag, Check, CheckCheck, X, Pencil, Trash2, MoreVertical } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ConfirmModal from "@/components/ConfirmModal";

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
  read_at: string | null;
  edited_at: string | null;
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

  // Image about to be sent — shown as a preview instead of auto-sending
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // Which message's action menu (edit/delete) is open
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<string | null>(null);
  const [deleteChatConfirm, setDeleteChatConfirm] = useState(false);

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

  // Realtime: new messages, read-status updates, edits, and deletions
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          if (newMsg.sender_id !== userId) {
            supabase.rpc("mark_conversation_read", { _conversation_id: id });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Only JPEG, PNG, and WebP images are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: "Image must be under 5MB.", variant: "destructive" });
      return;
    }

    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cancelPendingImage = () => {
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  const confirmSendImage = async () => {
    if (!pendingImage || !id || !userId) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingImage);
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

      cancelPendingImage();
    } catch {
      toast({ title: "Failed to send image", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(msg.content || "");
    setActiveMessageId(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const saveEdit = async (messageId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from("messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) {
      toast({ title: "Failed to edit message", variant: "destructive" });
      return;
    }
    // Reflect locally right away; realtime UPDATE will also confirm it.
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m))
    );
    cancelEdit();
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageTarget) return;
    const { error } = await supabase.from("messages").delete().eq("id", deleteMessageTarget);
    if (error) {
      toast({ title: "Failed to delete message", variant: "destructive" });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== deleteMessageTarget));
    }
    setDeleteMessageTarget(null);
  };

  const confirmDeleteChat = async () => {
    if (!id) return;
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    setDeleteChatConfirm(false);
    if (error) {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
      return;
    }
    toast({ title: "Conversation deleted" });
    navigate("/messages");
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
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-foreground truncate">{otherName}</h1>
            {productName && productId && (
              <Link to={`/product/${productId}`} className="text-xs text-secondary flex items-center gap-1 hover:underline truncate">
                <ShoppingBag className="w-3 h-3 shrink-0" /> {productName}
              </Link>
            )}
          </div>
          <button
            onClick={() => setDeleteChatConfirm(true)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 shrink-0"
            title="Delete conversation"
            aria-label="Delete conversation"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Start the conversation.
            </p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              const isEditing = editingMessageId === msg.id;
              const showActions = activeMessageId === msg.id;

              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    onClick={() => isMine && !msg.image_url && setActiveMessageId(showActions ? null : msg.id)}
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? "cursor-pointer" : ""} ${
                      isMine
                        ? "bg-secondary text-secondary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.image_url && (
                      <div className="relative group">
                        <img src={msg.image_url} alt="Sent" className="rounded-lg max-w-full mb-1" loading="lazy" />
                        {isMine && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteMessageTarget(msg.id); }}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-80 hover:opacity-100"
                            title="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                          className="flex-1 bg-background/80 text-foreground rounded-lg px-2 py-1 text-sm outline-none"
                        />
                        <button onClick={() => saveEdit(msg.id)} className="text-xs font-semibold shrink-0">Save</button>
                        <button onClick={cancelEdit} className="text-xs shrink-0 opacity-70">Cancel</button>
                      </div>
                    ) : (
                      msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}

                    <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                      {msg.edited_at && (
                        <span className={`text-[10px] ${isMine ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>
                          edited
                        </span>
                      )}
                      <p className={`text-[10px] ${isMine ? "text-secondary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {isMine && (
                        msg.read_at ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-secondary-foreground/70" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Edit / Delete actions for your own text messages */}
                  {isMine && showActions && !isEditing && msg.content && (
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <button onClick={() => startEdit(msg)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => setDeleteMessageTarget(msg.id)} className="text-xs text-destructive flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pending image preview — shown before sending */}
        {pendingImagePreview && (
          <div className="flex items-center gap-3 py-2 px-1 border-t border-border/50">
            <div className="relative">
              <img src={pendingImagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
              <button
                onClick={cancelPendingImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <Button onClick={confirmSendImage} variant="secondary" size="sm" disabled={uploadingImage}>
              {uploadingImage ? "Sending…" : "Send Photo"}
            </Button>
          </div>
        )}

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

      <ConfirmModal
        open={!!deleteMessageTarget}
        onOpenChange={(open) => { if (!open) setDeleteMessageTarget(null); }}
        title="Delete Message"
        description="Delete this message? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteMessage}
      />

      <ConfirmModal
        open={deleteChatConfirm}
        onOpenChange={setDeleteChatConfirm}
        title="Delete Conversation"
        description="Delete this entire conversation? This will remove it for both you and the other person and cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteChat}
      />
    </div>
  );
};

export default Conversation;
