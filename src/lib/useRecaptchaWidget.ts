"use client";

import { useEffect, useRef } from "react";

type Grecaptcha = {
  render: (container: HTMLElement, params: { sitekey: string; theme?: "light" | "dark" }) => number;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const CALLBACK_NAME = "__g4RecaptchaOnLoad";
const SCRIPT_ID = "g4-recaptcha-script";

let scriptLoading = false;
const readyCallbacks: Array<() => void> = [];

function ensureRecaptchaScript(onReady: () => void) {
  if (window.grecaptcha?.render) {
    onReady();
    return;
  }
  readyCallbacks.push(onReady);
  if (scriptLoading) return;
  scriptLoading = true;
  (window as unknown as Record<string, () => void>)[CALLBACK_NAME] = () => {
    readyCallbacks.splice(0).forEach((cb) => cb());
  };
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = `https://www.google.com/recaptcha/api.js?onload=${CALLBACK_NAME}&render=explicit`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

/**
 * Renderiza o widget do reCAPTCHA v2 manualmente (render=explicit) em vez
 * de depender do auto-scan do script (modo implícito, sem `?render=`): o
 * auto-scan só roda uma vez, quando o script termina de carregar. Como
 * LoginForm/RequestAccessForm agora alternam de aba (AccountAccessTabs)
 * em vez de navegar entre páginas, o <div class="g-recaptcha"> de quem
 * monta depois do primeiro carregamento nunca era visto pelo script — o
 * checkbox simplesmente não aparecia.
 */
export function useRecaptchaWidget(siteKey: string | undefined, theme: "light" | "dark" = "light") {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!siteKey || renderedRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    ensureRecaptchaScript(() => {
      if (cancelled || renderedRef.current || !container.isConnected) return;
      window.grecaptcha?.render(container, { sitekey: siteKey, theme });
      renderedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [siteKey, theme]);

  return containerRef;
}
