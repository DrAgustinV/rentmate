import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

// In development, validate translations
if (import.meta.env.DEV) {
  import('./lib/i18n/validateTranslations').then(({ logTranslationStatus }) => {
    logTranslationStatus();
  });
}

createRoot(document.getElementById("root")!).render(
  <UserPreferencesProvider>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </UserPreferencesProvider>
);
