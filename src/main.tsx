import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { BrandProvider } from "./components/BrandProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

// In development, validate translations
if (import.meta.env.DEV) {
  import('./lib/i18n/validateTranslations').then(({ logTranslationStatus }) => {
    logTranslationStatus();
  });
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Log to error reporting service in production
      if (import.meta.env.PROD) {
        console.error('[ErrorBoundary] Error reported:', error, errorInfo);
      }
    }}
  >
    <UserPreferencesProvider>
      <ThemeProvider>
        <LanguageProvider>
          <BrandProvider>
            <App />
          </BrandProvider>
        </LanguageProvider>
      </ThemeProvider>
    </UserPreferencesProvider>
  </ErrorBoundary>
);
