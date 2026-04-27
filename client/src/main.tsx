import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/**
 * Suspense fallback shell shown while lazy route bundles are loading.
 *
 * @returns {React.JSX.Element} Loading state layout.
 */
const AppFallback = (): React.JSX.Element => (
  <div className="min-h-screen w-full bg-zinc-950 text-zinc-300 flex items-center justify-center">
    <span className="text-sm font-medium tracking-wide">Loading...</span>
  </div>
);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Suspense fallback={<AppFallback />}>
      <App />
    </Suspense>
  </StrictMode>,
);
