import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/i18n";
import BrandLogo from "@/components/brand/BrandLogo";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    // Avoid console.error noise in offline/test mode (smoke test treats it as a failure).
    console.warn(
      "404: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center">
        <BrandLogo variant="horizontal" size={40} className="mb-8" />
        <h1 className="text-4xl font-bold mb-4">{t('notFound.title')}</h1>
        <p className="text-xl text-muted-foreground mb-4">{t('notFound.message')}</p>
        <a href="/" className="text-primary hover:text-primary-hover underline">
          {t('notFound.home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
