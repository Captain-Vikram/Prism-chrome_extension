<div align="center">

# 🌈 Prism

### Full-Page Screenshot & Color Palette Extractor

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://github.com/Captain-Vikram/Prism-chrome_extension-)
[![Version](https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge)](manifest.json)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A powerful, minimalist Chrome extension to capture full-page screenshots and extract dominant color palettes locally.**

[Report Bug](https://github.com/Captain-Vikram/Prism-chrome_extension-/issues) · [Request Feature](https://github.com/Captain-Vikram/Prism-chrome_extension-/issues)

</div>

---

## 🚀 About Prism

Prism is designed for designers and developers who need to analyze the color usage of a webpage instantly. Unlike standard screenshot tools, Prism captures the **entire page** (even parts not visible in the viewport) and uses an intelligent offscreen processor to extract a quantized color palette.

**Author:** Vighnesh  
**Repository:** [https://github.com/Captain-Vikram/Prism-chrome_extension-.git](https://github.com/Captain-Vikram/Prism-chrome_extension-.git)

## ✨ Features

- 📸 **Full-Page Capture**: Uses Chrome DevTools Protocol for pixel-perfect full-page screenshots.
- 🎨 **Smart Palette Extraction**: Extracts dominant colors using quantization and clustering to merge similar shades.
- 🔒 **Privacy Focused**: Option to extract the palette _without_ saving the screenshot to your disk.
- 💅 **Minimalist UI**: Clean popup interface and a non-intrusive on-page overlay.
- ⚡ **Floating Action Button**: Automatically appears when you scroll to the bottom of a page.
- 💾 **Export Ready**: Copy individual hex codes or download the full palette as JSON.

## 📦 Installation

### For Developers / Manual Install

1.  **Clone the repository** or download the ZIP.
    ```bash
    git clone https://github.com/Captain-Vikram/Prism-chrome_extension-.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `scroll-snap-extension` folder from this repository.
6.  The **Prism** icon should appear in your toolbar!

> **Note:** A packed version `prism.zip` is also included in the root of this repository for convenience.

## 🎮 Usage

1.  **Navigate** to any webpage you want to analyze.
2.  **Click** the Prism extension icon in the toolbar.
3.  **Capture**:
    - Click **Capture Full Page** in the popup.
    - _Optional:_ Toggle "Only extract palette" if you don't want to save the image file.
4.  **Analyze**:
    - Wait for the "Analysis complete" message.
    - An overlay will appear on the page showing the dominant colors.
    - Click any color to copy its HEX code, or download the entire palette as JSON.

## 🛠️ Tech Stack

- **Manifest V3**: Future-proof Chrome Extension architecture.
- **Offscreen API**: For heavy image processing without blocking the UI.
- **Chrome DevTools Protocol**: For reliable full-page screenshots.
- **Shadow DOM**: Ensures the overlay styles never conflict with the host page.

## 📂 Project Structure

```text
root/
├── scroll-snap-extension/   # Source code
│   ├── background.js        # Service worker (Capture logic)
│   ├── content.js           # Floating button script
│   ├── content_ui.js        # Palette overlay UI
│   ├── offscreen.js         # Image processing & clustering
│   ├── popup.html           # Extension popup
│   └── manifest.json        # Extension configuration
├── prism.zip                # Packed extension archive
└── README.md                # Documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

<div align="center">
  Made with ❤️ by Vighnesh
</div>
