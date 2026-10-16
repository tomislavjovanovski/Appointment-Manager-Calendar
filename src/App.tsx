import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { I18nProvider, useI18n } from "@/i18n";
import { translate } from "@/i18n/dictionary";
import { readRememberedLocale } from "@/i18n/storedLocale";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PublicInfoPage from "./pages/PublicInfoPage";

const queryClient = new QueryClient();

function AppRoutes() {
  const { dateFnsLocale } = useI18n();
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateFnsLocale}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/faq" element={<PublicInfoPage />} />
          <Route path="/privacy" element={<PublicInfoPage />} />
          <Route path="/terms" element={<PublicInfoPage />} />
          <Route path="/contact" element={<PublicInfoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </LocalizationProvider>
  );
}

// Settings (and therefore I18nProvider) require a session, so authentication is resolved first.
function AuthGate() {
  const { status, retry } = useAuth();
  const location = useLocation();
  const publicInfoPath = ['/faq', '/privacy', '/terms', '/contact'].includes(location.pathname);

  if (status === "authenticated") {
    return (
      <I18nProvider>
        <AppRoutes />
      </I18nProvider>
    );
  }

  if (status === "unauthenticated") {
    return publicInfoPath ? <PublicInfoPage /> : <Login />;
  }

  const locale = readRememberedLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-3" role={status === "error" ? "alert" : "status"}>
        {status === "error" ? (
          <>
            <p className="text-sm text-destructive">{translate(locale, "auth.networkError")}</p>
            <Button variant="outline" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {translate(locale, "settings.retry")}
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{translate(locale, "auth.checkingSession")}</p>
          </>
        )}
      </div>
    </main>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
