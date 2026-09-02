import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationsContextValue {
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextValue>({ unreadCount: 0 });

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const conversationIdsRef = useRef<Set<string>>(new Set());
  const locationRef = useRef(location);
  locationRef.current = location;

  const refreshConversationIds = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
    conversationIdsRef.current = new Set((data || []).map((c) => c.id));
  }, []);

  const refreshUnreadCount = useCallback(async (uid: string) => {
    const ids = Array.from(conversationIdsRef.current);
    if (ids.length === 0) {
      setUnreadCount(0);
      return;
    }
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", uid)
      .is("read_at", null)
      .in("conversation_id", ids);
    setUnreadCount(count || 0);
  }, []);

  useEffect(() => {
    const init = async (uid: string) => {
      setUserId(uid);
      await refreshConversationIds(uid);
      await refreshUnreadCount(uid);
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) init(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        init(session.user.id);
      } else {
        setUserId(null);
        setUnreadCount(0);
        conversationIdsRef.current = new Set();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshConversationIds, refreshUnreadCount]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("global-messages-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as {
            id: string; conversation_id: string; sender_id: string;
            content: string | null; image_url: string | null;
          };
          if (msg.sender_id === userId) return;

          if (!conversationIdsRef.current.has(msg.conversation_id)) {
            await refreshConversationIds(userId);
            if (!conversationIdsRef.current.has(msg.conversation_id)) return;
          }

          // Already viewing this exact conversation — its own page handles
          // display and marking as read, so skip the toast/count bump here.
          if (locationRef.current.pathname === `/messages/${msg.conversation_id}`) return;

          refreshUnreadCount(userId);

          const { data: senderProfile } = await supabase
            .rpc("get_seller_public_info", { seller_ids: [msg.sender_id] });
          const senderName = senderProfile?.[0]?.full_name || "Someone";
          const preview = msg.content || (msg.image_url ? "📷 Sent a photo" : "New message");

          toast({ title: `New message from ${senderName}`, description: preview });

          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            new Notification(`${senderName} · MART101`, { body: preview, icon: "/icon-192.png" });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => refreshUnreadCount(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshConversationIds, refreshUnreadCount, toast]);

  return (
    <NotificationsContext.Provider value={{ unreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};
