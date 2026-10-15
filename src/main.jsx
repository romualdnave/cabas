import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { translations } from "./i18n";
import "./styles.css";

// Keeps screen readers and browser translation prompts in step with the
// language the interface actually chose.
document.documentElement.lang = translations.htmlLang;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
