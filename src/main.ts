import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { addToast } from './components/Toasts/ToastStore'

const target = document.getElementById('app')
if (!target) {
  throw new Error('Target container #app not found')
}

const app = mount(App, { target })

// Unhandled error & rejection handling with one-click report generator
window.onunhandledrejection = (ev: PromiseRejectionEvent) => {
  const reason = ev.reason;
  const msg = reason?.stack || reason?.message || String(reason);

  const githubBody = `**Bug Report (Platinum Extractor v2.0)**
Date: ${new Date().toUTCString()}
Browser: ${navigator.userAgent}
Platform: ${navigator.platform}

\`\`\`
${msg}
\`\`\`

---
**Steps to reproduce:**
1. 
2. `;

  addToast({
    type: 'danger',
    title: 'An error occurred',
    message: reason?.message || 'An unexpected error occurred during extraction.',
    timeout: 12000,
    link: {
      text: 'Report Issue',
      href: `https://github.com/LoginRs99/platinum-extractor/issues/new?title=${encodeURIComponent("Error: " + (reason?.message || "Unhandled error"))}&body=${encodeURIComponent(githubBody)}`
    }
  });

  return true;
}

window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global error caught:", message, source, lineno, colno, error);
}

export default app
