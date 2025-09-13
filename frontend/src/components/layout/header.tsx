import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEnforced, setIsEnforced] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-primary" data-testid="app-title">FocusLock</h1>
          <span className="text-sm text-muted-foreground" data-testid="welcome-message">
            Welcome back, {user?.name || "User"}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {isEnforced && (
            <Badge variant="destructive" className="text-xs" data-testid="enforcement-status">
              🔒 Device Locked
            </Badge>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleDarkMode}
            data-testid="button-theme-toggle"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
