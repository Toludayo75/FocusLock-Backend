import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StrictModeAgreement } from "@/components/modals/strict-mode-agreement";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [showStrictMode, setShowStrictMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  // Show onboarding flow first
  if (showOnboarding) {
    return (
      <WelcomeFlow 
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({
        email: formData.email,
        password: formData.password,
      });
    } else {
      setShowStrictMode(true);
    }
  };

  const handleStrictModeAccept = () => {
    registerMutation.mutate({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
    setShowStrictMode(false);
  };

  const handleStrictModeReject = () => {
    setShowStrictMode(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first auth form */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2" data-testid="app-title">FocusLock</h1>
            <p className="text-muted-foreground">
              {isLogin ? "Welcome back" : "Join focused achievers"}
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {isLogin ? "Sign In" : "Create Account"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
                {!isLogin && (
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required={!isLogin}
                      data-testid="input-name"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="input-password"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending || registerMutation.isPending}
                  data-testid={isLogin ? "button-login" : "button-register"}
                >
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>
              
              <div className="mt-6 text-center space-y-2">
                {isLogin && (
                  <Button variant="link" className="text-sm" data-testid="link-forgot-password">
                    Forgot password?
                  </Button>
                )}
                <div className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <Button
                    variant="link"
                    className="p-0 font-medium"
                    onClick={() => setIsLogin(!isLogin)}
                    data-testid={isLogin ? "link-signup" : "link-login"}
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <StrictModeAgreement
        isOpen={showStrictMode}
        onAccept={handleStrictModeAccept}
        onReject={handleStrictModeReject}
      />
    </div>
  );
}
