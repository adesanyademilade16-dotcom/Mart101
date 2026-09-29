import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  productId: string;
  className?: string;
  // When a parent page already knows the like count / liked state for many
  // products at once (batched), it passes them here and sets skipFetch so
  // this component doesn't run its own network request per card.
  initialLiked?: boolean;
  initialCount?: number;
  skipFetch?: boolean;
}

const LikeButton = ({ productId, className, initialLiked, initialCount, skipFetch }: LikeButtonProps) => {
  const { toast } = useToast();
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [count, setCount] = useState(initialCount ?? 0);
  const [loading, setLoading] = useState(!skipFetch);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (skipFetch) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const { count: totalCount } = await supabase
        .from("product_likes")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);
      setCount(totalCount || 0);

      if (session) {
        const { data: existing } = await supabase
          .from("product_likes")
          .select("id")
          .eq("product_id", productId)
          .eq("user_id", session.user.id)
          .maybeSingle();
        setLiked(!!existing);
      }
      setLoading(false);
    };
    load();
  }, [productId, skipFetch]);

  const handleToggle = async () => {
    if (busy) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Please log in to like products", variant: "destructive" });
      return;
    }

    setBusy(true);
    if (liked) {
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("product_likes")
        .delete()
        .eq("product_id", productId)
        .eq("user_id", session.user.id);
      if (error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    } else {
      setLiked(true);
      setCount((c) => c + 1);
      const { error } = await supabase
        .from("product_likes")
        .insert({ product_id: productId, user_id: session.user.id });
      if (error) {
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      }
    }
    setBusy(false);
  };

  if (loading) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 ${className || ""}`}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart className={`w-5 h-5 transition-colors ${liked ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
      <span className={`text-sm font-medium ${liked ? "text-destructive" : "text-muted-foreground"}`}>
        {count}
      </span>
    </button>
  );
};

export default LikeButton;
