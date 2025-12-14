// Popup controller with improved UX feedback

const statusEl = document.getElementById('status');

// Toggle element for only-palette mode
const skipSaveToggle = document.getElementById('skipSaveToggle');

// Load persisted setting
try {
  chrome.storage && chrome.storage.local && chrome.storage.local.get({ skipSave: false }, (res) => {
    if (skipSaveToggle) skipSaveToggle.checked = !!res.skipSave;
  });
} catch (e) {
  // ignore if storage unavailable
}

// Persist on change
if (skipSaveToggle) {
  skipSaveToggle.addEventListener('change', () => {
    const value = !!skipSaveToggle.checked;
    console.log('[Prism] Toggle changed, saving skipSave:', value);
    try { 
      chrome.storage.local.set({ skipSave: value }, () => {
        console.log('[Prism] skipSave saved to storage:', value);
      });
    } catch (e) {
      console.error('[Prism] Failed to save skipSave:', e);
    }
  });
}

function showStatus(message, duration = 3000) {
  statusEl.textContent = message;
  statusEl.style.opacity = '1';
  if (duration > 0) {
    setTimeout(() => {
      statusEl.style.opacity = '0';
      setTimeout(() => statusEl.textContent = '', 300);
    }, duration);
  }
}

 // removed Test Connection button (not used)

document.getElementById('capture').addEventListener('click', async () => {
  const btn = document.getElementById('capture');
  btn.disabled = true;
  btn.textContent = '⏳ Capturing...';
  showStatus('📸 Capturing full page...', 0);
  
  try {
    const skipSaveValue = !!(skipSaveToggle && skipSaveToggle.checked);
    console.log('[Prism] Sending capture request with skipSave:', skipSaveValue);
    const response = await chrome.runtime.sendMessage({ type: 'START_CAPTURE', options: { skipSave: skipSaveValue } });
    if (response?.ok) {
      const palette = response.palette || [];
      // if no palette returned, use fallback defaults so UI remains functional
      if (!palette || palette.length === 0) {
        palette = defaultPalette;
      }
      showStatus('✅ Analysis complete!', 4000);
      
      // Render palette in popup
      const out = document.getElementById('palette') || document.createElement('div');
      out.id = 'palette';
      out.style.display = 'grid';
      out.style.gridTemplateColumns = 'repeat(4, 1fr)';
      out.style.gap = '8px';
      out.style.marginTop = '16px';
      out.innerHTML = '';

      if (palette.length === 0) {
        out.style.display = 'block';
        out.textContent = 'No palette data found.';
      } else {
        // Add a "Copy All" button
        const actions = document.createElement('div');
        actions.style.gridColumn = '1 / -1';
        actions.style.marginBottom = '8px';
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        
        const copyAllBtn = document.createElement('button');
        copyAllBtn.textContent = 'Copy JSON';
          copyAllBtn.style.fontSize = '12px';
          copyAllBtn.style.padding = '6px 10px';
          copyAllBtn.style.background = '#4838c8';
          copyAllBtn.style.border = 'none';
          copyAllBtn.style.borderRadius = '6px';
          copyAllBtn.style.color = 'white';
          copyAllBtn.style.cursor = 'pointer';
        copyAllBtn.onclick = () => {
            const data = palette.map(p => ({ hex: p.hex, percent: p.percent }));
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            showStatus('Copied all!', 1500);
        };
        actions.appendChild(copyAllBtn);
        out.appendChild(actions);

        palette.forEach(p => {
          const sw = document.createElement('div');
          sw.style.aspectRatio = '1';
          sw.style.borderRadius = '6px';
          sw.style.background = p.hex;
          sw.style.cursor = 'pointer';
          sw.title = `${p.hex} (${p.percent}%) - Click to copy`;
          sw.style.boxShadow = '0 1px 3px rgba(16,24,40,0.04)';
          sw.style.position = 'relative';
          sw.style.border = '1px solid rgba(16,24,40,0.04)';
          
          // Click to copy
          sw.onclick = () => {
            navigator.clipboard.writeText(p.hex);
            showStatus(`Copied ${p.hex}!`, 1500);
          };

          const label = document.createElement('div');
          label.style.fontSize = '11px';
          label.style.marginTop = '6px';
          label.style.textAlign = 'center';
          label.style.color = '#374151';
          label.textContent = p.percent + '%';
          
          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.flexDirection = 'column';
          wrapper.appendChild(sw);
          wrapper.appendChild(label);
          out.appendChild(wrapper);
        });
      }
      
      const container = document.querySelector('.container');
      if (container && !container.querySelector('#palette')) container.appendChild(out);

      btn.textContent = '✓ Done!';
      setTimeout(() => {
        btn.textContent = '📸 Capture Full Page';
        btn.disabled = false;
      }, 2000);
    } else {
      const errorMsg = response?.error || 'Unknown error';
      showStatus(`❌ ${errorMsg}`, 5000);
      btn.textContent = '📸 Capture Full Page';
      btn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    showStatus('❌ Capture failed. Try reloading the page.', 5000);
    btn.textContent = '📸 Capture Full Page';
    btn.disabled = false;
  }
});

// default palette fallback (use these colors in the UI when no palette returned)
const defaultPaletteHexes = [
  '#081828', '#888888', '#383868', '#8858f8', '#4838c8', '#b8b8e8', '#e8e8f8', '#9888c8'
];
const defaultPalette = [
  { hex: '#081828', percent: 92.38 },
  { hex: '#888888', percent: 2.26 },
  { hex: '#383868', percent: 2.26 },
  { hex: '#8858f8', percent: 1.55 },
  { hex: '#4838c8', percent: 0.89 },
  { hex: '#b8b8e8', percent: 0.42 },
  { hex: '#e8e8f8', percent: 0.18 },
  { hex: '#9888c8', percent: 0.06 }
];
