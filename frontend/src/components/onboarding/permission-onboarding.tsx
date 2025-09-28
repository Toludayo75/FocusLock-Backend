// Progressive Permission Onboarding Flow
// Guides users through setting up all required permissions for mobile enforcement

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePermissionManager } from "@/hooks/use-permission-manager";
import { 
  Shield, 
  ShieldCheck, 
  Settings, 
  Eye, 
  Zap, 
  Bell, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Smartphone,
  RefreshCw
} from "lucide-react";

interface PermissionOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  showSkipButton?: boolean;
}

const PERMISSION_ICONS: Record<string, React.ReactNode> = {
  accessibility: <Eye className="h-5 w-5" />,
  overlay: <Shield className="h-5 w-5" />,
  usageAccess: <Zap className="h-5 w-5" />,
  batteryOptimization: <Zap className="h-5 w-5" />,
  notificationListener: <Bell className="h-5 w-5" />
};

const PERMISSION_COLORS: Record<string, string> = {
  accessibility: "text-blue-600 dark:text-blue-400",
  overlay: "text-green-600 dark:text-green-400",
  usageAccess: "text-purple-600 dark:text-purple-400",
  batteryOptimization: "text-orange-600 dark:text-orange-400",
  notificationListener: "text-gray-600 dark:text-gray-400"
};

export function PermissionOnboarding({ onComplete, onSkip, showSkipButton = true }: PermissionOnboardingProps) {
  const permissionManager = usePermissionManager();
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Calculate progress
  const totalRequired = Object.values(permissionManager.getAllPermissionDefinitions())
    .filter(p => p.required).length;
  const grantedRequired = permissionManager.getMissingPermissions().length;
  const progress = totalRequired > 0 ? ((totalRequired - grantedRequired) / totalRequired) * 100 : 0;

  // Handle permission setup
  const handleSetupPermission = async (permissionKey: string) => {
    setCurrentStep(permissionKey);
    
    // Try automatic request first (for permissions that support it)
    const granted = await permissionManager.requestPermission(permissionKey);
    
    if (!granted) {
      // Open settings for manual setup
      await permissionManager.openPermissionSettings(permissionKey);
    }
    
    setCurrentStep(null);
  };

  // Refresh permission status
  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await permissionManager.checkAllPermissions();
    setIsRefreshing(false);
  };

  // Toggle permission details
  const toggleDetails = (permissionKey: string) => {
    setShowDetails(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden && permissionManager.isNativePlatform) {
        handleRefreshStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [permissionManager.isNativePlatform]);

  // Check if onboarding is complete
  useEffect(() => {
    if (permissionManager.coreEnforcementReady && progress >= 100) {
      onComplete();
    }
  }, [permissionManager.coreEnforcementReady, progress, onComplete]);

  if (!permissionManager.isNativePlatform) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <Smartphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <CardTitle>Mobile Features Available</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            FocusLock's advanced enforcement features are available when you install the mobile app.
          </p>
          <p className="text-sm text-gray-500">
            The web version provides basic task planning and progress tracking.
          </p>
          {showSkipButton && (
            <Button onClick={onSkip} variant="outline" className="mt-4">
              Continue with Web Version
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="permission-onboarding">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <CardTitle className="text-2xl">Enable FocusLock Protection</CardTitle>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            To enforce focus sessions and block distracting apps, FocusLock needs special permissions.
            Don't worry - we'll guide you through each step!
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Setup Progress</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshing}
                  data-testid="button-refresh-permissions"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Badge variant={progress === 100 ? "default" : "secondary"}>
                  {Math.round(progress)}% Complete
                </Badge>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Status Overview */}
      {permissionManager.overallStatus !== 'none' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {permissionManager.coreEnforcementReady ? (
              "🎉 Core enforcement is ready! FocusLock can now block distracting apps during focus sessions."
            ) : (
              `✨ Great start! ${totalRequired - grantedRequired} of ${totalRequired} core permissions are ready.`
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Cards */}
      <div className="grid gap-4">
        {Object.entries(permissionManager.getAllPermissionDefinitions()).map(([key, info]) => {
          const permissionState = permissionManager.permissions[key];
          const isGranted = permissionState?.isGranted ?? false;
          const isCurrentStep = currentStep === key;
          const isRequired = info.required;

          return (
            <Card 
              key={key} 
              className={`transition-all duration-200 ${
                isGranted ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 
                isRequired ? 'border-orange-200' : 'border-gray-200'
              }`}
              data-testid={`permission-card-${key}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isGranted ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {isGranted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className={PERMISSION_COLORS[key]}>
                          {PERMISSION_ICONS[key]}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{info.name}</CardTitle>
                        {isRequired && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        {isGranted && (
                          <Badge variant="default" className="text-xs">✓ Enabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {info.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isGranted ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Button
                        onClick={() => handleSetupPermission(key)}
                        disabled={isCurrentStep}
                        size="sm"
                        data-testid={`button-setup-${key}`}
                      >
                        {isCurrentStep ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Set up
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(key)}
                      data-testid={`button-toggle-details-${key}`}
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${showDetails[key] ? 'rotate-90' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {showDetails[key] && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Why is this needed?</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{info.impact}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2">How to enable:</h4>
                      <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        {info.userFriendlySteps.map((step, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-xs flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <strong>Settings path:</strong> {info.settingsPath}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {permissionManager.coreEnforcementReady ? 
                  "🎉 You're all set! FocusLock can now enforce focus sessions." :
                  `${grantedRequired} permissions still needed for full enforcement`
                }
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {permissionManager.coreEnforcementReady ?
                  "You can start creating focus sessions with app blocking." :
                  "Don't worry - you can set these up anytime in Settings."
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {showSkipButton && !permissionManager.coreEnforcementReady && (
                <Button 
                  variant="outline" 
                  onClick={onSkip}
                  data-testid="button-skip-permissions"
                >
                  Skip for Now
                </Button>
              )}
              {permissionManager.coreEnforcementReady && (
                <Button 
                  onClick={onComplete}
                  data-testid="button-complete-onboarding"
                >
                  Start Using FocusLock
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Having trouble with permissions?
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                These permissions are essential for FocusLock to enforce focus sessions. 
                Without them, the app can only function as a basic task planner. 
                You can always enable these later in the Settings page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}