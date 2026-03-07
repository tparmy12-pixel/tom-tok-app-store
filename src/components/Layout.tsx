import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

interface LayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onSearch, showSearch = false }) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Tom Tok Store" className="w-9 h-9 rounded-lg object-cover" />
            <span className="font-display text-lg font-bold gradient-neon-text hidden sm:inline">
              Tom Tok Store
            </span>
          </Link>

          {showSearch && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps..."
                  className="pl-9 bg-muted/50 border-border/50"
                  onChange={(e) => onSearch?.(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className="text-neon-pink hover:text-neon-pink"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <User className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{profile?.display_name || "Profile"}</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="gradient-neon text-primary-foreground neon-glow"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center space-y-4">
          <p className="font-display text-sm gradient-neon-text font-bold tracking-wider">
            1 Billion+ Downloads
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link>
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link>
            <Link to="/feedback" className="text-muted-foreground hover:text-primary transition-colors">Feedback</Link>
          </div>
          <p className="text-muted-foreground text-xs">
            © 2026 Tom Tok Store. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
