import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { ConfirmationModal } from "@/components/modals/confirmation-modal";
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
  Save
} from "lucide-react";

type SettingsView = 'main' | 'profile' | 'notifications' | 'focus' | 'integrations' | 'accountability';

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [strictModeEnabled, setStrictModeEnabled] = useState(true);
  const [uninstallProtectionEnabled, setUninstallProtectionEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    taskReminders: true,
    streakUpdates: true,
    accountabilityAlerts: false,
  });
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setShowLogoutModal(false);
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
                  
                  <Button data-testid="button-save-profile">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
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
                    onCheckedChange={setStrictModeEnabled}
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
                    onCheckedChange={setUninstallProtectionEnabled}
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
