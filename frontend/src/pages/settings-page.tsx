import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
import { PermissionOnboarding } from "@/components/onboarding/permission-onboarding";
import { PermissionStatus } from "@/components/ui/permission-status";
import { usePermissionManager } from "@/hooks/use-permission-manager";
import { 
  User, 
  Bell, 
  Shield, 
  Link, 
  Users, 
  LogOut,
  ChevronRight,
  ArrowLeft,
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  Smartphone
} from "lucide-react";

type SettingsView = 'main' | 'profile' | 'notifications' | 'focus' | 'integrations' | 'accountability' | 'permissions';

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const pushNotifications = usePushNotifications();
  const permissionManager = usePermissionManager();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [strictModeEnabled, setStrictModeEnabled] = useState(user?.strictModeEnabled ?? true);
  const [uninstallProtectionEnabled, setUninstallProtectionEnabled] = useState(user?.uninstallProtectionEnabled ?? false);
  const [notificationSettings, setNotificationSettings] = useState({
    taskReminders: user?.notificationTaskReminders ?? true,
    streakUpdates: user?.notificationStreakUpdates ?? true,
    accountabilityAlerts: user?.notificationAccountabilityAlerts ?? false,
  });
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setStrictModeEnabled(user.strictModeEnabled);
      setUninstallProtectionEnabled(user.uninstallProtectionEnabled);
      setNotificationSettings({
        taskReminders: user.notificationTaskReminders,
        streakUpdates: user.notificationStreakUpdates,
        accountabilityAlerts: user.notificationAccountabilityAlerts,
      });
      setProfileData(prev => ({
        ...prev,
        name: user.name,
        email: user.email,
      }));
    }
  }, [user]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; email?: string }) => {
      const response = await apiRequest("PATCH", "/api/settings/profile", updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed", 
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Enforcement settings mutation
  const updateEnforcementMutation = useMutation({
    mutationFn: async (updates: { strictModeEnabled?: boolean; uninstallProtectionEnabled?: boolean }) => {
      const response = await apiRequest("PATCH", "/api/settings/enforcement", updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Settings updated",
        description: "Your enforcement settings have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (updates: { taskReminders?: boolean; streakUpdates?: boolean; accountabilityAlerts?: boolean }) => {
      const response = await apiRequest("PATCH", "/api/settings/notifications", updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update notifications. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setShowLogoutModal(false);
  };

  // Handler functions
  const handleProfileSave = () => {
    const updates: any = {};
    if (profileData.name !== user?.name) updates.name = profileData.name;
    if (profileData.email !== user?.email) updates.email = profileData.email;
    
    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    }
  };

  const handleStrictModeChange = (enabled: boolean) => {
    const previousValue = strictModeEnabled;
    setStrictModeEnabled(enabled);
    updateEnforcementMutation.mutate(
      { strictModeEnabled: enabled },
      {
        onError: () => {
          // Rollback on error
          setStrictModeEnabled(previousValue);
        }
      }
    );
  };

  const handleUninstallProtectionChange = (enabled: boolean) => {
    const previousValue = uninstallProtectionEnabled;
    setUninstallProtectionEnabled(enabled);
    updateEnforcementMutation.mutate(
      { uninstallProtectionEnabled: enabled },
      {
        onError: () => {
          // Rollback on error
          setUninstallProtectionEnabled(previousValue);
        }
      }
    );
  };

  const handleNotificationsSave = () => {
    const updates = {
      taskReminders: notificationSettings.taskReminders,
      streakUpdates: notificationSettings.streakUpdates,
      accountabilityAlerts: notificationSettings.accountabilityAlerts,
    };
    updateNotificationsMutation.mutate(updates);
  };

  const renderBackButton = () => (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => setCurrentView('main')}
      className="mb-6"
      data-testid="button-back"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  );

  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex-1 pb-20 max-w-2xl mx-auto px-4 py-6">
          {renderBackButton()}
          <h1 className="text-2xl font-bold mb-6">Profile & Account</h1>
          
          <div className="space-y-6">
            {/* Profile Picture */}
            <Card data-testid="profile-picture-section">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Profile Picture</h3>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-2xl text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <Button variant="outline" data-testid="button-change-photo">
                    <Camera className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card data-testid="personal-info-section">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      data-testid="input-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleProfileSave}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card data-testid="change-password-section">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                      data-testid="input-current-password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                      data-testid="input-new-password"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  
                  <Button data-testid="button-update-password">
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNavigation currentTab="settings" />
      </div>
    );
  }

  if (currentView === 'focus') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex-1 pb-20 max-w-2xl mx-auto px-4 py-6">
          {renderBackButton()}
          <h1 className="text-2xl font-bold mb-6">Focus & Restrictions</h1>
          
          <div className="space-y-6">
            {/* Strict Mode */}
            <Card data-testid="strict-mode-section">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Strict Mode</h3>
                    <p className="text-sm text-muted-foreground">Enable device locking during tasks</p>
                  </div>
                  <Switch
                    checked={strictModeEnabled}
                    onCheckedChange={handleStrictModeChange}
                    disabled={updateEnforcementMutation.isPending}
                    data-testid="switch-strict-mode"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, your device will be locked to specific apps during task sessions.
                </p>
              </CardContent>
            </Card>

            {/* Uninstall Protection */}
            <Card data-testid="uninstall-protection-section">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Uninstall Protection</h3>
                    <p className="text-sm text-muted-foreground">Prevent app removal during active sessions</p>
                  </div>
                  <Switch
                    checked={uninstallProtectionEnabled}
                    onCheckedChange={handleUninstallProtectionChange}
                    disabled={updateEnforcementMutation.isPending}
                    data-testid="switch-uninstall-protection"
                  />
                </div>
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Enabling this feature will require a 24-hour cooldown period before you can uninstall FocusLock.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNavigation currentTab="settings" />
      </div>
    );
  }

  if (currentView === 'notifications') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex-1 pb-20 max-w-2xl mx-auto px-4 py-6">
          {renderBackButton()}
          <h1 className="text-2xl font-bold mb-6">Notifications</h1>
          
          <div className="space-y-6">
            {/* Push Notifications */}
            <Card data-testid="push-notifications-section">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Push Notifications</h3>
                      <p className="text-sm text-muted-foreground">Get alerts when tasks start and for focus violations</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {pushNotifications.isEnabled ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : pushNotifications.permission === 'denied' ? (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Bell className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div className="mb-4">
                  {pushNotifications.isLoading ? (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm">Setting up push notifications...</p>
                    </div>
                  ) : pushNotifications.isEnabled ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✅ Push notifications are enabled. You'll receive alerts for task auto-starts and focus violations.
                      </p>
                    </div>
                  ) : pushNotifications.permission === 'denied' ? (
                    <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                      <p className="text-sm text-destructive">
                        ❌ Notifications blocked. Please enable them in your browser settings to receive push alerts.
                      </p>
                    </div>
                  ) : !pushNotifications.isSupported ? (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        ⚠️ Push notifications are not supported in this browser.
                      </p>
                    </div>
                  ) : pushNotifications.error ? (
                    <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                      <p className="text-sm text-destructive">
                        ❌ {pushNotifications.error}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        📱 Enable push notifications to get alerts when tasks auto-start and when you try to break focus rules.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  {pushNotifications.isEnabled ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pushNotifications.testNotification}
                        data-testid="button-test-notification"
                      >
                        Test Notification
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={pushNotifications.disableNotifications}
                        disabled={pushNotifications.isLoading}
                        data-testid="button-disable-notifications"
                      >
                        Disable
                      </Button>
                    </>
                  ) : pushNotifications.isSupported && pushNotifications.permission !== 'denied' ? (
                    <Button
                      onClick={pushNotifications.requestPermission}
                      disabled={pushNotifications.isLoading}
                      data-testid="button-enable-notifications"
                    >
                      {pushNotifications.isLoading ? 'Setting up...' : 'Enable Push Notifications'}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Traditional Notification Settings */}
            <Card data-testid="notification-preferences-section">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Task Reminders</label>
                      <p className="text-sm text-muted-foreground">Get notified before tasks start</p>
                    </div>
                    <Switch
                      checked={notificationSettings.taskReminders}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, taskReminders: checked }))
                      }
                      data-testid="switch-task-reminders"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Streak Updates</label>
                      <p className="text-sm text-muted-foreground">Celebrate your productivity milestones</p>
                    </div>
                    <Switch
                      checked={notificationSettings.streakUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, streakUpdates: checked }))
                      }
                      data-testid="switch-streak-updates"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Accountability Alerts</label>
                      <p className="text-sm text-muted-foreground">Notifications from accountability partners</p>
                    </div>
                    <Switch
                      checked={notificationSettings.accountabilityAlerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({ ...prev, accountabilityAlerts: checked }))
                      }
                      data-testid="switch-accountability-alerts"
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                <Button 
                  className="w-full" 
                  onClick={handleNotificationsSave}
                  disabled={updateNotificationsMutation.isPending}
                  data-testid="button-save-notifications"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateNotificationsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNavigation currentTab="settings" />
      </div>
    );
  }

  if (currentView === 'permissions') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex-1 pb-20 max-w-4xl mx-auto px-4 py-6">
          {renderBackButton()}
          <h1 className="text-2xl font-bold mb-6">Mobile Permissions</h1>
          
          <div className="space-y-6">
            {/* Current Permission Status */}
            <PermissionStatus 
              onSetupClick={() => {
                // User clicked setup from status - do nothing as PermissionOnboarding handles everything
              }}
              className="mb-6"
              data-testid="permission-status-main"
            />

            {/* Permission Setup Interface */}
            <PermissionOnboarding
              onComplete={() => {
                toast({
                  title: "Permissions Complete!",
                  description: "FocusLock can now enforce focus sessions with app blocking."
                });
              }}
              onSkip={() => {
                toast({
                  title: "Setup Skipped",
                  description: "You can enable permissions anytime to unlock full enforcement features."
                });
              }}
              showSkipButton={!permissionManager.coreEnforcementReady}
            />
            
            {/* Additional Mobile Information */}
            {!permissionManager.isNativePlatform && (
              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Smartphone className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="space-y-2">
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">
                        Install FocusLock Mobile App
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        To access advanced enforcement features like app blocking and device locking, 
                        install the FocusLock mobile app from your device's app store.
                      </p>
                      <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                        <p><strong>Mobile features include:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          <li>Real app blocking during focus sessions</li>
                          <li>Device-level enforcement</li>
                          <li>Background monitoring</li>
                          <li>Usage tracking and analytics</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <BottomNavigation currentTab="settings" />
      </div>
    );
  }

  // Main settings view
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex-1 pb-20 max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <div className="space-y-4 max-w-2xl">
          {/* Profile & Account */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView('profile')}
            data-testid="settings-profile"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Profile & Account</h3>
                    <p className="text-sm text-muted-foreground">Manage personal information and password</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView('notifications')}
            data-testid="settings-notifications"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Notifications</h3>
                    <p className="text-sm text-muted-foreground">Configure reminders and alerts</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Focus & Restrictions */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView('focus')}
            data-testid="settings-focus"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-destructive-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Focus & Restrictions</h3>
                    <p className="text-sm text-muted-foreground">Strict mode and uninstall protection</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Mobile Permissions */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView('permissions')}
            data-testid="settings-permissions"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">Mobile Permissions</h3>
                      {permissionManager.isNativePlatform && (
                        <PermissionStatus 
                          compact={true} 
                          showActions={false}
                          className="ml-2"
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {permissionManager.isNativePlatform
                        ? "Configure app blocking and enforcement permissions"
                        : "Enable mobile features by installing the app"
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView('integrations')}
            data-testid="settings-integrations"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                    <Link className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Integrations</h3>
                    <p className="text-sm text-muted-foreground">Connect learning platforms and calendars</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Accountability & Penalties */}
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setCurrentView('accountability')}
            data-testid="settings-accountability"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">Accountability & Penalties</h3>
                    <p className="text-sm text-muted-foreground">Add partners and penalty settings</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {/* Logout */}
          <Card 
            className="cursor-pointer hover:bg-destructive/10 transition-colors"
            onClick={() => setShowLogoutModal(true)}
            data-testid="settings-logout"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-destructive-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-destructive">Logout</h3>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation currentTab="settings" />
      
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
        variant="destructive"
      />
    </div>
  );
}
