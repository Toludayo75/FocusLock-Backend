import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Target, ChevronRight, ChevronLeft } from "lucide-react";

interface WelcomeFlowProps {
  onComplete: () => void;
}

export function WelcomeFlow({ onComplete }: WelcomeFlowProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const screens = [
    {
      id: "hero",
      title: "Meet FocusLock",
      subtitle: "A planner with teeth",
      description: "The productivity app that actually enforces your focus time",
      icon: Shield,
      gradient: "from-primary to-primary/80"
    },
    {
      id: "enforcement",
      title: "Lock & Focus",
      subtitle: "Strict Enforcement", 
      description: "Your device locks to focus apps only during scheduled tasks",
      icon: Shield,
      gradient: "from-primary to-secondary"
    },
    {
      id: "proof",
      title: "Prove Your Progress",
      subtitle: "Proof Required",
      description: "Submit screenshots, complete quizzes, or check-in to unlock your device",
      icon: Target,
      gradient: "from-secondary to-accent"
    }
  ];

  const nextScreen = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const goToScreen = (index: number) => {
    setCurrentScreen(index);
  };

  // Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentScreen < screens.length - 1) {
      nextScreen();
    } else if (isRightSwipe && currentScreen > 0) {
      prevScreen();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const current = screens[currentScreen];
  const IconComponent = current.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex space-x-2">
          {screens.map((_, index) => (
            <button
              key={index}
              onClick={() => goToScreen(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentScreen ? 'bg-primary' : 'bg-muted'
              }`}
              data-testid={`progress-dot-${index}`}
            />
          ))}
        </div>
        <Button 
          variant="ghost" 
          onClick={onComplete}
          className="text-muted-foreground"
          data-testid="button-skip"
        >
          Skip
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card 
          className="w-full max-w-md"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <CardContent className="p-8">
            <div className={`text-center space-y-6 bg-gradient-to-br ${current.gradient} text-white rounded-lg p-8 mb-6`}>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                <IconComponent className="w-8 h-8" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold mb-2" data-testid="onboarding-title">
                  {current.title}
                </h1>
                <h2 className="text-lg font-semibold text-white/90 mb-3">
                  {current.subtitle}
                </h2>
                <p className="text-white/80 leading-relaxed" data-testid="onboarding-description">
                  {current.description}
                </p>
              </div>
            </div>

            {/* Additional info for specific screens */}
            {currentScreen === 0 && (
              <div className="text-center space-y-3 text-muted-foreground text-sm">
                <p>Join thousands of students and professionals</p>
                <p>Swipe or tap to learn more →</p>
              </div>
            )}

            {currentScreen === 1 && (
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-center">Three Enforcement Levels</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>SOFT</span>
                    <span className="text-muted-foreground">Gentle reminders</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MEDIUM</span>
                    <span className="text-muted-foreground">Limited app access</span>
                  </div>
                  <div className="flex justify-between">
                    <span>HARD</span>
                    <span className="text-muted-foreground">Full device lock</span>
                  </div>
                </div>
              </div>
            )}

            {currentScreen === 2 && (
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-center">Completion Methods</h3>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      📷
                    </div>
                    <span>Screenshot</span>
                  </div>
                  <div>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      ❓
                    </div>
                    <span>Quiz</span>
                  </div>
                  <div>
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      ✓
                    </div>
                    <span>Check-in</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between p-6">
        <Button
          variant="outline"
          onClick={prevScreen}
          disabled={currentScreen === 0}
          className="flex items-center space-x-2"
          data-testid="button-prev"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <div className="text-sm text-muted-foreground">
          {currentScreen + 1} of {screens.length}
        </div>

        <Button
          onClick={nextScreen}
          className="flex items-center space-x-2"
          data-testid="button-next"
        >
          <span>{currentScreen === screens.length - 1 ? "Get Started" : "Next"}</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}