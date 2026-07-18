# 🎵 Purusharth Tripathi — Personal Portfolio & Official Website

Welcome to the repository of **Purusharth Tripathi's Official Website & Portfolio**. This is a premium, high-performance, single-page web application designed to showcase creative work, musical performances, video reels, and official social handles. 

Built with **modern web aesthetics** and a **touch-first interaction model**, the site bridges rich desktop animations (like WebGL shaders and macOS Dock-style physics) with touch/scroll ergonomics for mobile and tablet devices.

---

## 🚀 Key Features

### 1. 🎨 Dynamic WebGL Background Shader
- Features a custom WebGL drifting noise background shader that generates premium, organic particle movements behind a glassmorphic interface, giving the website a modern, alive, and interactive feel.

### 2. 📸 Instagram-Style Story Highlights
- An interactive story highlights bar displaying custom highlights. 
- Features a premium, customized media viewer that supports both images and video playback.
- **Autoplay & Pause**: Progress bars show time progression. Long-pressing (touch hold or mouse down) pauses playback and freezes the timer.
- **Mobile Ergonomics**: Supports swipe-to-close, clicking outside to dismiss, a keyboard `Escape` handler, and integrated browser history state mapping—allowing users to tap the **Android/iOS back button** to close active stories.

### 3. 🍱 Bento Grid Media Feed (Posts, Reels & Videos)
- Displays dynamic, real-time items fetched from **Firebase Firestore** (with a LocalStorage fallback).
- **Navigation Tabs**: A custom tab-bar (Posts, Reels, Videos) allows users to switch feeds, complete with a sliding underline indicator.
- **Posts Grid**:
  - **Desktop (PC)**: Bento-box layout with varying row and column spans (`featured`, `portrait`, `landscape`) and glassmorphic hover overlays.
  - **Tablet**: 2-column masonry layout preserving natural image heights without cropping, displaying titles cleanly beneath.
  - **Mobile**: 3-column square Instagram-style feed with small $4\text{px}$ gaps, optimized for high-speed thumb scrolling.
- **High-Resolution Lightbox**: Tapping any post opens a fullscreen lightbox showing original high-quality assets. Supports double-tap zoom, pinch-to-zoom gestures, panning, and horizontal swipe navigation.
- **Reels Feed**: High-performance grid layout matching mobile $9:16$ vertical aspect ratios.
- **Videos Feed**: Clean $16:9$ horizontal video cards that open an embedded YouTube player modal.

### 📱 4. Proximity Social Channels Grid
- **Desktop (PC)**: Features a customized macOS Dock-inspired proximity hover algorithm. Moving the cursor near the social cards triggers dynamic scaling, shifts arrow icons, and aligns cursor spotlight coordinates. Features a 3D perspective tilt that tilts cards towards the mouse.
- **Mobile & Tablet**: Replaces mouse hover with a scroll-based focus. The card closest to the vertical center of the screen automatically scales up, shifts up (`translateY(-4px)`), and lights up with its specific branded social colors (Instagram's gradient, YouTube's red, snapchat's yellow, etc.). Cards also support 3D touch-tilt gestures.

### ✍️ 5. Real-Time Interactive Guestbook
- A real-time guestbook messaging section. Visitors can sign the guestbook by leaving comments.
- Synced instantly to Firebase Firestore. Shows a live scroll of guestbook comments in a glassmorphic card deck.

---

## 🛠 Tech Stack

* **Frontend Structure**: HTML5 (Semantic elements)
* **Styling & Transitions**: Tailwind CSS & Vanilla CSS (Fluid spring bezier curves: `cubic-bezier(0.16, 1, 0.3, 1)`)
* **Core Logic**: Vanilla JavaScript (ES6 Modules)
* **Backdrop**: WebGL (GLSL Shaders)
* **Backend Database**: Firebase Firestore (real-time listeners for updates) & Firebase Auth
* **Fallback Storage**: HTML5 LocalStorage (allows full off-line operation during database outages or local testing)
* **Local Development Server**: Custom Node.js Server (`server.js`) with automatic URI decoding support

---

## ⚡ Performance Optimizations

1. **Lazy Loading**: Native browser-level `loading="lazy"` on all post/video grid assets so images only load as they enter the viewport.
2. **Dynamic Google User Content Resizing**: Programmatically parses Google image URLs to request optimized `=w500` resolution thumbnails for grids. Original high-resolution assets are only fetched when opening the fullscreen lightbox.
3. **GPU-Accelerated Transitions**: Relies entirely on CSS variables (`--card-scale`, `--card-translate-y`) and GPU-supported transform/opacity properties to prevent page jank and maintain a consistent 60 FPS refresh rate.
