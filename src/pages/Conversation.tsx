import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, ShoppingBag, Check, CheckCheck, X, Pencil, Trash2, Smile, MapPin, Navigation, Radio, StopCircle, Clock, MapPinned } from "lucide-react";
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

const EMOJIS = [
  "😀", "😂", "😍", "😊", "😉", "😢", "😭", "😡", "👍", "👎",
  "🙏", "👏", "🔥", "❤️", "💯", "🎉", "😴", "🤔", "😅", "🙌",
  "✅", "❌", "📦", "💰", "🛍️", "📱", "💻", "👕", "📚", "🚗",
];

interface LocationShare {
  id: string;
  conversation_id: string;
  message_id: string;
  sender_id: string;
  latitude: number;
  longitude: number;
  share_type: "once" | "live";
  expires_at: string | null;
  stopped_at: string | null;
  created_at: string;
  updated_at: string;
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const locationWatchRef = useRef<number | null>(null);
  const activeTrackedShareRef = useRef<string | null>(null);
  const lastLocationUpdateRef = useRef(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [productName, setProductName] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [locationShares, setLocationShares] = useState<LocationShare[]>([]);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [liveDuration, setLiveDuration] = useState(30);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [trackedShareId, setTrackedShareId] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

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

      const { data: shares, error: sharesError } = await supabase
        .from("location_shares")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (sharesError) {
        console.error("Unable to load location shares:", sharesError);
        toast({ title: "Some shared locations could not be loaded", variant: "destructive" });
      }
      setLocationShares((shares || []) as LocationShare[]);
      setLoading(false);

      await supabase.rpc("mark_conversation_read", { _conversation_id: id });
    };
    load();
  }, [id, navigate, toast]);

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
          setLocationShares((prev) => prev.filter((share) => share.message_id !== deletedId));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_shares", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const share = payload.new as LocationShare;
          setLocationShares((prev) => prev.some((item) => item.id === share.id) ? prev : [...prev, share]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "location_shares", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const share = payload.new as LocationShare;
          setLocationShares((prev) => prev.map((item) => item.id === share.id ? { ...item, ...share } : item));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "location_shares", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setLocationShares((prev) => prev.filter((item) => item.id !== deletedId));
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

  // Live GPS updates run only while this conversation page is open.
  // Browsers may suspend location access when the tab is backgrounded or closed.
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const tracked = locationShares.find((share) => share.id === activeTrackedShareRef.current);
    const expired = tracked?.expires_at ? new Date(tracked.expires_at).getTime() <= clockNow : false;
    if (activeTrackedShareRef.current && (!tracked || tracked.stopped_at || expired)) {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
      locationWatchRef.current = null;
      activeTrackedShareRef.current = null;
      setTrackedShareId(null);
    }
  }, [locationShares, clockNow]);

  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
      locationWatchRef.current = null;
      activeTrackedShareRef.current = null;
    };
  }, []);

  // Close the emoji picker when tapping outside it
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  // Auto-grow the textarea as the user types, up to a max height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const handleSendText = async () => {
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

  // Enter alone inserts a newline (default textarea behavior); only the
  // Send button submits. No special-casing needed here.

  const getCurrentGpsPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location sharing."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Allow location access in your browser settings and try again."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Your current location is unavailable. Check your device GPS and try again."
            : "Location request timed out. Please try again.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

  const beginLiveLocationWatch = (shareId: string) => {
    if (!navigator.geolocation) return;
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
    activeTrackedShareRef.current = shareId;
    setTrackedShareId(shareId);
    lastLocationUpdateRef.current = Date.now();

    locationWatchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const now = Date.now();
        // Limit writes to at most one GPS update every 10 seconds.
        if (now - lastLocationUpdateRef.current < 10000) return;
        lastLocationUpdateRef.current = now;
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const { error } = await supabase
          .from("location_shares")
          .update({ latitude, longitude })
          .eq("id", shareId);
        if (error) {
          console.error("Live location update failed:", error);
          toast({ title: "Live location update paused", description: "Check your connection and resume sharing.", variant: "destructive" });
          if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
          locationWatchRef.current = null;
          activeTrackedShareRef.current = null;
          setTrackedShareId(null);
          return;
        }
        setLocationShares((prev) => prev.map((share) => share.id === shareId
          ? { ...share, latitude, longitude, updated_at: new Date().toISOString() }
          : share));
      },
      (error) => {
        console.warn("Live location watch error:", error.message);
        if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
        activeTrackedShareRef.current = null;
        setTrackedShareId(null);
        toast({ title: "Live location updates stopped", description: "You can resume updates from the location card.", variant: "destructive" });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  };

  const handleShareLocation = async (shareType: "once" | "live") => {
    if (!id || !userId || sharingLocation) return;
    const activeOwnShare = locationShares.find((share) =>
      share.sender_id === userId && share.share_type === "live" && !share.stopped_at &&
      !!share.expires_at && new Date(share.expires_at).getTime() > Date.now()
    );
    if (shareType === "live" && activeOwnShare) {
      toast({ title: "You already have an active live share", description: "Stop it or resume its updates from the existing location card." });
      setShowLocationMenu(false);
      return;
    }

    setSharingLocation(true);
    try {
      // The browser asks for GPS permission only after the user taps a share action.
      const position = await getCurrentGpsPosition();
      const { data, error } = await supabase.rpc("create_location_share", {
        _conversation_id: id,
        _latitude: position.coords.latitude,
        _longitude: position.coords.longitude,
        _share_type: shareType,
        _duration_minutes: shareType === "live" ? liveDuration : 60,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const shareId = result?.created_location_share_id;
      if (!shareId) throw new Error("The location was sent, but its share record could not be confirmed. Reload the chat.");

      const { data: createdShare, error: fetchError } = await supabase
        .from("location_shares")
        .select("*")
        .eq("id", shareId)
        .single();
      if (fetchError) throw fetchError;
      const share = createdShare as LocationShare;
      setLocationShares((prev) => prev.some((item) => item.id === share.id) ? prev : [...prev, share]);
      setShowLocationMenu(false);
      toast({ title: shareType === "live" ? "Live location shared" : "Location shared" });
      if (shareType === "live") beginLiveLocationWatch(share.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to share your location.";
      toast({ title: "Location not shared", description: message, variant: "destructive" });
    } finally {
      setSharingLocation(false);
    }
  };

  const handleResumeLiveLocation = async (share: LocationShare) => {
    if (sharingLocation) return;
    setSharingLocation(true);
    try {
      const position = await getCurrentGpsPosition();
      const { error } = await supabase
        .from("location_shares")
        .update({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        .eq("id", share.id);
      if (error) throw error;
      setLocationShares((prev) => prev.map((item) => item.id === share.id
        ? { ...item, latitude: position.coords.latitude, longitude: position.coords.longitude, updated_at: new Date().toISOString() }
        : item));
      beginLiveLocationWatch(share.id);
      toast({ title: "Live location updates resumed" });
    } catch (error) {
      toast({ title: "Could not resume live location", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSharingLocation(false);
    }
  };

  const handleStopLiveLocation = async (share: LocationShare) => {
    const { data, error } = await supabase
      .from("location_shares")
      .update({ stopped_at: new Date().toISOString() })
      .eq("id", share.id)
      .select("*")
      .single();
    if (error) {
      toast({ title: "Could not stop live location", description: error.message, variant: "destructive" });
      return;
    }
    if (locationWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatchRef.current);
    locationWatchRef.current = null;
    activeTrackedShareRef.current = null;
    setTrackedShareId(null);
    setLocationShares((prev) => prev.map((item) => item.id === share.id ? data as LocationShare : item));
    toast({ title: "Live location sharing stopped" });
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    textareaRef.current?.focus();
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
              const locationShare = locationShares.find((share) => share.message_id === msg.id);
              const liveExpired = !!locationShare?.expires_at && new Date(locationShare.expires_at).getTime() <= clockNow;
              const liveActive = !!locationShare && locationShare.share_type === "live" && !locationShare.stopped_at && !liveExpired;
              const isTrackingThisShare = trackedShareId === locationShare?.id;
              const mapsUrl = locationShare
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locationShare.latitude},${locationShare.longitude}`)}`
                : "";

              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    onClick={() => isMine && !msg.image_url && !locationShare && setActiveMessageId(showActions ? null : msg.id)}
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

                    {locationShare && (
                      <div className="mt-2 min-w-[200px] max-w-full rounded-xl border border-border/60 bg-background/70 p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2">
                          <div className="rounded-full bg-secondary/15 p-2 text-secondary"><MapPinned className="h-5 w-5" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{locationShare.share_type === "live" ? "Live location" : "Shared location"}</p>
                            <p className="mt-0.5 text-[11px] opacity-75">
                              {locationShare.share_type === "once"
                                ? "A pinned location"
                                : locationShare.stopped_at
                                  ? "Sharing stopped"
                                  : liveExpired
                                    ? "Sharing expired"
                                    : `Temporary sharing · expires ${new Date(locationShare.expires_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                            {locationShare.share_type === "live" && !locationShare.stopped_at && !liveExpired && (
                              <p className="mt-1 text-[10px] opacity-70">Last update: {new Date(locationShare.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                            )}
                          </div>
                        </div>
                        <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:opacity-90">
                          <Navigation className="h-3.5 w-3.5" /> Open in Google Maps
                        </a>
                        {isMine && liveActive && (
                          <div className="mt-2 flex gap-2">
                            {!isTrackingThisShare && (
                              <button type="button" onClick={() => handleResumeLiveLocation(locationShare)} disabled={sharingLocation} className="flex-1 rounded-lg border border-border px-2 py-2 text-[11px] font-medium hover:bg-muted disabled:opacity-50">
                                Resume updates
                              </button>
                            )}
                            <button type="button" onClick={() => handleStopLiveLocation(locationShare)} className="flex-1 rounded-lg border border-destructive/40 px-2 py-2 text-[11px] font-medium text-destructive hover:bg-destructive/10">
                              <StopCircle className="mr-1 inline h-3.5 w-3.5" /> Stop sharing
                            </button>
                          </div>
                        )}
                        {locationShare.share_type === "live" && liveActive && !isMine && (
                          <p className="mt-2 text-[10px] opacity-70">Updates are available while the sender's chat is open and their device permits location access.</p>
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
                      msg.content && !locationShare && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
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

                  {isMine && showActions && !isEditing && msg.content && !locationShare && (
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

        {/* WhatsApp-style input row: emoji (left) · rounded bar with attachment inside · circular send (right) */}
        <div className="relative py-3 border-t border-border/50">
          {showLocationMenu && (
            <div className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Share your location</p>
                <button type="button" onClick={() => setShowLocationMenu(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Close location menu"><X className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={() => handleShareLocation("once")} disabled={sharingLocation} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted disabled:opacity-50">
                <MapPin className="h-5 w-5 text-secondary" />
                <span><span className="block text-sm font-medium">Send current location</span><span className="block text-[11px] text-muted-foreground">Share one pinned location</span></span>
              </button>
              <div className="my-2 border-t border-border/60" />
              <div className="flex items-center justify-between gap-2 px-3 pb-2">
                <span className="text-sm font-medium">Live location</span>
                <select value={liveDuration} onChange={(e) => setLiveDuration(Number(e.target.value))} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              <button type="button" onClick={() => handleShareLocation("live")} disabled={sharingLocation} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted disabled:opacity-50">
                <Radio className="h-5 w-5 text-secondary" />
                <span><span className="block text-sm font-medium">Start live sharing</span><span className="block text-[11px] text-muted-foreground">Updates while this chat is open</span></span>
              </button>
              {sharingLocation && <p className="px-3 pb-1 text-[11px] text-muted-foreground">Getting your location…</p>}
              <p className="mt-2 flex items-start gap-1.5 px-3 text-[10px] leading-relaxed text-muted-foreground"><Clock className="mt-0.5 h-3 w-3 shrink-0" /> Live sharing expires automatically. You can stop it at any time. GPS may pause if your browser backgrounds or closes.</p>
            </div>
          )}

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-lg p-3 grid grid-cols-6 gap-1 z-10 w-64"
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-xl hover:bg-muted rounded-lg p-1.5 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="shrink-0 text-muted-foreground hover:text-foreground p-2"
              aria-label="Emoji"
            >
              <Smile className="w-6 h-6" />
            </button>

            <div className="flex-1 flex items-end gap-1 bg-muted rounded-3xl px-2 py-1.5 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="shrink-0 text-muted-foreground hover:text-foreground p-1.5"
                aria-label="Attach image"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => { setShowEmojiPicker(false); setShowLocationMenu((prev) => !prev); }}
                className={`shrink-0 p-1.5 transition-colors ${showLocationMenu ? "text-secondary" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Share location"
                title="Share location"
              >
                <MapPin className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5 max-h-[120px] min-w-0"
              />
            </div>

            <Button
              type="button"
              onClick={handleSendText}
              size="icon"
              variant="secondary"
              disabled={sending || !text.trim()}
              className="shrink-0 rounded-full w-11 h-11"
            >
              <Send className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
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
