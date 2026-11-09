import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PersistentNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsContextValue {
  unreadCount: number;
  notifications: PersistentNotification[];
  notificationUnreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<boolean>;
  markAllNotificationsAsRead: () => Promise<boolean>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  notifications: [],
  notificationUnreadCount: 0,
  refreshNotifications: async () => {},
  markNotificationAsRead: async () => false,
  markAllNotificationsAsRead: async () => false,
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<PersistentNotification[]>([]);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
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

  const refreshNotifications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user.id;
    if (!uid) {
      setNotifications([]);
      setNotificationUnreadCount(0);
      return;
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id,title,message,type,related_id,is_read,created_at")
        .eq("recipient_id", uid)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", uid)
        .eq("is_read", false),
    ]);

    if (error) {
      console.error("Failed to load notifications:", error.message);
      return;
    }
    if (countError) console.error("Failed to count unread notifications:", countError.message);
    setNotifications((data || []) as PersistentNotification[]);
    setNotificationUnreadCount(count ?? 0);
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user.id) return false;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("recipient_id", session.user.id);
    if (error) {
      console.error("Failed to mark notification as read:", error.message);
      return false;
    }
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    setNotificationUnreadCount((current) => Math.max(0, current - (notifications.some((item) => item.id === id && !item.is_read) ? 1 : 0)));
    return true;
  }, [notifications]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user.id) return false;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", session.user.id)
      .eq("is_read", false);
    if (error) {
      console.error("Failed to mark all notifications as read:", error.message);
      return false;
    }
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    setNotificationUnreadCount(0);
    return true;
  }, []);

  useEffect(() => {
    const init = async (uid: string) => {
      setUserId(uid);
      await refreshConversationIds(uid);
      await refreshUnreadCount(uid);
      await refreshNotifications();
      if (
        "Notification" in window &&
        Notification.permission !== "denied" &&
        !sessionStorage.getItem("push_subscribe_attempted")
      ) {
        sessionStorage.setItem("push_subscribe_attempted", "true");
        const { enablePushNotifications } = await import("@/lib/pushNotifications");
        enablePushNotifications();
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
        setNotifications([]);
        setNotificationUnreadCount(0);
        conversationIdsRef.current = new Set();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshConversationIds, refreshUnreadCount, refreshNotifications]);

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

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`persistent-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => { refreshNotifications(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refreshNotifications]);

  return (
    <NotificationsContext.Provider value={{
      unreadCount,
      notifications,
      notificationUnreadCount,
      refreshNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};
