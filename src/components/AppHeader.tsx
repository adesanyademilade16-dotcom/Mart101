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
import ConfirmModal from "@/components/ConfirmModal";

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
  const [mounted, setMounted] = useState(false); // in the DOM
  const [visible, setVisible] = useState(false); // slid into view
  const [loggedIn, setLoggedIn] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const openMenu = () => {
    setMounted(true);
    // wait one frame so the browser paints the closed position first,
    // then flip to visible so the transition actually animates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  };

  const closeMenu = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), 300); // matches duration-300
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setShowLogoutConfirm(false);
    closeMenu();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-navy text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={openMenu} aria-label="Open menu">
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

      {mounted && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className={`w-72 max-w-[80%] bg-navy text-white h-full overflow-y-auto transform transition-transform duration-300 ease-in-out ${
              visible ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" />
                <span className="font-cursive text-gold">MART101</span>
              </div>
              <button onClick={closeMenu} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
                >
                  <link.icon className="h-5 w-5 text-gold" />
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to={ADMIN_LINK.to}
                  onClick={closeMenu}
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
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/10"
                >
                  <link.icon className="h-5 w-5 text-gold" />
                  {link.label}
                </Link>
              ))}
              {loggedIn && (
                <button
                  onClick={requestLogout}
                  className="flex items-center gap-3 px-4 py-3 mt-2 text-red-300 hover:bg-white/10 text-left border-t border-white/10"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              )}
            </nav>
          </div>
          <div
            className={`flex-1 bg-black/50 transition-opacity duration-300 ease-in-out ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMenu}
          />
        </div>
      )}

      <ConfirmModal
        open={showLogoutConfirm}
        onOpenChange={(open) => setShowLogoutConfirm(open)}
        title="Log out"
        description="Are you sure you want to log out?"
        confirmLabel="Log out"
        variant="destructive"
        onConfirm={confirmLogout}
      />
    </header>
  );
};

export default AppHeader;
