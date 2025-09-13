import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">404 - Page Not Found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            <Button 
              onClick={() => setLocation("/")}
              className="mt-4"
              data-testid="button-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
