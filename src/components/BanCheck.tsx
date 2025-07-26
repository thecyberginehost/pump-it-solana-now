import { useHybridAuth } from "@/hooks/useHybridAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface BanCheckProps {
  children: React.ReactNode;
}

export const BanCheck = ({ children }: BanCheckProps) => {
  const { isBanned, isAuthenticated } = useHybridAuth();

  if (isAuthenticated && isBanned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-center">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p>This wallet has been banned from the platform.</p>
                <p className="text-sm text-muted-foreground">
                  If you believe this is an error, please contact support.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};