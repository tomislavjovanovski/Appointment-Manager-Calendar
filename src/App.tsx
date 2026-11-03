import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { I18nProvider, useI18n } from "@/i18n";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import BrandLogo from "@/components/brand/BrandLogo";
import { Loader2 } from "lucide-react";
import { translate } from "@/i18n/dictionary";
import { readRememberedLocale } from "@/i18n/storedLocale";
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
          <Route path="/about" element={<PublicInfoPage />} />
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
  const { status } = useAuth();
  const location = useLocation();
  const publicInfoPath = ['/about', '/faq', '/privacy', '/terms', '/contact'].includes(location.pathname.replace(/\/$/, ''));

  if (status === "authenticated") {
    return (
      <I18nProvider>
        <AppRoutes />
      </I18nProvider>
    );
  }

  if (status === "loading" && !publicInfoPath) {
    const locale = readRememberedLocale();
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6" lang={locale}>
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <BrandLogo variant="horizontal" size={40} />
          <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{translate(locale, 'auth.checkingSession')}</p>
        </div>
      </main>
    );
  }

  return publicInfoPath ? <PublicInfoPage /> : <Login />;
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
