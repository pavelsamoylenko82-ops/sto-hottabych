(function () {
  "use strict";
  const script = document.currentScript || document.querySelector("script[data-slug][data-endpoint]");
  if (!script) return;
  const slug = script.dataset.slug;
  const endpoint = (script.dataset.endpoint || "").replace(/\/+$/, "");
  if (!slug || !endpoint) return;
  const me = new URLSearchParams(location.search).get("me");
  try {
    if (me === "1") {
      localStorage.setItem("samola_ignore", "1");
      return;
    }
    if (me === "0") localStorage.removeItem("samola_ignore");
    if (localStorage.getItem("samola_ignore") === "1") return;
  } catch (e) {}
  const payload = (event, target) => JSON.stringify({
    slug,
    event,
    target,
    ref: document.referrer,
    screen: `${window.screen.width}x${window.screen.height}`,
    page: location.pathname
  });
  const send = (body) => {
    const url = `${endpoint}/hit`;
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    fetch(url, { method: "POST", body, headers: { "Content-Type": "text/plain;charset=UTF-8" }, keepalive: true, mode: "cors" }).catch(() => {});
  };
  send(payload("open", ""));
  document.addEventListener("click", (event) => {
    const el = event.target.closest ? event.target.closest('a[href^="tel:"], a[href*="t.me"], a[href*="wa.me"], a[href*="viber"], button[type="submit"]') : null;
    if (!el) return;
    const target = (el.getAttribute("href") || el.textContent || "").trim().slice(0, 200);
    send(payload("cta", target));
  });
})();
