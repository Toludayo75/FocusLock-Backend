import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StrictModeAgreement } from "@/components/modals/strict-mode-agreement";
import { Shield, Target, Users, Clock } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
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
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary" data-testid="app-title">FocusLock</h1>
            <p className="mt-2 text-muted-foreground">
              {isLogin ? "Welcome back" : "Join thousands boosting productivity"}
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

      {/* Right side - Hero section */}
      <div className="flex-1 bg-gradient-to-br from-primary to-secondary p-8 text-white hidden lg:flex items-center justify-center">
        <div className="max-w-md text-center space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-4">A planner with teeth</h2>
            <p className="text-xl text-primary-foreground/80">
              FocusLock schedules tasks and enforces them by locking your device until you submit proof of completion.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Strict Enforcement</h3>
                <p className="text-primary-foreground/70 text-sm">Lock your device to focus apps only</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Proof Required</h3>
                <p className="text-primary-foreground/70 text-sm">Submit screenshots, quizzes, or check-ins</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Accountability</h3>
                <p className="text-primary-foreground/70 text-sm">Partner notifications and progress tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Smart Scheduling</h3>
                <p className="text-primary-foreground/70 text-sm">Calendar integration with conflict detection</p>
              </div>
            </div>
          </div>
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
