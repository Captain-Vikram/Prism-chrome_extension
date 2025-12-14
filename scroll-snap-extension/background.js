// Background service worker for Prism
// Handles capture orchestration and downloads.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Prism installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Router for capture requests and simple pings.
  if (message?.type === 'PING') {
    sendResponse({ ok: true, receivedAt: Date.now() });
    return true;
  }

  if (message?.type === 'START_CAPTURE') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab || !tab.id) throw new Error('No active tab');

        // Use Chrome DevTools Protocol for true full-page capture (no scrolling needed)
        const tabId = tab.id;
        
        // Attach debugger
        await chrome.debugger.attach({ tabId }, '1.3');
        
        try {
          // 1. Get exact page dimensions via script (more reliable than layoutMetrics)
          const dimsRes = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              const body = document.body;
              const html = document.documentElement;
              return {
                width: Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth),
                height: Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight),
                dpr: window.devicePixelRatio || 1
              };
            }
          });
          
          const { width, height, dpr } = dimsRes[0].result;
          console.log('Computed full page dims:', width, height, dpr);

          // 2. Force the viewport to match the full content size
          await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
            width: Math.ceil(width),
            height: Math.ceil(height),
            deviceScaleFactor: dpr,
            mobile: false,
          });
          
          // 3. Wait for layout to settle after resize
          await new Promise(r => setTimeout(r, 500));
          
          // 4. Capture with explicit clip to ensure we get everything
          // Use JPEG to reduce message size (PNGs can be too large for message passing)
          const screenshot = await chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', {
            format: 'jpeg',
            quality: 50,
            captureBeyondViewport: true,
            fromSurface: true,
            clip: {
              x: 0,
              y: 0,
              width: width,
              height: height,
              scale: 1
            }
          });
          
          // 5. Reset viewport
          await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride');
          
          // Detach debugger immediately
          await chrome.debugger.detach({ tabId });
          
          // Convert base64 to data URL
          const dataUrl = `data:image/jpeg;base64,${screenshot.data}`;

          // Ensure offscreen document exists
          if (chrome.offscreen && !await chrome.offscreen.hasDocument()) {
            try {
              await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_PARSER'],
                justification: 'Process screenshots to extract color palette'
              });
              // Wait a bit for the offscreen script to initialize
              await new Promise(r => setTimeout(r, 500));
            } catch (e) {
              console.warn('Offscreen createDocument failed:', e);
            }
          }

          // Send image to offscreen processor to extract palette
          // Retry logic in case the offscreen isn't ready
          const paletteRes = await new Promise((resolve) => {
            const sendMessage = (retries = 3) => {
              chrome.runtime.sendMessage({ type: 'PROCESS_IMAGE', dataUrl, options: { maxColors: 16, sampleStep: 10, targetWidth: 600 } }, (resp) => {
                if (chrome.runtime.lastError) {
                  console.warn('Runtime error sending to offscreen:', chrome.runtime.lastError);
                  if (retries > 0) {
                    setTimeout(() => sendMessage(retries - 1), 300);
                  } else {
                    resolve({ ok: false, error: chrome.runtime.lastError.message });
                  }
                } else {
                  resolve(resp);
                }
              });
            };
            sendMessage();
          });

          const palette = paletteRes?.result?.palette || [];

          // Send palette to content script to display overlay
          try {
            await chrome.tabs.sendMessage(tabId, { 
              type: 'SHOW_PALETTE_OVERLAY', 
              palette: palette,
              screenshotUrl: dataUrl // Optional: if we want to show the screenshot too
            });
          } catch (e) {
            console.warn('Could not send palette to content script:', e);
          }

          // Decide whether to save the screenshot.
          // Priority: explicit caller option -> persisted user preference -> default false (save by default)
          let skipSave = undefined;
          if (message && message.options && typeof message.options.skipSave !== 'undefined') {
            skipSave = !!message.options.skipSave;
            console.log('[Prism] Using skipSave from message options:', skipSave);
          } else {
            // Read persisted preference from storage (if available)
            console.log('[Prism] No skipSave in message, reading from storage...');
            try {
              skipSave = await new Promise((resolve) => {
                try {
                  chrome.storage.local.get({ skipSave: false }, (res) => {
                    console.log('[Prism] Read from storage:', res);
                    resolve(!!res.skipSave);
                  });
                } catch (e) {
                  console.error('[Prism] Error reading storage:', e);
                  resolve(false);
                }
              });
            } catch (e) {
              console.error('[Prism] Outer error reading storage:', e);
              skipSave = false;
            }
          }

          console.log('[Prism] Final skipSave decision:', skipSave, '(will save:', !skipSave, ')');
          if (!skipSave) {
            console.log('[Prism] Saving screenshot to downloads...');
            const filename = `prism-capture-${Date.now()}.png`;
            await chrome.downloads.download({ url: dataUrl, filename, saveAs: false }).catch(() => {});
          } else {
            console.log('[Prism] Skipping screenshot save as requested');
          }

          sendResponse({ ok: true, palette: palette, meta: Object.assign({}, paletteRes?.result, { skipSave }) });
          
        } catch (captureErr) {
          // Make sure to detach debugger on error
          try { await chrome.debugger.detach({ tabId }); } catch (e) {}
          throw captureErr;
        }
        
      } catch (err) {
        console.error('Capture error', err);
        sendResponse({ ok: false, error: String(err) });
      }
    })();

    // indicate asynchronous response
    return true;
  }

  return false;
});
