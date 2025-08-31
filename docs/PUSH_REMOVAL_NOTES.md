# Push Notifications Removed

This build removes the entire push notification feature and Vercel Blob usage.

## What changed

- Deleted API routes under `api/push/*` and server-side helpers `api/_lib/push.js`, `api/_lib/subscriptions.js`.
- Removed the local dev push server in `/server`.
- Removed client code and UI:
  - `src/pwa/pushApi.js`, `src/pwa/pushClient.js`
  - `src/hooks/usePushStatus.js`
  - `src/Components/pwa/PushControls.jsx`
  - All references in `MobileScreen.jsx`, `MobileSettingsSheet.jsx`, `KebabMenu.jsx`.
- Stripped `push` and `notificationclick` handlers from `public/mobile/sw.js` and `public/sw.js`.
- Updated `public/mobile/manifest.webmanifest` description to no longer mention notifications.
- Removed `@vercel/blob` and `web-push` from `package.json` dependencies.
- Removed VAPID/PUSH/Blob env vars from `.env` and `.env.local`.

## After you pull these changes

1. **Clean install**  
   ```bash
   npm ci
   ```
2. **Build & deploy**  
   ```bash
   npm run build
   # then push to Vercel / your host
   ```

3. **Project settings (Vercel):**  
   - In **Project → Settings → Environment Variables**, delete any of:
     - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
     - `VITE_VAPID_PUBLIC_KEY`, `VITE_PUSH_API_BASE`
     - `BLOB_READ_WRITE_TOKEN`
   - In **Storage → Blob**, delete the object `push/subscriptions.json` (and any other push-related blobs) to free up quota usage.

4. **Old deployments**  
   - Once redeployed, routes under `/api/push/*` will 404.  
   - If you previously granted notification permission on any devices, the app will no longer try to subscribe or show notifications.  
   - You may want to **clear site data** on test devices: Settings → Site data → Clear, or uninstall the PWA.

## Keeping the PWA

- Service Workers remain for offline cache + update checks.
- The Settings sheet still includes:
  - Theme picker
  - “Check for update” / “Apply update”
  - Install app (where supported)
