"use client";
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(
          function (registration) {
            console.log("Service Worker registration successful with scope: ", registration.scope);
            
            // Check for updates on visibility change
            document.addEventListener("visibilitychange", () => {
              if (document.visibilityState === 'visible') {
                registration.update();
              }
            });
          },
          function (err) {
            console.log("Service Worker registration failed: ", err);
          }
        );
      });

      // Reload the page when the service worker is updated (i.e. self.skipWaiting() called)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);
  
  return null;
}
