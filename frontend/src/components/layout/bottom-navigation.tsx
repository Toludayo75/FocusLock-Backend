import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Home, CheckSquare, TrendingUp, Calendar, Settings } from "lucide-react";

interface BottomNavigationProps {
  currentTab: string;
}

export function BottomNavigation({ currentTab }: BottomNavigationProps) {
  const [, setLocation] = useLocation();

  const navigationItems = [
    { 
      id: "home", 
      label: "Home", 
      icon: Home, 
      path: "/" 
    },
    { 
      id: "tasks", 
      label: "Tasks", 
      icon: CheckSquare, 
      path: "/tasks" 
    },
    { 
      id: "progress", 
      label: "Progress", 
      icon: TrendingUp, 
      path: "/progress" 
    },
    { 
      id: "calendar", 
      label: "Calendar", 
      icon: Calendar, 
      path: "/calendar" 
    },
    { 
      id: "settings", 
      label: "Settings", 
      icon: Settings, 
      path: "/settings" 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 z-50">
      <div className="flex justify-around max-w-7xl mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center py-2 px-4 rounded-md transition-colors",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
