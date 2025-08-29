// src/pwa/pushClient.js
export async function getActiveSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // If your UI has a “Register device” button, call that flow first.
    // Here we just return null to avoid surprising permission prompts.
    return null;
  }
  return sub;
}

// Save per-user preference (minutes before)
export async function saveMinutesBefore(minutes) {
  const sub = await getActiveSubscription();
  if (!sub) return { ok: false, error: "no_subscription" };
  const body = {
    endpoint: sub.endpoint,
    clientId: sub.endpoint.slice(-10), // or your own id
    prefs: { minutesBeforeJamaah: Number(minutes) }
  };
  const r = await fetch("/api/push/prefs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}

// Post today's base Jama'ah times (server applies per-user minutes)
export async function scheduleJamaahForToday({ dateKey, jamaahTimes, defaultMinutesBefore = 10 }) {
  // jamaahTimes: [{ name:"Fajr", hour:5, minute:30 }, ...] in LOCAL time
  const [y,m,d] = dateKey.split("-").map(Number);
  const entries = (jamaahTimes || []).map(t => {
    const base = new Date(y, m - 1, d, t.hour, t.minute); // local → epoch
    return {
      name: t.name,
      baseTs: base.getTime(),
      title: `${t.name} reminder`,
      tag: `jamaah-${t.name.toLowerCase()}-${dateKey}`,
      perUserOffset: true,            // ← important
      defaultMinutesBefore            // used when user hasn’t chosen yet
    };
  });

  return fetch("/api/push/schedule", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dateKey, entries })
  }).then(r => r.json());
}
