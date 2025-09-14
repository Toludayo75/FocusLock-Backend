import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronRight } from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialSystemProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function TutorialSystem({ steps, isOpen, onClose, onComplete }: TutorialSystemProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Skip tutorial if user has already seen it
    const tutorialCompleted = localStorage.getItem('focuslock_tutorial_completed');
    if (tutorialCompleted && !isOpen) {
      onComplete();
    }
  }, [onComplete, isOpen]);

  if (!isOpen) return null;

  const current = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const nextStep = () => {
    if (isLastStep) {
      localStorage.setItem('focuslock_tutorial_completed', 'true');
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const skipTutorial = () => {
    localStorage.setItem('focuslock_tutorial_completed', 'true');
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={skipTutorial} />
      
      {/* Tutorial card */}
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4 z-51">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipTutorial}
              data-testid="button-skip-tutorial"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" data-testid="tutorial-title">
              {current.title}
            </h3>
            <p className="text-muted-foreground" data-testid="tutorial-description">
              {current.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={skipTutorial}
              data-testid="button-skip"
            >
              Skip Tutorial
            </Button>
            
            <Button 
              onClick={nextStep}
              className="flex items-center space-x-2"
              data-testid="button-next-tutorial"
            >
              <span>{isLastStep ? "Get Started" : "Next"}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center mt-4 space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Tutorial steps for different features
export const firstTimeTutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to FocusLock!",
    description: "Let's quickly show you how to create your first focus session and start being productive.",
    position: "center"
  },
  {
    id: "create-task",
    title: "Create Your First Task",
    description: "Tap the + button to schedule a focus session. Choose your apps, set duration, and pick an enforcement level.",
    position: "bottom"
  },
  {
    id: "enforcement-levels",
    title: "Choose Your Enforcement",
    description: "SOFT gives reminders, MEDIUM limits apps, and HARD fully locks your device until you submit proof.",
    position: "center"
  },
  {
    id: "proof-system",
    title: "Proof of Completion",
    description: "When your session ends, submit a screenshot, complete a quiz, or just check-in to unlock your device.",
    position: "center"
  },
  {
    id: "track-progress",
    title: "Track Your Progress",
    description: "View your stats, streaks, and weekly progress in the Progress tab. Stay motivated and consistent!",
    position: "center"
  }
];

// Hook to manage tutorial state
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  
  const startTutorial = () => {
    const completed = localStorage.getItem('focuslock_tutorial_completed');
    if (!completed) {
      setShowTutorial(true);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
  };

  const completeTutorial = () => {
    setShowTutorial(false);
  };

  return {
    showTutorial,
    startTutorial,
    closeTutorial,
    completeTutorial
  };
}