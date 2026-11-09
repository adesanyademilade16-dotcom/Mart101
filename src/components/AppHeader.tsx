import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu, X, Home, Store, PlusCircle, LayoutDashboard, ShieldCheck, Bell,
  Info, HelpCircle, FileText, Lock, ClipboardCheck, Mail, LogOut, MessageCircle, Heart, ShoppingCart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import ConfirmModal from "@/components/ConfirmModal";
import { useNotifications } from "@/contexts/NotificationsContext";
import InstallAppButton from "@/components/InstallAppButton";

const NAV_LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/marketplace", label: "Browse Marketplace", icon: Store },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/my-purchases", label: "My Purchases", icon: ShoppingCart },
  { to: "/dashboard?tab=sell", label: "Sell a Product", icon: PlusCircle },
  { to: "/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { to: "/liked", label: "Liked Items", icon: Heart },
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
  const {
    unreadCount,
    notifications,
    notificationUnreadCount,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingPurchases, setPendingPurchases] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      setPendingPurchases(0);
      return;
    }
    const loadPending = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", session.user.id)
        .eq("status", "paid_held");
      setPendingPurchases(count || 0);
    };
    loadPending();
  }, [loggedIn]);

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
        <div className="flex items-center gap-2">
          {loggedIn && (
            <button
              type="button"
              onClick={() => {
                const next = !showNotifications;
                setShowNotifications(next);
                if (next) refreshNotifications();
              }}
              className="relative rounded-full p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold"
              aria-label={`Notifications${notificationUnreadCount ? `, ${notificationUnreadCount} unread` : ""}`}
              aria-expanded={showNotifications}
            >
              <Bell className="h-5 w-5" />
              {notificationUnreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                </span>
              )}
            </button>
          )}
          <InstallAppButton />
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
      </div>

      {showNotifications && loggedIn && (
        <div className="absolute right-3 top-[calc(100%-2px)] z-[60] w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-xs text-muted-foreground">{notificationUnreadCount} unread</p>
            </div>
            {notificationUnreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[min(65vh,26rem)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                You're all caught up. New order and payment updates will appear here.
              </div>
            ) : notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { if (!item.is_read) markNotificationAsRead(item.id); }}
                className={`block w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/70 ${item.is_read ? "bg-background" : "bg-primary/5"}`}
              >
                <div className="flex items-start gap-2">
                  {!item.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 whitespace-normal text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/10"
                >
                  <span className="flex items-center gap-3">
                    <link.icon className="h-5 w-5 text-gold" />
                    {link.label}
                  </span>
                  {link.to === "/messages" && unreadCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                  {link.to === "/my-purchases" && pendingPurchases > 0 && (
                    <span className="bg-gold text-navy text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {pendingPurchases > 99 ? "99+" : pendingPurchases}
                    </span>
                  )}
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
