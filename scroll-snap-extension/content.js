// Content script: observes scroll and provides basic scroll helper.
// Phase 1 goal: log when bottom is reached and support a viewport scroll helper.

const SCROLL_STEP_PX = () => window.innerHeight;
const SCROLL_SETTLE_MS = 450; // Wait for smooth scroll to finish before next step.

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrollViewportOnce() {
  // Scroll by one viewport height and wait a moment for layout to settle.
  const startY = window.scrollY;
  window.scrollBy({ top: SCROLL_STEP_PX(), behavior: 'smooth' });
  await wait(SCROLL_SETTLE_MS);
  const endY = window.scrollY;
  return { startY, endY, delta: endY - startY };
}

function isAtBottom() {
  const bottomReached = window.innerHeight + window.scrollY >= document.body.offsetHeight;
  return bottomReached;
}

function onScroll() {
  if (isAtBottom()) {
    console.log('Scrolled! Reached bottom.');
  }
}

// Attach listener once.
window.addEventListener('scroll', onScroll, { passive: true });

// Expose a quick command hook for manual testing via the console.
window.prismSnap = {
  scrollViewportOnce,
  isAtBottom
};

// Helpers for capture orchestration and stitching
(() => {
  let _hiddenElements = [];

  function hideFixedElements() {
    _hiddenElements = [];
    document.querySelectorAll('*').forEach(el => {
      try {
        const style = getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
              el.__prism_old_display = el.style.display || '';
          el.style.display = 'none';
          _hiddenElements.push(el);
        }
      } catch (e) {
        // ignore
      }
    });
    return _hiddenElements.length;
  }

  function restoreFixedElements() {
    _hiddenElements.forEach(el => {
      try { el.style.display = el.__prism_old_display || ''; } catch (e) {}
    });
    _hiddenElements = [];
  }

  function getPageInfo() {
    try {
      // Detect main scrollable element (window vs specific container)
      let scrollTarget = document.scrollingElement || document.documentElement;
      
      // Heuristic: if body/html isn't scrolling but a large div is
      if (scrollTarget.scrollHeight <= window.innerHeight) {
        const candidates = Array.from(document.querySelectorAll('div, main, section')).filter(el => {
          const style = getComputedStyle(el);
          return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > window.innerHeight;
        });
        if (candidates.length > 0) {
          // Pick the largest scrollable container
          scrollTarget = candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
          window.__PrismTarget = scrollTarget; // Cache for scrolling
        }
      }

      const pageHeight = scrollTarget.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      return {
        pageHeight,
        viewportHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        isCustomTarget: !!window.__PrismTarget
      };
    } catch (e) {
      console.error('getPageInfo error:', e);
      return {
        pageHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
        viewportHeight: window.innerHeight,
        devicePixelRatio: 1
      };
    }
  }

  function scrollToY(y) {
    return new Promise((resolve) => {
      const start = Date.now();
      const timeout = 1500; // ms
      const target = window.__PrismTarget || window;
      
      try {
        target.scrollTo({ top: y, left: 0, behavior: 'auto' });
      } catch (e) {
        if (target.scrollTo) target.scrollTo(0, y);
        else target.scrollTop = y;
      }

      // poll until scroll position is reached or timeout
      (function waitFor() {
        const current = window.__PrismTarget ? window.__PrismTarget.scrollTop : (window.scrollY || window.pageYOffset || 0);
        if (Math.abs(current - y) <= 5 || Date.now() - start > timeout) {
          // small delay to ensure rendering
          setTimeout(() => resolve({ ok: true, y: current }), 150);
          return;
        }
        requestAnimationFrame(waitFor);
      })();
    });
  }

  async function stitchAndDownload(slices, fileName = 'prism-capture.png') {
    if (!slices || !slices.length) return { ok: false, reason: 'no slices' };

    const images = await Promise.all(slices.map(src => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    })));

    const width = images[0].naturalWidth;
    const totalHeight = images.reduce((s, img) => s + img.naturalHeight, 0);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    let y = 0;
    for (const img of images) {
      ctx.drawImage(img, 0, y, img.naturalWidth, img.naturalHeight);
      y += img.naturalHeight;
    }

    const dataUrl = canvas.toDataURL('image/png');

    // trigger download via anchor
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    return { ok: true };
  }

  window.__PrismHelpers = {
    hideFixedElements,
    restoreFixedElements,
    getPageInfo,
    scrollToY,
    stitchAndDownload
  };
})();

// Floating Ready-State Button UI
(() => {
  let floatingButton = null;
  let settleTimer = null;
  let lastHeight = 0;
  let isReady = false;

  function createFloatingButton() {
    if (floatingButton) return;

    const btn = document.createElement('div');
    btn.id = '__prism_floating_btn';
    btn.innerHTML = `
      <style>
        #__prism_floating_btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        #__prism_floating_btn:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        #__prism_btn_inner {
          background: #4838c8;
          color: white;
          padding: 12px 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          transition: opacity 0.2s;
        }
        #__prism_btn_inner:hover {
          opacity: 0.9;
        }
        #__prism_btn_inner.pending {
          background: #4838c8;
          cursor: pointer;
        }
        #__prism_btn_inner.ready {
          background: #4838c8;
        }
        .prism-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.7);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      </style>
      <div id="__prism_btn_inner" class="pending">
        <span class="prism-status-dot"></span>
        <span id="__prism_btn_text">Scroll to Bottom</span>
      </div>
    `;

    const inner = btn.querySelector('#__prism_btn_inner');
    const text = btn.querySelector('#__prism_btn_text');

    inner.addEventListener('click', async () => {
      if (!isReady) return;
      
      text.textContent = 'Capturing...';
      inner.style.pointerEvents = 'none';
      
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          throw new Error('Extension was reloaded. Please refresh the page.');
        }
        
        const response = await chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
        if (response?.ok) {
          text.textContent = '✓ Captured!';
          setTimeout(() => {
            text.textContent = 'Capture Full Page';
            inner.style.pointerEvents = '';
          }, 2000);
        } else {
          text.textContent = '✗ Failed';
          setTimeout(() => {
            text.textContent = 'Capture Full Page';
            inner.style.pointerEvents = '';
          }, 2000);
        }
      } catch (err) {
        console.error('Capture error:', err);
        
        // Handle extension context invalidated specifically
        if (err.message && (err.message.includes('Extension context invalidated') || err.message.includes('Extension was reloaded'))) {
          text.textContent = '⟳ Reload Page';
          inner.style.background = '#4838c8';
          inner.style.backgroundImage = 'none';
          inner.style.backgroundColor = '#4838c8';
          inner.className = 'ready';
          inner.style.pointerEvents = '';
          inner.onclick = () => window.location.reload();
          return;
        }
        
        text.textContent = '✗ Error';
        setTimeout(() => {
          text.textContent = 'Capture Full Page';
          inner.style.pointerEvents = '';
        }, 2000);
      }
    });

    document.body.appendChild(btn);
    floatingButton = btn;
  }

  function checkReadyState() {
    const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 10;
    const currentHeight = document.body.offsetHeight;

    if (atBottom) {
      if (settleTimer) clearTimeout(settleTimer);
      
      settleTimer = setTimeout(() => {
        const newHeight = document.body.offsetHeight;
        if (newHeight === lastHeight) {
          // Height stable, we're ready
          setReadyState(true);
        } else {
          // Height changed (infinite scroll), reset
          lastHeight = newHeight;
          checkReadyState();
        }
      }, 2000);
      
      lastHeight = currentHeight;
    } else {
      setReadyState(false);
    }
  }

  function setReadyState(ready) {
    if (!floatingButton) return;
    
    isReady = ready;
    const inner = floatingButton.querySelector('#__prism_btn_inner');
    const text = floatingButton.querySelector('#__prism_btn_text');
    
    if (ready) {
      inner.className = 'ready';
      text.textContent = 'Capture Full Page';
    } else {
      inner.className = 'pending';
      text.textContent = 'Scroll to Bottom';
    }
  }

  // Initialize after a short delay to ensure DOM is ready
  setTimeout(() => {
    createFloatingButton();
    checkReadyState();
    window.addEventListener('scroll', checkReadyState, { passive: true });
  }, 1000);
})();
