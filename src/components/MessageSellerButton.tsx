import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MessageSellerButtonProps {
  sellerId: string;
  productId?: string;
  className?: string;
}

const MessageSellerButton = ({ sellerId, productId, className }: MessageSellerButtonProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Please log in to message the seller", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (session.user.id === sellerId) {
      toast({ title: "This is your own listing" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      _seller_id: sellerId,
      _product_id: productId ?? null,
    });
    setLoading(false);

    if (error || !data) {
      toast({ title: "Could not start conversation", variant: "destructive" });
      return;
    }
    navigate(`/messages/${data}`);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      className={className}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      {loading ? "Opening…" : "Message Seller"}
    </Button>
  );
};

export default MessageSellerButton;
