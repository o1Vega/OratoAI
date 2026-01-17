import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = currentLang === "en" ? "ru" : "en";
    i18n.changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="language-switcher-btn"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid var(--glass-border)",
        color: "var(--text-primary)",
        padding: "8px 16px",
        borderRadius: "20px",
        cursor: "pointer",
        fontSize: "0.9rem",
        fontWeight: "500",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
        e.currentTarget.style.borderColor = "var(--primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.borderColor = "var(--glass-border)";
      }}
    >
      <span style={{ opacity: currentLang === 'ru' ? 1 : 0.5 }}>RU</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span style={{ opacity: currentLang === 'en' ? 1 : 0.5 }}>EN</span>
    </button>
  );
}
