export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type RegisterPwaOptions = {
  onNeedRefresh: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady: () => void;
  onError?: () => void;
};

let refreshing = false;

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

export async function registerPwa({
  onNeedRefresh,
  onOfflineReady,
  onError,
}: RegisterPwaOptions): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    if (registration.waiting && navigator.serviceWorker.controller) {
      onNeedRefresh(registration);
    }

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) {
        return;
      }

      worker.addEventListener("statechange", () => {
        if (worker.state !== "installed") {
          return;
        }

        if (navigator.serviceWorker.controller) {
          onNeedRefresh(registration);
          return;
        }

        onOfflineReady();
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    });

    window.setInterval(() => {
      void registration.update().catch(() => undefined);
    }, 60 * 60 * 1000);

    return registration;
  } catch {
    onError?.();
    return null;
  }
}

export function activatePwaUpdate(registration: ServiceWorkerRegistration | null): boolean {
  if (!registration?.waiting) {
    return false;
  }

  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}
