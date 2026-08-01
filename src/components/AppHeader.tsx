import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, X, Home, Store, PlusCircle, LayoutDashboard, ShieldCheck,
  Info, HelpCircle, FileText, Lock, ClipboardCheck, Mail, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/marketplace", label: "Browse Marketplace", icon: Store },
  { to: "/dashboard?tab=sell", label: "Sell a Product", icon: PlusCircle },
  { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
];

const ADMIN_LINK = { to: "/admin", label: "Admin Dashboard", icon: ShieldCheck };

const INFO_LINKS = [
  { to: "/about", label: "About Us", icon: Info },
  { to: "/help", label: "Need Help", icon: HelpCircle },
  { to: "/terms", label: "Terms of Service", icon: FileText },
  { to: "/privacy", label: "Privacy Policy", icon: Lock },
  { to: "/condition-policy", label: "Condition Policy", icon: ClipboardCheck },
  { to: "/contact", label: "Contact Us", icon: Mail },
];

const AppHeader = () => {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/login");
  };

<Link to="/" className="flex items-center gap-2">
  <BrandLogo size="sm" />
  <span className="font-logo text-lg text-gold tracking-wide">MART101</span>
</Link>
  
  return (
    <header className="sticky top-0 z-40 bg-navy text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-cursive text-lg text-gold">MART101</span>
          </Link>
        </div>
        {loggedIn ? (
          <Button asChild size="sm" className="bg-gold text-navy hover:bg-gold/90">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="bg-gold text-navy hover:bg-gold/90">
            <Link to="/login">Login</Link>
          </Button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[80%] bg-navy text-white h-full overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" />
                <span className="font-cursive text-gold">MART101</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
                >
                  <link.icon className="h-5 w-5 text-gold" />
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to={ADMIN_LINK.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
                >
                  <ADMIN_LINK.icon className="h-5 w-5 text-gold" />
                  {ADMIN_LINK.label}
                </Link>
              )}
              {INFO_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
                >
                  <link.icon className="h-5 w-5 text-gold" />
                  {link.label}
                </Link>
              ))}
              {loggedIn && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 mt-2 text-red-300 hover:bg-white/10 text-left border-t border-white/10"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              )}
            </nav>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}
    </header>
  );
};

export default AppHeader;
