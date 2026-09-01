import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, ShoppingBag } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

interface ConversationRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message_at: string;
  other_name?: string;
  other_avatar?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  last_message?: string | null;
  unread_count?: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);

      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order("last_message_at", { ascending: false });

      if (!convos || convos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const otherIds = [...new Set(convos.map((c) =>
        c.buyer_id === session.user.id ? c.seller_id : c.buyer_id
      ))];
      const { data: profiles } = await supabase
        .rpc("get_seller_public_info", { seller_ids: otherIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const productIds = convos.map((c) => c.product_id).filter(Boolean) as string[];
      const { data: products } = productIds.length > 0
        ? await supabase.from("products").select("id, name, image_url").in("id", productIds)
        : { data: [] };
      const productMap = new Map((products || []).map((p) => [p.id, p]));

      const enriched = await Promise.all(convos.map(async (c) => {
        const otherId = c.buyer_id === session.user.id ? c.seller_id : c.buyer_id;
        const other = profileMap.get(otherId);
        const product = c.product_id ? productMap.get(c.product_id) : null;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, image_url")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .is("read_at", null)
          .neq("sender_id", session.user.id);

        return {
          ...c,
          other_name: other?.full_name || "User",
          other_avatar: other?.avatar_url || null,
          product_name: product?.name || null,
          product_image: product?.image_url || null,
          last_message: lastMsg?.content || (lastMsg?.image_url ? "📷 Photo" : "No messages yet"),
          unread_count: count || 0,
        };
      }));

      setConversations(enriched);
      setLoading(false);
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Messages</h1>

        {conversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No conversations yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((c) => (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className="flex items-center gap-3 bg-card rounded-xl border border-border/50 p-3 hover:shadow-md transition-shadow"
              >
                {c.other_avatar ? (
                  <img src={c.other_avatar} alt={c.other_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold shrink-0">
                    {c.other_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{c.other_name}</h3>
                    {(c.unread_count ?? 0) > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  {c.product_name && (
                    <p className="text-xs text-secondary flex items-center gap-1 truncate">
                      <ShoppingBag className="w-3 h-3" /> {c.product_name}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground truncate">{c.last_message}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
