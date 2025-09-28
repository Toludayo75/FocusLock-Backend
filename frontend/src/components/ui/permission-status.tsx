// Compact Permission Status Component
// Shows current permission status with visual indicators

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePermissionManager } from "@/hooks/use-permission-manager";
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface PermissionStatusProps {
  compact?: boolean;
  showActions?: boolean;
  onSetupClick?: () => void;
  className?: string;
}

export function PermissionStatus({ 
  compact = false, 
  showActions = true, 
  onSetupClick, 
  className = "" 
}: PermissionStatusProps) {
  const permissionManager = usePermissionManager();
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate status
  const missingPermissions = permissionManager.getMissingPermissions();
  const totalRequired = Object.values(permissionManager.getAllPermissionDefinitions())
    .filter(p => p.required).length;
  const progress = totalRequired > 0 ? ((totalRequired - missingPermissions.length) / totalRequired) * 100 : 0;

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await permissionManager.checkAllPermissions();
    setIsRefreshing(false);
  };

  // Status icon and color
  const getStatusDisplay = () => {
    if (!permissionManager.isNativePlatform) {
      return {
        icon: <Shield className="h-5 w-5 text-gray-400" />,
        color: "text-gray-600",
        bgColor: "bg-gray-50 dark:bg-gray-800",
        borderColor: "border-gray-200",
        status: "Web Version"
      };
    }

    if (permissionManager.coreEnforcementReady) {
      return {
        icon: <ShieldCheck className="h-5 w-5 text-green-600" />,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/20",
        borderColor: "border-green-200",
        status: "Fully Protected"
      };
    }

    if (permissionManager.overallStatus === 'partial') {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/20",
        borderColor: "border-orange-200",
        status: "Partial Setup"
      };
    }

    return {
      icon: <ShieldX className="h-5 w-5 text-red-600" />,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200",
      status: "Setup Required"
    };
  };

  const statusDisplay = getStatusDisplay();

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`} data-testid="permission-status-compact">
        <div className={`p-1 rounded ${statusDisplay.bgColor}`}>
          {statusDisplay.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${statusDisplay.color}`}>
            {statusDisplay.status}
          </p>
          {permissionManager.isNativePlatform && (
            <p className="text-xs text-gray-500">
              {missingPermissions.length > 0 ? 
                `${missingPermissions.length} permissions needed` :
                "All permissions granted"
              }
            </p>
          )}
        </div>
        {showActions && permissionManager.isNativePlatform && missingPermissions.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSetupClick}
            data-testid="button-setup-permissions-compact"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} ${className}`} data-testid="permission-status-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${statusDisplay.bgColor} border ${statusDisplay.borderColor}`}>
              {statusDisplay.icon}
            </div>
            <div>
              <CardTitle className={`text-lg ${statusDisplay.color}`}>
                {statusDisplay.status}
              </CardTitle>
              {permissionManager.isNativePlatform ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {permissionManager.coreEnforcementReady ?
                    "FocusLock can enforce focus sessions and block distracting apps" :
                    `${missingPermissions.length} of ${totalRequired} required permissions need setup`
                  }
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Basic features available - install mobile app for enforcement
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {permissionManager.isNativePlatform && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  data-testid="button-refresh-status"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  data-testid="button-toggle-details"
                >
                  {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {permissionManager.isNativePlatform && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Setup Progress</span>
                <Badge variant={progress === 100 ? "default" : "secondary"}>
                  {Math.round(progress)}%
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Status Alerts */}
            {permissionManager.coreEnforcementReady ? (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  ✅ Core enforcement is active! You can now create focus sessions with app blocking.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  ⚠️ {missingPermissions.length} permissions needed for full enforcement capability.
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Permission Status */}
            {showDetails && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-sm font-medium">Permission Details</h4>
                <div className="grid gap-2">
                  {Object.entries(permissionManager.getAllPermissionDefinitions())
                    .filter(([_, info]) => info.required)
                    .map(([key, info]) => {
                      const isGranted = permissionManager.permissions[key]?.isGranted ?? false;
                      return (
                        <div 
                          key={key} 
                          className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-800 border"
                          data-testid={`permission-detail-${key}`}
                        >
                          <div className="flex items-center space-x-2">
                            {isGranted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                            <span className="text-sm font-medium">{info.name}</span>
                          </div>
                          <Badge variant={isGranted ? "default" : "secondary"} className="text-xs">
                            {isGranted ? "Granted" : "Needed"}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {showActions && (
              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                {!permissionManager.coreEnforcementReady && (
                  <Button
                    onClick={onSetupClick}
                    size="sm"
                    data-testid="button-setup-permissions"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Set Up Permissions
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}