let sentinel: WakeLockSentinel | null = null;
let holding = false;
let watching = false;

export function keepAwake() {
  try {
    holding = true;
    if (!watching && typeof document !== "undefined") {
      watching = true;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void requestLock();
      });
    }
    void requestLock();
  } catch {
    // The screen lock is optional.
  }
}

export function release() {
  holding = false;
  const current = sentinel;
  sentinel = null;
  try {
    void current?.release();
  } catch {
    // Already released.
  }
}

async function requestLock() {
  try {
    if (!holding) return;
    if (!navigator.wakeLock?.request) return;
    sentinel = await navigator.wakeLock.request("screen");
  } catch {
    sentinel = null;
  }
}
