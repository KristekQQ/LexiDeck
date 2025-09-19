import './styles.css'
/**
 * App bootstrap: registers Service Worker (if available), initializes UI,
 * and wires PWA install prompt handling.
 */
import { initUI } from './ui.js'

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { type: 'module' })
      .catch((e) => {
        console.warn('SW registration failed', e)
        const secure = window.isSecureContext
        const msgEl = document.getElementById('message')
        if (msgEl && !secure && !/^localhost|127\.0\.0\.1$/.test(location.hostname)) {
          const origin = `${location.protocol}//${location.host}`
          msgEl.innerHTML = `Pro instalaci a offline režim na HTTP povolte v Chrome: <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> a přidejte <strong>${origin}</strong>. Poté obnovte stránku.`
        }
      })
  })
}

// Initialize UI
initUI()

// PWA install prompt handling
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  const btn = document.getElementById('installBtn')
  if (btn) btn.style.display = 'inline-block'
})

const installBtn = document.getElementById('installBtn')
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      installBtn.style.display = 'none'
    }
    deferredPrompt = null
  })
}

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installBtn')
  if (btn) btn.style.display = 'none'
})

// Fallback: surface install button if criteria seem met but beforeinstallprompt didn't fire
async function maybeShowInstallButtonFallback() {
  try {
    const btn = document.getElementById('installBtn')
    if (!btn) return
    // hide in standalone
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      btn.style.display = 'none'
      return
    }
    // secure context + SW controller + manifest link present
    const link = document.querySelector('link[rel="manifest"]')
    const hasSW = !!(navigator.serviceWorker && navigator.serviceWorker.controller)
    if (window.isSecureContext && link && hasSW && !deferredPrompt) {
      btn.style.display = 'inline-block'
      btn.title = 'Pokud se neotevře okno, použijte nabídku prohlížeče: Nainstalovat aplikaci / Přidat na plochu.'
    }
  } catch {}
}

setTimeout(maybeShowInstallButtonFallback, 3000)
