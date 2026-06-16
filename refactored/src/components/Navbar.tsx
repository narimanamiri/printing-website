import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes, LogOut, Shield, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const { user, isAdmin, signOut: doSignOut } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await doSignOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-lg btn-primary grid place-items-center">
            <Boxes className="size-5 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight text-lg">
            وُکسِل<span className="text-gradient">فورج</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>خانه</Link>
          <Link to="/quote" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>دریافت قیمت</Link>
          {user && <Link to="/orders" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>سفارش‌های من</Link>}
          {isAdmin && <Link to="/admin" className="hover:text-foreground transition-colors flex items-center gap-1.5" activeProps={{ className: "text-foreground" }}><Shield className="size-3.5" />مدیریت</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors" activeProps={{ className: "text-foreground" }}>
                <User className="size-4" /> <span className="hidden sm:inline">{user.fullName || "حساب من"}</span>
              </Link>
              <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                <LogOut className="size-4" /> خروج
              </button>
            </>
          ) : (
            <Link to="/auth" className="text-sm font-medium px-4 py-2 rounded-lg btn-primary">
              ورود
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
