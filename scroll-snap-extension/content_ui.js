
// --- Palette Overlay UI ---
(function() {
  let overlayContainer = null;

  function createPaletteOverlay(palette) {
    // Remove existing if any
    if (overlayContainer) {
      overlayContainer.remove();
    }

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'prism-palette-host';
    document.body.appendChild(overlayContainer);

    const shadow = overlayContainer.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        z-index: 2147483647;
        position: fixed;
        top: 20px;
        right: 20px;
      }

      .container {
        width: 320px;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #ffffff;
        color: #333333;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
        border: 1px solid rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
      }

      @keyframes slideIn {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .header {
        padding: 14px 16px;
        border-bottom: 1px solid #f1f1f4;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: transparent;
      }

      .title {
        font-family: 'Playfair Display', serif;
        font-weight: 700;
        font-size: 16px;
        color: #1a1a1a;
      }

      .close-btn {
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: #666;
        font-size: 18px;
        line-height: 1;
      }
      .close-btn:hover { background: #eee; color: #000; }

      .content {
        padding: 16px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .section-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #666;
        margin-bottom: 12px;
        font-weight: 600;
      }

      .palette-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }

      .color-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        position: relative;
      }

      .swatch {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
        margin-bottom: 4px;
        transition: transform 0.1s;
        position: relative;
      }
      
      .color-item:hover .swatch {
        transform: scale(1.05);
      }

      .checkbox {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 18px;
        height: 18px;
        background: white;
        border: 2px solid #ddd;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      /* use same accent as popup: #4838c8 */
      .color-item.selected .checkbox {
        background: #4838c8;
        border-color: #4838c8;
      }

      .color-item.selected .checkbox::after {
        content: '✓';
        color: white;
        font-size: 12px;
        font-weight: bold;
      }

      .hex-code {
        font-size: 10px;
        color: #444;
        font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      }
      
      .percent {
        font-size: 9px;
        color: #888;
      }

      .actions {
        padding: 12px 16px;
        border-top: 1px solid #f1f1f4;
        background: transparent;
      }

      .btn {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }

      .btn-primary {
        background: #4838c8;
        color: white;
      }
      .btn-primary:hover { filter: brightness(0.95); }
      
      .btn-secondary {
        background: #e5e7eb;
        color: #374151;
        margin-top: 8px;
      }
      .btn-secondary:hover { background: #d1d5db; }
    `;

    const container = document.createElement('div');
    container.className = 'container';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div class="title">Prism</div>
      <button class="close-btn">×</button>
    `;
    header.querySelector('.close-btn').onclick = () => overlayContainer.remove();

    // Content
    const content = document.createElement('div');
    content.className = 'content';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = 'Dominant Colors';
    content.appendChild(sectionTitle);

    const grid = document.createElement('div');
    grid.className = 'palette-grid';

    if (!palette || palette.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.gridColumn = '1 / -1';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.padding = '20px';
      emptyMsg.style.color = '#666';
      emptyMsg.style.fontSize = '13px';
      emptyMsg.textContent = 'No colors detected. The image might be blank or protected.';
      grid.appendChild(emptyMsg);
    } else {
      palette.forEach((color, index) => {
        const item = document.createElement('div');
        item.className = 'color-item selected'; // Default selected
        item.dataset.hex = color.hex;
        
        item.innerHTML = `
          <div class="swatch" style="background-color: ${color.hex}">
            <div class="checkbox"></div>
          </div>
          <span class="hex-code">${color.hex}</span>
          <span class="percent">${color.percent}%</span>
        `;

        item.onclick = () => {
          item.classList.toggle('selected');
          updateProcessButton();
        };

        grid.appendChild(item);
      });
    }

    content.appendChild(grid);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const processBtn = document.createElement('button');
    processBtn.className = 'btn btn-primary';
    processBtn.textContent = `Copy Selected (${palette.length})`;
    processBtn.onclick = () => {
      const selected = Array.from(shadow.querySelectorAll('.color-item.selected'))
        .map(el => el.dataset.hex);
      
      if (selected.length > 0) {
        navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
        processBtn.textContent = 'Copied to Clipboard!';
        setTimeout(() => updateProcessButton(), 2000);
      }
    };

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary';
    downloadBtn.textContent = 'Download JSON';
    downloadBtn.onclick = () => {
       const selected = Array.from(shadow.querySelectorAll('.color-item.selected'))
        .map(el => {
           const hex = el.dataset.hex;
           const p = palette.find(x => x.hex === hex);
           return p;
        });
        
        const blob = new Blob([JSON.stringify(selected, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'palette.json';
        a.click();
    };

    function updateProcessButton() {
      const count = shadow.querySelectorAll('.color-item.selected').length;
      processBtn.textContent = `Copy Selected (${count})`;
    }

    actions.appendChild(processBtn);
    actions.appendChild(downloadBtn);

    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(actions);

    shadow.appendChild(style);
    shadow.appendChild(container);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_PALETTE_OVERLAY') {
      createPaletteOverlay(message.palette);
    }
  });
})();
