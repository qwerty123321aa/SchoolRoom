type TelegramInset = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

type TelegramBackButton = {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
};

type TelegramWebApp = {
  initData?: string;
  colorScheme?: 'light' | 'dark';
  contentSafeAreaInset?: TelegramInset;
  safeAreaInset?: TelegramInset;
  BackButton?: TelegramBackButton;
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  onEvent?(event: string, callback: () => void): void;
  offEvent?(event: string, callback: () => void): void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramWebApp()?.initData?.trim());
}

export function initializeTelegram() {
  const webApp = getTelegramWebApp();
  const syncEnvironment = () => {
    const contentInset = webApp?.contentSafeAreaInset;
    const safeInset = webApp?.safeAreaInset;
    const root = document.documentElement;

    root.dataset.telegramTheme = webApp?.colorScheme ?? 'dark';
    root.style.setProperty(
      '--tg-content-safe-top',
      `${contentInset?.top ?? 0}px`,
    );
    root.style.setProperty(
      '--tg-content-safe-bottom',
      `${contentInset?.bottom ?? 0}px`,
    );
    root.style.setProperty('--tg-safe-bottom', `${safeInset?.bottom ?? 0}px`);
  };

  syncEnvironment();
  if (!webApp?.initData?.trim()) return;

  webApp.setHeaderColor?.('#080b12');
  webApp.setBackgroundColor?.('#080b12');
  webApp.setBottomBarColor?.('#0d121c');
  webApp.onEvent?.('themeChanged', syncEnvironment);
  webApp.onEvent?.('safeAreaChanged', syncEnvironment);
  webApp.onEvent?.('contentSafeAreaChanged', syncEnvironment);
  webApp.ready();
  webApp.expand();
}

export function bindTelegramBackButton(callback: () => void) {
  const webApp = getTelegramWebApp();
  const backButton = webApp?.initData?.trim() ? webApp.BackButton : undefined;
  if (!backButton) return () => undefined;

  backButton.onClick(callback);
  backButton.show();
  return () => {
    backButton.offClick(callback);
    backButton.hide();
  };
}
