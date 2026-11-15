(() => {
  "use strict";

  const apiBase = String(window.HATTZ_SHARE_CONFIG?.apiBase || "").trim().replace(/\/+$/, "");
  if (!apiBase) return;

  const params = new URLSearchParams(window.location.search);
  const sharedCode = String(params.get("share") || "").trim();

  function showMaintenance(message) {
    const overlay = ensureOverlay();
    overlay.querySelector(".remote-maintenance-message").textContent = message || "Estamos realizando uma manutenção. Volte em breve.";
    overlay.hidden = false;
  }

  function ensureOverlay() {
    let overlay = document.getElementById("remoteMaintenanceOverlay");
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.id = "remoteMaintenanceOverlay";
      overlay.className = "remote-maintenance-overlay";
      overlay.hidden = true;
      overlay.setAttribute("role", "alertdialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = '<div class="remote-maintenance-backdrop"></div><div class="remote-maintenance-card"><span class="remote-maintenance-mark">H✦</span><p class="remote-maintenance-eyebrow">HÄTTZ SHARE</p><h1 class="remote-maintenance-title">Estamos em manutenção</h1><p class="remote-maintenance-message"></p><span class="remote-maintenance-foot">Voltaremos em breve.</span></div>';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  async function check() {
    try {
      const response = await fetch(`${apiBase}/api/maintenance/status`, { cache: "no-store" });
      if (!response.ok) return;
      const state = await response.json();
      if (state.enabled !== true) return;
      const overlay = ensureOverlay();
      overlay.querySelector(".remote-maintenance-title").textContent = state.title || "Estamos em manutenção";
      overlay.querySelector(".remote-maintenance-message").textContent = state.message || "Estamos realizando uma manutenção. Volte em breve.";
      overlay.style.setProperty("--maintenance-overlay", `${Math.max(0, Math.min(95, Number(state.overlayOpacity ?? 62))) / 100}`);
      overlay.style.setProperty("--maintenance-blur", `${Math.max(0, Math.min(30, Number(state.blur ?? 0)))}px`);
      overlay.style.setProperty("--maintenance-accent", /^#[0-9a-f]{6}$/i.test(state.accentColor || "") ? state.accentColor : "#9b7add");
      const backdrop = overlay.querySelector(".remote-maintenance-backdrop");
      backdrop.querySelectorAll("img,video").forEach((node) => node.remove());
      if (state.backgroundUrl && state.backgroundType !== "color") {
        const source = /^https:\/\//i.test(state.backgroundUrl) ? state.backgroundUrl : `${apiBase}${state.backgroundUrl}`;
        const media = state.backgroundType === "video" ? document.createElement("video") : document.createElement("img");
        media.src = source; media.setAttribute("aria-hidden", "true");
        if (state.backgroundType === "video") { media.autoplay = true; media.muted = true; media.loop = true; media.playsInline = true; }
        backdrop.prepend(media);
      }

      // Um perfil liberado (oficial ou allowlist) continua acessível porque a própria API autoriza a leitura.
      if (sharedCode) {
        const profileResponse = await fetch(`${apiBase}/api/profiles/${encodeURIComponent(sharedCode)}`, { cache: "no-store" });
        if (profileResponse.ok) return;
      }
      showMaintenance(state.message);
    } catch {
      // Falha de rede não deve bloquear o site local nem impedir a edição offline.
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check, { once: true });
  else check();
})();
