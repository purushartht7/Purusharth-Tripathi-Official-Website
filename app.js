/**
 * Purusharth Tripathi Personal Portfolio - Core Application Logic
 */

import { addMessage, listenToMessages, getSettings, getProjects, listenToHighlights, listenToPosts, listenToReels, listenToVideos, getYouTubeId } from "./firebase-config.js";

const isMobileOrTablet = () => window.matchMedia("(max-width: 1024px)").matches;

function initApp() {
    // 1. Initialize WebGL drifting noise background shader
    initBackgroundShader();

    // 2. Initialize 3D Card Tilt effects & Custom Hover Gradients
    initCardTilts();

    // 3. Initialize Scroll Reveal Intersection Observer
    initScrollReveal();

    // macOS Dock Proximity Effect
    initSocialDockEffect();

    // Mobile & Tablet Social Channels touch-first interaction
    initSocialMobileInteraction();

    // Mobile & Tablet fullscreen post Lightbox viewer
    initLightbox();

    // 4. Initialize Interactive Guestbook bindings
    initGuestbook();

    // 5. Initialize Dynamic Database Content Binding
    initDynamicContent();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

/* ────────────────────────────────────────────────────────
   1. WEBGL DRIFTING NOISE BACKGROUND SHADER
   ──────────────────────────────────────────────────────── */
function initBackgroundShader() {
    const canvas = document.getElementById('shader-canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fsSource = `
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        // Simplex 2D noise helpers
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

        float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            vec2 mouse = u_mouse / u_resolution;
            
            // Generate drifting ambient waves
            float n = snoise(uv * 1.5 + u_time * 0.05);
            n += 0.4 * snoise(uv * 3.0 - u_time * 0.08);
            
            // Dual-accent gradient palette matching Dark Obsidian theme
            vec3 baseBackground = vec3(0.05, 0.05, 0.06); // Tier 0 Obsidian
            vec3 purpleWave = vec3(0.11, 0.08, 0.16);     // Amethyst vibe
            vec3 blueWave = vec3(0.06, 0.08, 0.14);       // Sapphire vibe
            
            vec3 color = mix(baseBackground, purpleWave, n * 0.5 + 0.5);
            color = mix(color, blueWave, snoise(uv * 2.0 + u_time * 0.04) * 0.3 + 0.3);
            
            // Mouse Proximity Glowing Accent
            float dist = distance(uv, mouse);
            float glow = smoothstep(0.35, 0.0, dist);
            color += vec3(0.65, 0.55, 0.95) * glow * 0.12; // Light violet trail
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Shader program link error.');
        return;
    }
    gl.useProgram(program);

    const positions = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = window.innerHeight - e.clientY;
    });

    function resizeCanvas() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
    }

    function render(time) {
        resizeCanvas();
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.uniform1f(timeLoc, time * 0.001);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.uniform2f(mouseLoc, mouseX, mouseY);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // Parallax background photo drift
    document.addEventListener('mousemove', (e) => {
        const bgImg = document.querySelector('.parallax-bg img');
        if (bgImg) {
            const dx = (e.clientX / window.innerWidth - 0.5) * 15;
            const dy = (e.clientY / window.innerHeight - 0.5) * 15;
            bgImg.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
        }
    });
}

/* ────────────────────────────────────────────────────────
   2. 3D CARD TILT EFFECTS
   ──────────────────────────────────────────────────────── */
function initCardTilts() {
    document.querySelectorAll('.social-card').forEach(card => {
        const handleMove = (x, y, rect) => {
            // Set mouse variables for glow gradients
            card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Max 10 deg rotation for professional aesthetics
            const rotateX = ((centerY - y) / centerY) * 10;
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(var(--card-scale, 1)) translateY(var(--card-translate-y, 0px))`;
        };

        card.addEventListener('mousemove', (e) => {
            if (isMobileOrTablet()) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            handleMove(x, y, rect);
        });

        card.addEventListener('mouseleave', () => {
            if (isMobileOrTablet()) return;
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        });

        // Mobile/Tablet touch tilt support
        card.addEventListener('touchstart', (e) => {
            if (!isMobileOrTablet()) return;
            const rect = card.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            handleMove(x, y, rect);
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!isMobileOrTablet()) return;
            const rect = card.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            handleMove(x, y, rect);
        }, { passive: true });

        card.addEventListener('touchend', () => {
            if (!isMobileOrTablet()) return;
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(var(--card-scale, 1)) translateY(var(--card-translate-y, 0px))`;
        });
    });
}

/* ────────────────────────────────────────────────────────
   3. SCROLL REVEAL INTERSECTION OBSERVER
   ──────────────────────────────────────────────────────── */
function initScrollReveal() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.05,
        rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
}

/* ────────────────────────────────────────────────────────
   3B. MAC-OS DOCK INSPIRED MAGNETIC HOVER EFFECT
   ──────────────────────────────────────────────────────── */
function initSocialDockEffect() {
    const grid = document.getElementById('social-grid');
    if (!grid) return;

    const wrappers = grid.querySelectorAll('.social-card-wrapper');
    const cards = grid.querySelectorAll('.social-card');

    document.addEventListener('mousemove', (e) => {
        if (isMobileOrTablet()) return;
        const gridRect = grid.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Check if vertical and horizontal offsets from grid are within 400px
        const isClose = (
            mouseX >= gridRect.left - 400 &&
            mouseX <= gridRect.right + 400 &&
            mouseY >= gridRect.top - 400 &&
            mouseY <= gridRect.bottom + 400
        );

        if (!isClose) {
            resetSocialStyles();
            return;
        }

        wrappers.forEach((wrapper) => {
            const card = wrapper.querySelector('.social-card');
            const rect = wrapper.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = mouseX - cx;
            const dy = mouseY - cy;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = 350; // Proximity radius

            if (distance < radius) {
                const factor = Math.pow(1 - (distance / radius), 1.6); // Smooth decay peak

                // 1. Proximity Scale on wrapper (max 1.10 - increased by 2x zoom factor)
                const wrapperScale = 1 + factor * 0.10;
                wrapper.style.transform = `scale(${wrapperScale})`;

                // 2. Proximity variables on card
                card.style.setProperty('--icon-scale', (1 + factor * 0.20).toString()); // max 1.20
                card.style.setProperty('--glow-intensity', factor.toString());
                card.style.setProperty('--border-opacity', (0.1 + factor * 0.25).toString()); // from 0.1 to 0.35
                
                // Subtle elevation shadow and ambient glow enlargement
                const shadowBlur = 32 + factor * 16;
                const glowSpread = 20 + factor * 20;
                card.style.setProperty('--elevation-shadow', `0 8px ${shadowBlur}px 0 rgba(0, 0, 0, 0.4), 0 0 ${glowSpread}px rgba(255, 255, 255, ${factor * 0.06})`);

                // 3. Arrow Translate
                const angle = Math.atan2(dy, dx);
                const tx = Math.cos(angle) * factor * 6; // max 6px translate toward cursor direction
                const ty = Math.sin(angle) * factor * 6;
                card.style.setProperty('--arrow-tx', `${tx}px`);
                card.style.setProperty('--arrow-ty', `${ty}px`);
                card.style.setProperty('--arrow-scale', (1 + factor * 0.16).toString()); // max 1.16

                // 4. Cursor Spotlight coordinates local to the card
                const localX = mouseX - rect.left;
                const localY = mouseY - rect.top;
                card.style.setProperty('--spotlight-x', `${localX}px`);
                card.style.setProperty('--spotlight-y', `${localY}px`);
                card.style.setProperty('--spotlight-opacity', (factor * 0.95).toString());
            } else {
                resetCardStyles(wrapper, card);
            }
        });
    });

    document.addEventListener('mouseleave', resetSocialStyles);
    document.addEventListener('blur', resetSocialStyles);

    function resetCardStyles(wrapper, card) {
        wrapper.style.transform = '';
        card.style.removeProperty('--icon-scale');
        card.style.removeProperty('--glow-intensity');
        card.style.removeProperty('--border-opacity');
        card.style.removeProperty('--elevation-shadow');
        card.style.removeProperty('--arrow-tx');
        card.style.removeProperty('--arrow-ty');
        card.style.removeProperty('--arrow-scale');
        card.style.removeProperty('--spotlight-x');
        card.style.removeProperty('--spotlight-y');
        card.style.removeProperty('--spotlight-opacity');
    }

    function resetSocialStyles() {
        if (isMobileOrTablet()) return;
        wrappers.forEach((wrapper) => {
            const card = wrapper.querySelector('.social-card');
            resetCardStyles(wrapper, card);
        });
    }
}

function initSocialMobileInteraction() {
    const grid = document.getElementById('social-grid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.social-card');

    // Touch Tap Handler
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (!isMobileOrTablet()) return;

            e.preventDefault();

            if (card.classList.contains('touch-animating')) return;
            card.classList.add('touch-animating', 'active-focus');

            // Apply tap active styles
            card.style.setProperty('--card-scale', '1.03');
            card.style.setProperty('--card-translate-y', '-2px');
            card.style.setProperty('--border-opacity', '0.45');
            card.style.setProperty('--glow-intensity', '0.7');
            card.style.setProperty('--icon-scale', '1.08');
            card.style.setProperty('--elevation-shadow', '0 16px 48px 0 rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 255, 255, 0.08)');

            // Delay navigation slightly to let the spring transition play
            setTimeout(() => {
                const href = card.getAttribute('href');
                const target = card.getAttribute('target') || '_blank';
                if (href) {
                    window.open(href, target);
                }

                setTimeout(() => {
                    card.classList.remove('touch-animating', 'active-focus');
                    // Reset to current scroll state
                    handleScrollFocus();
                }, 100);
            }, 300);
        });
    });

    // Scroll Focus Handler
    function handleScrollFocus() {
        if (!isMobileOrTablet()) {
            return;
        }

        const viewportCenterY = window.innerHeight / 2;
        let closestCard = null;
        let minDistance = Infinity;

        cards.forEach(card => {
            // If currently touch animating, skip to prevent overriding its tap style
            if (card.classList.contains('touch-animating')) {
                closestCard = card; // treat it as closest to avoid losing focus
                return;
            }

            const rect = card.getBoundingClientRect();
            const cardCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(cardCenterY - viewportCenterY);

            // Check if card is visible in viewport
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCard = card;
                }
            }
        });

        cards.forEach(card => {
            if (card.classList.contains('touch-animating')) return;

            if (card === closestCard) {
                // Add active-focus class to trigger card's unique ambient glow & border color
                card.classList.add('active-focus');

                // Scale to 1.03-1.05, brighter border, lift -4px, stronger glow
                card.style.setProperty('--card-scale', '1.04');
                card.style.setProperty('--card-translate-y', '-4px');
                card.style.setProperty('--border-opacity', '0.35');
                card.style.setProperty('--glow-intensity', '0.5');
                card.style.setProperty('--elevation-shadow', '0 12px 40px 0 rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 255, 255, 0.06)');
            } else {
                // Remove active-focus class to reset back to default
                card.classList.remove('active-focus');

                // Reset to default
                card.style.removeProperty('--card-scale');
                card.style.removeProperty('--card-translate-y');
                card.style.removeProperty('--border-opacity');
                card.style.removeProperty('--glow-intensity');
                card.style.removeProperty('--elevation-shadow');
            }
        });
    }

    // Scroll event listener
    let scrollTimeout = null;
    window.addEventListener('scroll', () => {
        if (!isMobileOrTablet()) return;
        if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
        scrollTimeout = requestAnimationFrame(handleScrollFocus);
    }, { passive: true });

    // Viewport Resize Sync
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleViewChange = (e) => {
        if (!e.matches) {
            // PC view: remove all mobile styles and classes
            cards.forEach(card => {
                card.classList.remove('touch-animating', 'active-focus');
                card.style.removeProperty('--card-scale');
                card.style.removeProperty('--card-translate-y');
                card.style.removeProperty('--border-opacity');
                card.style.removeProperty('--glow-intensity');
                card.style.removeProperty('--elevation-shadow');
                card.style.removeProperty('--icon-scale');
            });
        } else {
            // Mobile/tablet view: remove any desktop inline styles (like tilt transform)
            cards.forEach(card => {
                card.style.transform = '';
            });
            handleScrollFocus();
        }

        // Re-render posts grid to load optimized thumbnails vs original images
        if (cachedPosts && cachedPosts.length > 0) {
            renderPostsGrid(cachedPosts);
        }
    };
    mediaQuery.addEventListener('change', handleViewChange);

    // Initial check on load/interaction setup
    handleScrollFocus();
}

// Global exposure for switching tabs
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active');

    // Update buttons style
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-primary', 'border-primary', 'border-b-2');
        btn.classList.add('text-on-surface-variant');
    });

    // Highlight clicked button
    const buttons = Array.from(document.querySelectorAll('.tab-btn'));
    const clickedBtn = buttons.find(b => b.innerText.trim().toLowerCase() === tabId.toLowerCase());
    if (clickedBtn) {
        clickedBtn.classList.remove('text-on-surface-variant');
        clickedBtn.classList.add('text-primary', 'border-primary', 'border-b-2');
    }

    // Update navigation bar buttons style
    document.querySelectorAll('.nav-link-btn').forEach(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('switchNavTab')) {
            btn.classList.remove('text-primary', 'border-primary', 'border-b-2', 'pb-1');
            btn.classList.add('text-on-surface-variant', 'hover:text-primary', 'transition-colors', 'hover:opacity-80', 'transition-opacity');
        }
    });

    // Highlight clicked navigation bar button
    const navButtons = Array.from(document.querySelectorAll('.nav-link-btn'));
    const clickedNavBtn = navButtons.find(b => {
        const onclickAttr = b.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(tabId);
    });
    if (clickedNavBtn) {
        clickedNavBtn.classList.remove('text-on-surface-variant', 'hover:text-primary', 'hover:opacity-80');
        clickedNavBtn.classList.add('text-primary', 'border-primary', 'border-b-2', 'pb-1');
    }
};

window.switchNavTab = function(tabId) {
    if (tabId === 'guestbook') {
        // Reset all navigation bar buttons
        document.querySelectorAll('.nav-link-btn').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes('switchNavTab')) {
                btn.classList.remove('text-primary', 'border-primary', 'border-b-2', 'pb-1');
                btn.classList.add('text-on-surface-variant', 'hover:text-primary', 'transition-colors', 'hover:opacity-80', 'transition-opacity');
            }
        });

        // Highlight Guestbook button
        const navButtons = Array.from(document.querySelectorAll('.nav-link-btn'));
        const clickedNavBtn = navButtons.find(b => {
            const onclickAttr = b.getAttribute('onclick');
            return onclickAttr && onclickAttr.includes('guestbook');
        });
        if (clickedNavBtn) {
            clickedNavBtn.classList.remove('text-on-surface-variant', 'hover:text-primary', 'hover:opacity-80');
            clickedNavBtn.classList.add('text-primary', 'border-primary', 'border-b-2', 'pb-1');
        }

        // Smooth scroll to guestbook
        document.getElementById("guestbook-section")?.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Switch to target tab
        window.switchTab(tabId);
        // Smooth scroll to feed
        document.getElementById("media-section")?.scrollIntoView({ behavior: 'smooth' });
    }
};

window.scrollToSection = function(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

window.openProjectModal = function(proj) {
    const modal = document.getElementById("project-detail-modal");
    const content = document.getElementById("project-detail-modal-content");
    
    if (!modal || !content) return;
    
    document.getElementById("project-modal-image").src = proj.imageUrl || "";
    document.getElementById("project-modal-title").innerText = proj.title || "";
    document.getElementById("project-modal-short-desc").innerText = proj.description || "";
    document.getElementById("project-modal-detailed-desc").innerText = proj.detailedDescription || proj.description || "";
    
    const link = document.getElementById("project-modal-link");
    if (link) {
        link.href = proj.liveUrl || "#";
        
        // Reset base classes to override previous colors
        link.className = "project-modal-go-card group relative px-8 py-3.5 rounded-xl bg-surface-container/80 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-300 hover:scale-[1.03] shadow-2xl flex items-center justify-center gap-3 cursor-pointer w-full max-w-[280px]";
        
        const titleLower = (proj.title || "").toLowerCase();
        const idLower = (proj.id || "").toLowerCase();
        
        if (idLower === "redcardlive" || titleLower.includes("red")) {
            link.classList.add("hover:shadow-red-500/20", "hover:border-red-500/30");
        } else if (idLower === "rivalinretro" || titleLower.includes("retro") || titleLower.includes("green")) {
            link.classList.add("hover:shadow-green-500/20", "hover:border-green-500/30");
        } else {
            link.classList.add("hover:shadow-white/10", "hover:border-white/20");
        }
        
        if (proj.liveUrl) {
            link.style.display = "flex";
        } else {
            link.style.display = "none";
        }
    }
    
    modal.classList.remove("hidden");
    setTimeout(() => {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
    }, 10);
    
    document.body.style.overflow = "hidden";
    
    const closeBtn = document.getElementById("project-detail-modal-close");
    const closeHandler = () => {
        content.classList.remove("scale-100", "opacity-100");
        content.classList.add("scale-95", "opacity-0");
        setTimeout(() => {
            modal.classList.add("hidden");
            document.body.style.overflow = "";
        }, 300);
    };
    
    closeBtn.onclick = closeHandler;
    modal.onclick = (e) => {
        if (e.target === modal) closeHandler();
    };
};

/* ────────────────────────────────────────────────────────
   4. INTERACTIVE GUESTBOOK (FIREBASE / LOCALSTORAGE FALLBACK)
   ──────────────────────────────────────────────────────── */
function initGuestbook() {
    const form = document.getElementById("guestbook-form");
    const nameInput = document.getElementById("guest-name");
    const msgInput = document.getElementById("guest-message");
    const wall = document.getElementById("messages-wall");
    const counter = document.getElementById("msg-counter");

    if (!form || !wall) return;

    // Selected state trackers
    let selectedColor = "obsidian";
    let selectedEmoji = "✨";

    // Bind emoji selectors
    const emojiBtns = document.querySelectorAll(".emoji-btn");
    emojiBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            emojiBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedEmoji = btn.innerText;
        });
    });

    // Bind color theme selectors
    const colorBtns = document.querySelectorAll(".color-btn");
    colorBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            colorBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedColor = btn.dataset.color;
        });
    });

    // Handle Form Submit
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const msg = msgInput.value.trim();

        if (!name || !msg) return;

        // Disable button during submit
        const submitBtn = form.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.classList.add("opacity-50");

        try {
            await addMessage({
                name: name,
                message: msg,
                color: selectedColor,
                emoji: selectedEmoji
            });
            // Reset input values
            msgInput.value = "";
        } catch (err) {
            console.error("Failed to add message:", err);
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove("opacity-50");
        }
    });

    // Listen to real-time updates from Firebase/LocalStorage
    listenToMessages((messages) => {
        renderMessages(messages);
    });

    function renderMessages(messages) {
        wall.innerHTML = "";
        counter.innerText = `MESSAGES (${messages.length})`;

        if (messages.length === 0) {
            wall.innerHTML = `
                <div class="col-span-2 text-center text-on-surface-variant text-xs py-8 opacity-60">
                    No notes left on the wall yet. Be the first to post!
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const card = document.createElement("div");
            card.className = `p-4 rounded-xl border border-white/5 transition-all duration-300 card-theme-${msg.color}`;
            
            // Format timestamp nicely (local format)
            const date = new Date(msg.timestamp);
            const timeString = date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            card.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <h5 class="text-primary font-semibold text-sm truncate pr-2">${escapeHTML(msg.name)}</h5>
                    <span class="text-lg select-none">${msg.emoji}</span>
                </div>
                <p class="text-on-surface-variant text-xs leading-relaxed mb-3 whitespace-pre-wrap">${escapeHTML(msg.message)}</p>
                <div class="text-[9px] font-label-caps text-on-surface-variant/50 text-right uppercase">${timeString}</div>
            `;
            wall.appendChild(card);
        });
    }
}

/* ────────────────────────────────────────────────────────
   5. DYNAMIC CONTENT MAPPING CONTROLLER
   ──────────────────────────────────────────────────────── */
async function initDynamicContent() {
    // A. Load Settings
    try {
        const settings = await getSettings();
        applySettings(settings);
    } catch (e) {
        console.error("Failed to load settings:", e);
    }

    // B. Load Showcase Projects
    try {
        const projects = await getProjects();
        renderShowcaseProjects(projects);
    } catch (e) {
        console.error("Failed to load/render projects:", e);
    }

    // C. Listen to Dynamic Highlights
    try {
        listenToHighlights((highlights) => {
            renderStoryHighlights(highlights);
        });
    } catch (e) {
        console.error("Failed to setup highlights listener:", e);
    }

    // D. Listen to Dynamic Posts
    try {
        listenToPosts((posts) => {
            cachedPosts = posts;
            renderPostsGrid(posts);
        });
    } catch (e) {
        console.error("Failed to setup posts listener:", e);
    }

    // E. Listen to Dynamic Reels
    try {
        listenToReels((reels) => {
            renderReelsGrid(reels);
        });
    } catch (e) {
        console.error("Failed to setup reels listener:", e);
    }

    // F. Listen to Real-time YouTube Videos
    try {
        listenToVideos((videos) => {
            renderVideosGrid(videos);
        });
    } catch (e) {
        console.error("Failed to setup real-time videos listener:", e);
    }
}

function applySettings(settings) {
    if (!settings) return;

    // Apply Site SEO Title
    if (settings.siteTitle) {
        document.title = settings.siteTitle;
    }

    // Apply Email Contacts
    if (settings.contactEmail) {
        const mailto = `mailto:${settings.contactEmail}`;
        const navMail = document.getElementById("nav-mail-link");
        if (navMail) navMail.href = mailto;

        const heroBtn = document.getElementById("hero-contact-btn");
        if (heroBtn) heroBtn.href = mailto;

        const footerMail = document.getElementById("footer-contact-link");
        if (footerMail) footerMail.href = mailto;
    }

    // Apply Social Hrefs
    if (settings.instagram) {
        const navIg = document.getElementById("nav-instagram-link");
        if (navIg) navIg.href = settings.instagram;
        const cardIg = document.getElementById("social-instagram-card");
        if (cardIg) cardIg.href = settings.instagram;
    }
    if (settings.youtube) {
        const cardYt = document.getElementById("social-youtube-card");
        if (cardYt) cardYt.href = settings.youtube;

        const modalSub = document.getElementById("video-modal-subscribe");
        if (modalSub) {
            let url = settings.youtube;
            if (url && !url.includes("sub_confirmation")) {
                url += (url.includes("?") ? "&" : "?") + "sub_confirmation=1";
            }
            modalSub.href = url;
        }
    }
    if (settings.linkedin) {
        const cardLi = document.getElementById("social-linkedin-card");
        if (cardLi) cardLi.href = settings.linkedin;
    }
    if (settings.x) {
        const cardX = document.getElementById("social-x-card");
        if (cardX) cardX.href = settings.x;
    }
    if (settings.snapchat) {
        const cardSc = document.getElementById("social-snapchat-card");
        if (cardSc) cardSc.href = settings.snapchat;
    }
    if (settings.soundcloud) {
        const cardSnd = document.getElementById("social-soundcloud-card");
        if (cardSnd) cardSnd.href = settings.soundcloud;
    }

    // Apply Maintenance Gate overlay
    if (settings.maintenanceMode) {
        const maintenanceDiv = document.createElement("div");
        maintenanceDiv.className = "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#131313]/98 backdrop-blur-md text-center p-8";
        maintenanceDiv.innerHTML = `
            <div class="glass-panel p-10 rounded-2xl border border-white/10 max-w-md w-full relative overflow-hidden shadow-2xl">
                <div class="absolute -top-24 w-48 h-48 rounded-full bg-secondary-fixed-dim/5 blur-3xl pointer-events-none"></div>
                <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span class="material-symbols-outlined text-secondary-fixed-dim text-3xl animate-spin" style="animation-duration: 10s;">settings</span>
                </div>
                <h1 class="text-3xl font-display-lg text-primary tracking-tighter mb-4">Under Maintenance</h1>
                <p class="text-on-surface-variant text-sm leading-relaxed mb-8">The portfolio website is undergoing scheduled content additions and profile configurations.</p>
                <a href="admin.html" class="inline-block bg-primary hover:bg-white/95 text-background font-label-caps text-xs px-6 py-2.5 rounded-full font-bold transition-colors">Admin Access Gate</a>
            </div>
        `;
        document.body.appendChild(maintenanceDiv);
    }
}

function renderShowcaseProjects(projects) {
    const container = document.getElementById("projects-container");
    if (!container || !projects || projects.length === 0) return;

    // Filter published projects
    const published = projects.filter(p => p.status === "published");
    if (published.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant italic text-xs py-10 bg-white/2 border border-white/5 rounded-2xl">
                No active projects in portfolio showcase.
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    published.forEach((proj, idx) => {
        // Toggle theme layout alternatingly for visual flow
        const isEven = idx % 2 === 0;
        const themeColor = isEven ? "red" : "green";
        const accentText = isEven ? "text-red-500" : "text-green-500";
        const badgeColor = isEven ? "text-red-400 bg-red-950/40 border-red-900/30" : "text-green-400 bg-green-950/40 border-green-900/30";
        const iconName = isEven ? "sports_soccer" : "shopping_bag";
        const shadowGlow = isEven ? "hover:shadow-red-500/10" : "hover:shadow-green-500/10";
        const radialGlow = isEven ? "bg-red-600/20" : "bg-green-500/20";
        const headerTitle = isEven 
            ? `${escapeHTML(proj.title.split(/(?=[A-Z])/)[0] || proj.title)}<span class="text-red-600">${escapeHTML(proj.title.split(/(?=[A-Z])/).slice(1).join("") || "")}</span>`
            : `${escapeHTML(proj.title.split(/(?=[A-Z])/)[0] || proj.title)}<span class="text-green-500">${escapeHTML(proj.title.split(/(?=[A-Z])/).slice(1).join("") || "")}</span>`;

        const revealClass = isEven ? "project-reveal-left" : "project-reveal-right";
        const wrapper = document.createElement("div");
        wrapper.className = `project-card-wrapper ${revealClass}`;

        const card = document.createElement("div");
        card.className = `project-card group relative rounded-3xl overflow-hidden bg-white/[0.02] backdrop-blur-[40px] border border-white/[0.05] transition-all duration-700 hover:border-white/[0.15] shadow-2xl ${shadowGlow} hover:-translate-y-1 cursor-pointer`;
        
        card.innerHTML = `
            <!-- Project-themed Details (faint grid texture) -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,${isEven ? 'rgba(239,68,68,0.03)' : 'rgba(16,185,129,0.03)'},transparent_50%)] pointer-events-none z-0"></div>
            <svg class="absolute right-0 top-0 w-2/3 h-full text-white/5 opacity-[0.012] pointer-events-none select-none z-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="0.3">
                <path d="M0,10 H100 M0,20 H100 M0,30 H100 M0,40 H100 M0,50 H100 M0,60 H100 M0,70 H100 M0,80 H100 M0,90 H100" />
                <path d="M10,0 V100 M20,0 V100 M30,0 V100 M40,0 V100 M50,0 V100 M60,0 V100 M70,0 V100 M80,0 V100 M90,0 V100" />
            </svg>

            <!-- Large Glow spilling over card (15-20%) -->
            <div class="absolute top-1/2 left-[22%] -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] ${isEven ? 'bg-red-600/10' : 'bg-emerald-600/10'} rounded-full blur-[80px] pointer-events-none mix-blend-screen z-0 project-logo-glow"></div>

            <div class="relative z-10 flex flex-col lg:flex-row items-center p-6 lg:p-8 gap-6 lg:gap-10">
                <!-- 45% Logo Area -->
                <div class="w-full lg:w-[45%] lg:basis-[45%] flex justify-center relative py-4 shrink-0 z-10">
                    <div class="relative w-full max-w-[300px] aspect-square flex items-center justify-center project-logo-container">
                        <!-- Ambient Radial Glow -->
                        <div class="absolute w-[220px] h-[220px] ${isEven ? 'bg-red-600/25' : 'bg-emerald-500/25'} rounded-full blur-[80px] opacity-35 mix-blend-screen pointer-events-none project-logo-glow"></div>
                        
                        <!-- Logo Image with float animation wrapper -->
                        <div class="relative z-10 w-full h-full flex items-center justify-center project-logo-wrapper project-logo-floating-wrapper">
                            <img src="${proj.imageUrl}" class="w-full h-full object-contain project-logo-img animate-pulse" alt="${escapeHTML(proj.title)}">
                        </div>
                    </div>
                </div>
                <!-- 55% Content Area -->
                <div class="w-full lg:w-[55%] lg:basis-[55%] space-y-4 z-10">
                    <h3 class="font-display-lg text-2xl md:text-3xl text-primary">${headerTitle}</h3>
                    <p class="font-body-md text-on-surface-variant leading-relaxed opacity-80">
                        ${escapeHTML(proj.description)}
                    </p>
                    
                    <div class="pt-2">
                        <button class="learn-more-btn font-label-caps text-xs text-secondary-fixed-dim hover:text-primary transition-colors flex items-center gap-1.5">
                            <span>Learn More</span>
                            <span class="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.openProjectModal(proj);
        });

        wrapper.appendChild(card);
        container.appendChild(wrapper);
    });
}

// A. STORY HIGHLIGHTS RENDERER & INTERACTIVE VIEWER CONTROLLER
let storyHighlightsList = [];
let activeHighlightIndex = 0;
let activeStoryIndex = 0;
let storyTimer = null;
let storyProgress = 0;
let isStoryPaused = false;
let currentStoryDuration = 5000; 
let storyStartTime = 0;
let storyPausedTime = 0;

function renderStoryHighlights(highlights) {
    const container = document.getElementById("story-highlights-container");
    if (!container) return;

    storyHighlightsList = highlights.filter(h => h.visible);
    container.innerHTML = "";

    if (storyHighlightsList.length === 0) {
        container.innerHTML = `<p class="text-on-surface-variant text-xs italic">No active highlights.</p>`;
        return;
    }

    storyHighlightsList.forEach((hl, index) => {
        const div = document.createElement("div");
        div.className = "flex flex-col items-center gap-2 cursor-pointer group w-20 shrink-0";
        
        const isIcon = hl.thumbnailUrl && !hl.thumbnailUrl.startsWith("http") && !hl.thumbnailUrl.startsWith("data:") && hl.thumbnailUrl.length < 30;
        const thumbnailHTML = isIcon
            ? `<span class="material-symbols-outlined text-2xl text-secondary">${hl.thumbnailUrl}</span>`
            : (hl.thumbnailUrl ? `<img src="${hl.thumbnailUrl}" class="w-full h-full object-cover rounded-full">` : `<span class="material-symbols-outlined text-2xl text-secondary">mic</span>`);

        div.innerHTML = `
            <div class="w-16 h-16 story-ring">
                <div class="w-full h-full p-0.5">
                    <div class="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5 overflow-hidden">
                        ${thumbnailHTML}
                    </div>
                </div>
            </div>
            <span class="font-label-caps text-label-caps text-[10px] text-on-surface-variant group-hover:text-primary transition-colors truncate w-full text-center">${escapeHTML(hl.title)}</span>
        `;

        div.addEventListener("click", () => {
            openStoryViewer(index);
        });

        container.appendChild(div);
    });
}

function openStoryViewer(index) {
    activeHighlightIndex = index;
    activeStoryIndex = 0;
    isStoryPaused = false;
    
    const modal = document.getElementById("story-viewer-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    
    // Add history state so back button on mobile closes the story viewer
    if (window.history.state?.modal !== "story") {
        window.history.pushState({ modal: "story" }, "", "#story");
    }
    
    document.getElementById("story-viewer-close").onclick = () => closeStoryViewer(true);
    
    document.getElementById("story-prev-zone").onclick = (e) => {
        e.stopPropagation();
        navigateStory(-1);
    };
    document.getElementById("story-next-zone").onclick = (e) => {
        e.stopPropagation();
        navigateStory(1);
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            closeStoryViewer(true);
        }
    };

    const tapZone = document.getElementById("story-viewer-content");
    const pauseHandler = () => {
        isStoryPaused = true;
        storyPausedTime = Date.now();
        const videoEl = tapZone.querySelector("video");
        if (videoEl) videoEl.pause();
    };
    const resumeHandler = () => {
        if (!isStoryPaused) return;
        isStoryPaused = false;
        const offset = Date.now() - storyPausedTime;
        storyStartTime += offset; 
        const videoEl = tapZone.querySelector("video");
        if (videoEl) videoEl.play();
        runStoryProgressLoop();
    };

    tapZone.onmousedown = pauseHandler;
    tapZone.onmouseup = resumeHandler;
    tapZone.onmouseleave = resumeHandler;
    tapZone.ontouchstart = pauseHandler;
    tapZone.ontouchend = resumeHandler;

    loadActiveStory();
}

function loadActiveStory() {
    const modal = document.getElementById("story-viewer-modal");
    if (!modal || modal.classList.contains("hidden")) {
        return;
    }

    if (activeHighlightIndex < 0 || activeHighlightIndex >= storyHighlightsList.length) {
        closeStoryViewer(true);
        return;
    }

    const hl = storyHighlightsList[activeHighlightIndex];
    if (!hl.stories || hl.stories.length === 0) {
        closeStoryViewer(true);
        return;
    }

    if (activeStoryIndex < 0 || activeStoryIndex >= hl.stories.length) {
        closeStoryViewer(true);
        return;
    }

    const story = hl.stories[activeStoryIndex];
    const contentBox = document.getElementById("story-viewer-content");
    const timeLabel = document.getElementById("story-viewer-time");
    
    if (!contentBox) return;
    contentBox.innerHTML = "";

    if (story.timestamp) {
        const date = new Date(story.timestamp);
        timeLabel.innerText = `${hl.title.toUpperCase()} • ${date.toLocaleDateString([], {month: 'short', day: 'numeric'})}`;
    } else {
        timeLabel.innerText = hl.title.toUpperCase();
    }

    // Set up progress bars for the stories inside this highlight
    const progressContainer = document.getElementById("story-progress-container");
    progressContainer.innerHTML = "";
    hl.stories.forEach((_, idx) => {
        const bar = document.createElement("div");
        bar.className = "story-progress-bar";
        
        const fill = document.createElement("div");
        fill.className = "story-progress-fill";
        if (idx < activeStoryIndex) {
            fill.classList.add("completed");
        }
        bar.appendChild(fill);
        progressContainer.appendChild(bar);
    });

    if (story.mediaType === "video") {
        const video = document.createElement("video");
        video.src = story.mediaUrl;
        video.className = "story-viewer-media";
        video.playsInline = true;
        video.autoplay = true;
        video.muted = false;

        contentBox.appendChild(video);

        video.onended = () => {
            navigateStory(1);
        };

        video.onloadedmetadata = () => {
            // Only proceed if modal is still open
            if (modal.classList.contains("hidden")) {
                video.pause();
                video.onended = null;
                video.onloadedmetadata = null;
                video.onerror = null;
                video.src = "";
                return;
            }
            currentStoryDuration = video.duration * 1000;
            startStoryTimer();
        };

        video.onerror = () => {
            if (modal.classList.contains("hidden")) return;
            currentStoryDuration = 5000;
            startStoryTimer();
        };
    } else {
        const img = document.createElement("img");
        img.src = story.mediaUrl;
        img.className = "story-viewer-media";
        contentBox.appendChild(img);

        currentStoryDuration = 5000; 
        startStoryTimer();
    }
}

function startStoryTimer() {
    const modal = document.getElementById("story-viewer-modal");
    if (!modal || modal.classList.contains("hidden")) return;

    if (storyTimer) cancelAnimationFrame(storyTimer);
    storyStartTime = Date.now();
    runStoryProgressLoop();
}

function runStoryProgressLoop() {
    const modal = document.getElementById("story-viewer-modal");
    if (!modal || modal.classList.contains("hidden") || isStoryPaused) return;

    const elapsed = Date.now() - storyStartTime;
    storyProgress = Math.min((elapsed / currentStoryDuration) * 100, 100);

    const fills = document.querySelectorAll(".story-progress-fill");
    if (fills[activeStoryIndex]) {
        fills[activeStoryIndex].style.width = `${storyProgress}%`;
    }

    if (elapsed >= currentStoryDuration) {
        navigateStory(1);
    } else {
        storyTimer = requestAnimationFrame(runStoryProgressLoop);
    }
}

function navigateStory(direction) {
    const modal = document.getElementById("story-viewer-modal");
    if (!modal || modal.classList.contains("hidden")) {
        return;
    }

    if (storyTimer) cancelAnimationFrame(storyTimer);
    
    const hl = storyHighlightsList[activeHighlightIndex];
    if (!hl) {
        closeStoryViewer(true);
        return;
    }

    activeStoryIndex += direction;

    if (activeStoryIndex < 0) {
        // Move to previous Highlight Circle
        activeHighlightIndex--;
        if (activeHighlightIndex >= 0) {
            const prevHl = storyHighlightsList[activeHighlightIndex];
            if (prevHl.stories && prevHl.stories.length > 0) {
                activeStoryIndex = prevHl.stories.length - 1;
            } else {
                activeStoryIndex = 0;
            }
            loadActiveStory();
        } else {
            // Stay at first story of first highlight
            activeHighlightIndex = 0;
            activeStoryIndex = 0;
            loadActiveStory();
        }
    } else if (activeStoryIndex >= (hl.stories ? hl.stories.length : 0)) {
        // Move to next Highlight Circle
        activeHighlightIndex++;
        if (activeHighlightIndex < storyHighlightsList.length) {
            activeStoryIndex = 0;
            loadActiveStory();
        } else {
            // No more highlights
            closeStoryViewer(true);
        }
    } else {
        // Load next story in current highlight
        loadActiveStory();
    }
}

function closeStoryViewer(shouldGoBack = true) {
    if (storyTimer) cancelAnimationFrame(storyTimer);
    
    const contentBox = document.getElementById("story-viewer-content");
    if (contentBox) {
        const video = contentBox.querySelector("video");
        if (video) {
            video.pause();
            video.onended = null;
            video.onloadedmetadata = null;
            video.onerror = null;
            video.src = "";
            try {
                video.load();
            } catch (e) {
                console.warn("Error releasing video resources on close:", e);
            }
        }
        contentBox.innerHTML = "";
    }

    const modal = document.getElementById("story-viewer-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    
    if (shouldGoBack && window.history.state?.modal === "story") {
        window.history.back();
    }
}


let cachedPosts = [];
let activeLightboxIndex = 0;
let lightboxPosts = [];
let zoomScale = 1;
let panX = 0;
let panY = 0;
let touchStartX = 0;
let touchStartY = 0;
let lastTouchTime = 0;
let isPanning = false;
let isPinching = false;
let startPinchDist = 0;
let startScale = 1;
let startPanX = 0;
let startPanY = 0;

function getThumbnailUrl(url, width = 500) {
    if (!url) return "";
    if (url.includes("googleusercontent.com")) {
        const base = url.split("=")[0];
        return `${base}=w${width}`;
    }
    return url;
}

// B. POSTS RENDERER
function renderPostsGrid(posts) {
    const container = document.getElementById("posts-container");
    if (!container || !posts) return;

    cachedPosts = posts;
    const visible = posts.filter(p => p.visible);
    container.innerHTML = "";

    if (visible.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-on-surface-variant italic text-xs py-10 bg-white/2 border border-white/5 rounded-2xl">
                No published posts.
            </div>
        `;
        return;
    }

    visible.forEach(post => {
        let layoutClasses = "col-span-1 row-span-1";
        if (post.ratio === "featured") layoutClasses = "col-span-1 md:col-span-2 row-span-1 md:row-span-2";
        if (post.ratio === "portrait") layoutClasses = "col-span-1 row-span-1 md:row-span-2";
        if (post.ratio === "landscape") layoutClasses = "col-span-1 md:col-span-2 row-span-1";

        const card = document.createElement("div");
        card.className = `image-card relative ${layoutClasses} rounded-xl overflow-hidden cursor-pointer bg-surface-container group`;

        let mediaHTML = "";
        if (post.mediaType === "video") {
            mediaHTML = `
                <video src="${post.mediaUrl}" class="w-full h-full object-cover opacity-80" muted playsinline loop autoplay></video>
                <div class="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/15">
                    <span class="material-symbols-outlined text-white text-base">play_circle</span>
                </div>
            `;
        } else {
            const displayUrl = isMobileOrTablet() ? getThumbnailUrl(post.mediaUrl, 500) : post.mediaUrl;
            mediaHTML = `<img src="${displayUrl}" loading="lazy" class="w-full h-full object-cover opacity-80" alt="${escapeHTML(post.title)}">`;
        }

        card.innerHTML = `
            <div class="w-full h-full flex items-center justify-center relative">
                ${mediaHTML}
                <div class="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/30 to-transparent z-10"></div>
                <h3 class="absolute bottom-6 left-6 text-white text-2xl font-bold tracking-tight z-20">${escapeHTML(post.title)}</h3>
            </div>
            <div class="image-overlay absolute inset-0 glass-panel flex flex-col justify-end p-6 z-20">
                <p class="font-headline-md text-headline-md text-primary mb-1">${escapeHTML(post.title)}</p>
                <p class="font-body-sm text-body-sm text-on-surface-variant">${escapeHTML(post.description)}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            if (isMobileOrTablet()) {
                const index = visible.indexOf(post);
                openPostLightbox(index, visible);
            }
        });

        container.appendChild(card);
    });
}

function openPostLightbox(index, posts) {
    activeLightboxIndex = index;
    lightboxPosts = posts;
    zoomScale = 1;
    panX = 0;
    panY = 0;

    const modal = document.getElementById("post-lightbox-modal");
    if (!modal) return;

    modal.classList.remove("hidden");
    // Trigger transition opacity
    setTimeout(() => {
        modal.classList.add("opacity-100");
    }, 10);

    // Push history state so back button closes it
    if (window.history.state?.modal !== "lightbox") {
        window.history.pushState({ modal: "lightbox" }, "", "#lightbox");
    }

    loadLightboxPost();
}

function loadLightboxPost() {
    const post = lightboxPosts[activeLightboxIndex];
    if (!post) return;

    const img = document.getElementById("lightbox-img");
    const title = document.getElementById("lightbox-title");
    const desc = document.getElementById("lightbox-desc");

    // Reset zoom and panning
    zoomScale = 1;
    panX = 0;
    panY = 0;
    updateLightboxTransform();

    if (img) {
        // Load original (highest resolution) image
        img.src = post.mediaUrl;
    }
    if (title) title.innerText = post.title || "";
    if (desc) desc.innerText = post.description || "";
}

function updateLightboxTransform() {
    const img = document.getElementById("lightbox-img");
    if (img) {
        img.style.setProperty("--zoom-scale", zoomScale.toString());
        img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    }
}

function closePostLightbox(shouldGoBack = true) {
    const modal = document.getElementById("post-lightbox-modal");
    if (!modal) return;

    modal.classList.remove("opacity-100");
    setTimeout(() => {
        modal.classList.add("hidden");
        const img = document.getElementById("lightbox-img");
        if (img) img.src = ""; // unload image
    }, 300);

    if (shouldGoBack && window.history.state?.modal === "lightbox") {
        window.history.back();
    }
}

function navigateLightbox(direction) {
    activeLightboxIndex += direction;
    if (activeLightboxIndex < 0) {
        activeLightboxIndex = lightboxPosts.length - 1;
    } else if (activeLightboxIndex >= lightboxPosts.length) {
        activeLightboxIndex = 0;
    }
    loadLightboxPost();
}

let activePointers = [];

function initLightboxPointerEvents() {
    const container = document.getElementById("lightbox-image-container");
    if (!container) return;

    container.addEventListener("pointerdown", (e) => {
        // Add pointer to active list
        activePointers.push(e);

        if (activePointers.length === 1) {
            // Start panning or swipe
            isPanning = zoomScale > 1;
            touchStartX = e.clientX;
            touchStartY = e.clientY;
            startPanX = panX;
            startPanY = panY;

            // Double tap / double click detection
            const now = Date.now();
            if (now - lastTouchTime < 300) {
                // Double tap zoom
                if (zoomScale > 1) {
                    zoomScale = 1;
                    panX = 0;
                    panY = 0;
                } else {
                    zoomScale = 2.5;
                    panX = 0;
                    panY = 0;
                }
                updateLightboxTransform();
                lastTouchTime = 0;
            } else {
                lastTouchTime = now;
            }
        } else if (activePointers.length === 2) {
            // Pinch zoom
            isPinching = true;
            isPanning = false;
            startScale = zoomScale;
            startPinchDist = getPointerDist();
        }
        
        try {
            container.setPointerCapture(e.pointerId);
        } catch (err) {
            // ignore pointer capture errors if unsupported or already captured
        }
        e.preventDefault();
    }, { passive: false });

    container.addEventListener("pointermove", (e) => {
        // Update pointer in active list
        const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
        if (index !== -1) {
            activePointers[index] = e;
        }

        if (isPinching && activePointers.length === 2) {
            e.preventDefault();
            const currentDist = getPointerDist();
            if (startPinchDist > 0) {
                const scaleFactor = currentDist / startPinchDist;
                zoomScale = Math.max(1, Math.min(4, startScale * scaleFactor));
                if (zoomScale === 1) {
                    panX = 0;
                    panY = 0;
                }
                updateLightboxTransform();
            }
        } else if (isPanning && activePointers.length === 1) {
            e.preventDefault();
            const deltaX = e.clientX - touchStartX;
            const deltaY = e.clientY - touchStartY;
            panX = startPanX + deltaX;
            panY = startPanY + deltaY;

            const maxPanX = (zoomScale - 1) * window.innerWidth / 2;
            const maxPanY = (zoomScale - 1) * window.innerHeight / 2;
            panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
            panY = Math.max(-maxPanY, Math.min(maxPanY, panY));

            updateLightboxTransform();
        }
    }, { passive: false });

    const handlePointerUp = (e) => {
        if (isPinching && activePointers.length < 2) {
            isPinching = false;
        } else if (zoomScale === 1 && activePointers.length === 1) {
            // Swipe navigation detection (only if scale is 1)
            const deltaX = e.clientX - touchStartX;
            const deltaY = e.clientY - touchStartY;

            if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 100) {
                if (deltaX < 0) {
                    navigateLightbox(1);
                } else {
                    navigateLightbox(-1);
                }
            }
        }

        // Remove pointer from active list
        activePointers = activePointers.filter(p => p.pointerId !== e.pointerId);
        if (activePointers.length === 0) {
            isPanning = false;
        }
        try {
            container.releasePointerCapture(e.pointerId);
        } catch (err) {}
    };

    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerUp);

    function getPointerDist() {
        if (activePointers.length < 2) return 0;
        const dx = activePointers[0].clientX - activePointers[1].clientX;
        const dy = activePointers[0].clientY - activePointers[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

function initLightbox() {
    initLightboxPointerEvents();

    const closeBtn = document.getElementById("lightbox-close");
    const prevBtn = document.getElementById("lightbox-prev");
    const nextBtn = document.getElementById("lightbox-next");

    if (closeBtn) closeBtn.onclick = () => closePostLightbox(true);
    if (prevBtn) prevBtn.onclick = () => navigateLightbox(-1);
    if (nextBtn) nextBtn.onclick = () => navigateLightbox(1);

    const modal = document.getElementById("post-lightbox-modal");
    if (modal) {
        modal.onclick = (e) => {
            // Close if clicking outside the image container and not on action buttons
            if (e.target === modal || e.target === document.getElementById("lightbox-image-container")) {
                closePostLightbox(true);
            }
        };
    }
}


// C. REELS RENDERER
function renderReelsGrid(reels) {
    const container = document.getElementById("reels-container");
    if (!container || !reels) return;

    const visible = reels.filter(r => r.visible);
    container.innerHTML = "";

    if (visible.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-on-surface-variant italic text-xs py-10 bg-white/2 border border-white/5 rounded-2xl">
                No published reels.
            </div>
        `;
        return;
    }

    visible.forEach(reel => {
        const card = document.createElement("div");
        card.className = "image-card relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer bg-surface-container group";

        const thumbUrl = reel.thumbnailUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO";

        card.innerHTML = `
            <div class="absolute inset-0 bg-black/40 flex flex-col justify-between p-4 z-10">
                <div class="flex justify-between items-start">
                    <span class="material-symbols-outlined text-white text-xl">play_circle</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-sm">visibility</span>
                    <span class="text-primary font-label-caps text-label-caps text-xs">${reel.views || '0K'}</span>
                </div>
            </div>
            <div class="w-full h-full bg-[#18181a] flex items-center justify-center">
                <img src="${thumbUrl}" class="w-full h-full object-cover opacity-60" alt="${escapeHTML(reel.title)}">
                <span class="material-symbols-outlined text-5xl text-white/5 absolute">play_arrow</span>
            </div>
        `;

        card.addEventListener("click", () => {
            if (reel.mediaUrl) {
                window.open(reel.mediaUrl, "_blank");
            }
        });

        container.appendChild(card);
    });
}

// D. YOUTUBE VIDEOS RENDERER & MODAL CONTROLLER
function renderVideosGrid(videos) {
    const container = document.getElementById("videos-container");
    if (!container || !videos) return;

    const visible = videos.filter(v => v.visible);
    container.innerHTML = "";

    if (visible.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-on-surface-variant italic text-xs py-10 bg-white/2 border border-white/5 rounded-2xl">
                No published videos.
            </div>
        `;
        return;
    }

    visible.forEach(video => {
        const card = document.createElement("div");
        card.className = "image-card relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-surface-container group border border-white/5 hover:border-red-500/30 transition-all duration-500 shadow-lg hover:shadow-red-500/15";

        const ytId = getYouTubeId(video.url);
        const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : "";

        card.innerHTML = `
            <div class="w-full h-full relative overflow-hidden bg-black">
                <div class="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
                <img src="${thumbUrl}" class="w-full h-full object-cover opacity-80 group-hover:scale-102 transition-transform duration-700 pointer-events-none" 
                     onload="if (this.naturalWidth <= 120) this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg';"
                     onerror="this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg'" alt="${escapeHTML(video.title)}">
                <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10"></div>
                <div class="absolute inset-0 flex items-center justify-center z-20">
                    <div class="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-[#d60129] group-hover:border-[#d60129] group-hover:scale-110 shadow-lg transition-all duration-300">
                        <span class="material-symbols-outlined text-white text-3xl transition-transform group-hover:scale-105" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
                    </div>
                </div>
            </div>
            <div class="absolute bottom-0 left-0 w-full p-4 z-20 pointer-events-none bg-gradient-to-t from-black/90 to-transparent">
                <h3 class="text-white font-headline-md text-sm md:text-base font-semibold truncate leading-tight w-full drop-shadow-md pr-2">${escapeHTML(video.title)}</h3>
                <span class="text-[9px] font-label-caps text-on-surface-variant group-hover:text-red-400 transition-colors flex items-center gap-1.5 mt-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#d60129]"></span> WATCH ON PLAYER
                </span>
            </div>
        `;

        card.addEventListener("click", () => {
            openVideoModal(video);
        });

        container.appendChild(card);
    });
}

function openVideoModal(video) {
    const modal = document.getElementById("video-player-modal");
    const content = document.getElementById("video-modal-content");
    const iframe = document.getElementById("video-modal-iframe");
    const title = document.getElementById("video-modal-title");

    if (!modal || !content || !iframe || !title) return;

    const ytId = getYouTubeId(video.url);
    if (!ytId) return;

    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1`;
    title.innerText = video.title;

    modal.classList.remove("hidden");
    setTimeout(() => {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
    }, 10);

    document.body.style.overflow = "hidden";

    const closeBtn = document.getElementById("video-modal-close");
    const closeHandler = () => {
        content.classList.remove("scale-100", "opacity-100");
        content.classList.add("scale-95", "opacity-0");
        setTimeout(() => {
            modal.classList.add("hidden");
            iframe.src = "";
        }, 300);
        document.body.style.overflow = "";
    };

    closeBtn.onclick = closeHandler;
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeHandler();
        }
    };

    document.onkeydown = (e) => {
        if (e.key === "Escape") {
            closeHandler();
            document.onkeydown = null;
        }
    };
}

/* ────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────── */
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global event listeners for modals (Esc key to close and back button on mobile)
window.addEventListener("popstate", (event) => {
    const modal = document.getElementById("story-viewer-modal");
    if (modal && !modal.classList.contains("hidden")) {
        closeStoryViewer(false);
    }

    const lightboxModal = document.getElementById("post-lightbox-modal");
    if (lightboxModal && !lightboxModal.classList.contains("hidden")) {
        closePostLightbox(false);
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const modal = document.getElementById("story-viewer-modal");
        if (modal && !modal.classList.contains("hidden")) {
            closeStoryViewer(true);
        }

        const lightboxModal = document.getElementById("post-lightbox-modal");
        if (lightboxModal && !lightboxModal.classList.contains("hidden")) {
            closePostLightbox(true);
        }
    }
});
