import {
    addMessage,
    deleteMessage,
    listenToMessages,
    getSettings,
    saveSettings,
    getProjects,
    saveProject,
    deleteProject,
    getHighlights,
    saveHighlight,
    deleteHighlight,
    getPosts,
    savePost,
    deletePost,
    getReels,
    saveReel,
    deleteReel,
    getVideos,
    saveVideo,
    deleteVideo,
    listenToVideos,
    getYouTubeId,
    isConfigured,
    isForceMock,
    getActiveDatabaseProvider,
    toggleForceMock
} from "./firebase-config.js";

function initAdmin() {
    // 1. Initialize Background WebGL Shader
    initBackgroundShader();

    // 2. Setup Login Gate / Auth Session
    initAuthGate();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
} else {
    initAdmin();
}

/* ────────────────────────────────────────────────────────
   1. AUTHENTICATION & LOGIN GATE CONTROLLER
   ──────────────────────────────────────────────────────── */
const SECURE_PASSCODE = "purusharth2026";

function initAuthGate() {
    const loginGate = document.getElementById("login-gate");
    const dashboardShell = document.getElementById("dashboard-shell");
    const loginForm = document.getElementById("login-form");
    const passcodeInput = document.getElementById("passcode-input");
    const loginError = document.getElementById("login-error");
    const logoutBtn = document.getElementById("logout-btn");
    const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

    // Check existing session
    if (sessionStorage.getItem("pt_auth") === "true") {
        unlockDashboard();
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const entered = passcodeInput.value.trim();

        if (entered === SECURE_PASSCODE) {
            sessionStorage.setItem("pt_auth", "true");
            loginError.classList.add("hidden");
            unlockDashboard();
        } else {
            loginError.classList.remove("hidden");
            passcodeInput.value = "";
            passcodeInput.focus();
            
            // Shake effect
            loginGate.firstElementChild.classList.add("animate-bounce");
            setTimeout(() => {
                loginGate.firstElementChild.classList.remove("animate-bounce");
            }, 500);
        }
    });

    const logoutAction = () => {
        sessionStorage.removeItem("pt_auth");
        window.location.reload();
    };

    logoutBtn.addEventListener("click", logoutAction);
    mobileLogoutBtn.addEventListener("click", logoutAction);
}

let statsData = {
    stories: 0,
    reels: 0,
    projects: 0,
    messages: 0
};

function unlockDashboard() {
    document.getElementById("login-gate").classList.add("hidden");
    document.getElementById("dashboard-shell").classList.remove("hidden");
    
    // Initial data load and hooks registration
    initTabNavigation();
    initOverviewTab();
    initStoriesTab();
    initProjectsTab();
    initSettingsTab();
}

/* ────────────────────────────────────────────────────────
   2. TAB SWITCHING CONTROLLER
   ──────────────────────────────────────────────────────── */
let currentTab = "overview";

function initTabNavigation() {
    const sidebarTabs = document.querySelectorAll("#sidebar-tabs .tab-trigger");
    const mobileTabs = document.querySelectorAll("#mobile-tabs .tab-trigger");

    const switchTab = (tabId) => {
        currentTab = tabId;

        // Hide all view sections
        document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
        // Show target view section
        document.getElementById(`view-${tabId}`).classList.remove("hidden");

        // Update Desktop sidebar styling
        sidebarTabs.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.className = "tab-trigger flex items-center gap-4 px-4 py-3 rounded-lg bg-primary text-on-primary font-body-sm transition-all duration-300 w-full text-left";
                btn.querySelector("span").style.fontVariationSettings = "'FILL' 1";
            } else {
                btn.className = "tab-trigger flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-white/5 font-body-sm transition-all duration-300 w-full text-left";
                btn.querySelector("span").style.fontVariationSettings = "'FILL' 0";
            }
        });

        // Update Mobile bottombar styling
        mobileTabs.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.className = "tab-trigger flex flex-col items-center justify-center text-primary transition-transform scale-95";
                btn.querySelector("span").style.fontVariationSettings = "'FILL' 1";
            } else {
                btn.className = "tab-trigger flex flex-col items-center justify-center text-on-surface-variant transition-colors scale-95";
                btn.querySelector("span").style.fontVariationSettings = "'FILL' 0";
            }
        });

        // Specific Tab hooks on load
        if (tabId === "overview") reloadStats();
        if (tabId === "projects") reloadProjectsList();
        if (tabId === "stories") reloadStoriesGrid();
    };

    // Bind triggers
    sidebarTabs.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
    mobileTabs.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

    // Expose switch function globally for Quick Actions
    window.triggerTabSwitch = switchTab;
}


/* ────────────────────────────────────────────────────────
   3. OVERVIEW / DASHBOARD CONTROLLER (Real-time Guestbook)
   ──────────────────────────────────────────────────────── */
function initOverviewTab() {
    // Listen to real-time Guestbook updates
    listenToMessages((messages) => {
        statsData.messages = messages.length;
        document.getElementById("stat-messages-count").innerText = messages.length;
        renderGuestbookList(messages);
    });

    reloadStats();
}

async function reloadStats() {
    try {
        const projects = await getProjects();
        statsData.projects = projects.length;
        document.getElementById("stat-projects-count").innerText = projects.length;

        const highlights = await getHighlights();
        const posts = await getPosts();
        const reels = await getReels();
        const videos = await getVideos();
        
        statsData.highlights = highlights.length;
        statsData.posts = posts.length;
        statsData.reels = reels.length;
        statsData.videos = videos.length;

        document.getElementById("stat-stories-count").innerText = highlights.length;
        document.getElementById("stat-reels-count").innerText = reels.length;
        const statVideosCount = document.getElementById("stat-videos-count");
        if (statVideosCount) statVideosCount.innerText = videos.length;
    } catch (e) {
        console.error("Failed to load dashboard statistics:", e);
    }
}

function renderGuestbookList(messages) {
    const listContainer = document.getElementById("overview-messages-list");
    listContainer.innerHTML = "";

    if (messages.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="3" class="p-6 text-center text-on-surface-variant italic opacity-60">
                    No signatures recorded on the wall.
                </td>
            </tr>
        `;
        return;
    }

    messages.forEach((msg, idx) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/2 transition-colors";

        const date = new Date(msg.timestamp);
        const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        tr.innerHTML = `
            <td class="p-4 align-top w-1/4">
                <div class="font-semibold text-primary flex items-center gap-1.5">
                    <span class="text-sm">${msg.emoji}</span>
                    <span class="truncate max-w-[120px]" title="${escapeHTML(msg.name)}">${escapeHTML(msg.name)}</span>
                </div>
                <div class="text-[9px] text-on-surface-variant font-label-caps mt-1 uppercase">${timeStr}</div>
            </td>
            <td class="p-4 align-top text-on-surface-variant leading-relaxed break-words whitespace-pre-wrap max-w-sm">
                ${escapeHTML(msg.message)}
            </td>
            <td class="p-4 align-top text-right w-1/6">
                <button data-id="${msg.id}" class="delete-msg-btn bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg border border-red-500/10 transition-colors" title="Delete note">
                    <span class="material-symbols-outlined text-sm block">delete</span>
                </button>
            </td>
        `;

        // Bind delete click
        tr.querySelector(".delete-msg-btn").addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const msgId = btn.dataset.id;
            
            if (confirm("Are you sure you want to delete this guestbook message permanently?")) {
                btn.disabled = true;
                btn.classList.add("opacity-50");
                try {
                    await deleteMessage(msgId);
                } catch (err) {
                    console.error("Failed to delete message:", err);
                    alert("Failed to delete message.");
                    btn.disabled = false;
                    btn.classList.remove("opacity-50");
                }
            }
        });

        listContainer.appendChild(tr);
    });
}


/* ────────────────────────────────────────────────────────
   4. CONTENT & MEDIA HUB CONTROLLER (HIGHLIGHTS, POSTS, REELS)
   ──────────────────────────────────────────────────────── */

function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        // Compress large images client-side to keep base64 sizes small and bypass limits
        if (file.type.startsWith('image/') && file.size > 1.0 * 1024 * 1024) {
            compressImage(file)
                .then(resolve)
                .catch(() => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            return;
        }

        // Non-image files or small images warning
        if (file.size > 1.5 * 1024 * 1024) {
            alert(`Warning: The file "${file.name}" is ${(file.size / 1024 / 1024).toFixed(2)}MB, which exceeds the recommended 1.5MB limit for Base64 storage. Loading might be slow.`);
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function initStoriesTab() {
    // Expose switchSubTab to window
    window.switchSubTab = function(subtab) {
        document.querySelectorAll(".subtab-btn").forEach(btn => {
            btn.classList.remove("text-primary", "border-primary", "border-b-2");
            btn.classList.add("text-on-surface-variant");
        });
        const activeBtn = document.getElementById(`subtab-${subtab}`);
        if (activeBtn) {
            activeBtn.classList.remove("text-on-surface-variant");
            activeBtn.classList.add("text-primary", "border-primary", "border-b-2");
        }

        document.querySelectorAll(".subcontent-pane").forEach(pane => {
            pane.classList.add("hidden");
        });
        const activePane = document.getElementById(`subcontent-${subtab}`);
        if (activePane) activePane.classList.remove("hidden");
    };

    // File Input Name Preview Setup
    const setupFilePreview = (fileInputId, previewId) => {
        const input = document.getElementById(fileInputId);
        const preview = document.getElementById(previewId);
        if (input && preview) {
            input.addEventListener("change", (e) => {
                const file = e.target.files[0];
                preview.innerText = file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : "No file chosen";
            });
        }
    };
    let currentEditingStories = [];

    setupFilePreview("highlight-input-thumb-file", "highlight-thumb-file-preview");
    setupFilePreview("highlight-story-file", "highlight-story-file-preview");
    setupFilePreview("post-input-media-file", "post-media-file-preview");
    setupFilePreview("reel-input-media-file", "reel-media-file-preview");
    setupFilePreview("reel-input-thumb-file", "reel-thumb-file-preview");
    setupFilePreview("project-input-image-file", "project-image-file-preview");
    setupFilePreview("setting-input-avatar-file", "setting-avatar-file-preview");

    // Form 1: Highlight Submit Handling
    const highlightForm = document.getElementById("highlight-form");
    if (highlightForm) {
        // Story list re-renderer
        function renderFormStoriesList() {
            const listContainer = document.getElementById("highlight-stories-list");
            if (!listContainer) return;
            listContainer.innerHTML = "";

            if (currentEditingStories.length === 0) {
                listContainer.innerHTML = `<p class="text-on-surface-variant text-[11px] italic py-2">No stories added to this highlight yet.</p>`;
                return;
            }

            currentEditingStories.forEach((story, idx) => {
                const item = document.createElement("div");
                item.className = "flex items-center justify-between gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-lg";
                
                let previewEl = "";
                if (story.mediaType === "video") {
                    previewEl = `<video class="w-10 h-16 object-cover rounded border border-white/10" src="${story.mediaUrl}" muted></video>`;
                } else {
                    previewEl = `<img class="w-10 h-16 object-cover rounded border border-white/10" src="${story.mediaUrl}">`;
                }

                item.innerHTML = `
                    <div class="flex items-center gap-2.5 truncate flex-1">
                        ${previewEl}
                        <div class="flex flex-col text-[10px] truncate">
                            <span class="text-primary font-semibold truncate">${story.mediaType.toUpperCase()} Story</span>
                            <span class="text-on-surface-variant text-[8px] truncate">${new Date(story.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button type="button" class="move-up-story-btn text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1" data-index="${idx}" title="Move Up">
                            <span class="material-symbols-outlined text-[16px]">arrow_upward</span>
                        </button>
                        <button type="button" class="move-down-story-btn text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1" data-index="${idx}" title="Move Down">
                            <span class="material-symbols-outlined text-[16px]">arrow_downward</span>
                        </button>
                        <button type="button" class="delete-form-story-btn text-red-400 hover:text-red-300 transition-colors flex items-center justify-center p-1" data-index="${idx}" title="Remove Story">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                    </div>
                `;

                // Bind events
                item.querySelector(".move-up-story-btn").onclick = (e) => {
                    e.preventDefault();
                    const index = parseInt(e.currentTarget.dataset.index);
                    if (index > 0) {
                        const temp = currentEditingStories[index];
                        currentEditingStories[index] = currentEditingStories[index - 1];
                        currentEditingStories[index - 1] = temp;
                        renderFormStoriesList();
                    }
                };

                item.querySelector(".move-down-story-btn").onclick = (e) => {
                    e.preventDefault();
                    const index = parseInt(e.currentTarget.dataset.index);
                    if (index < currentEditingStories.length - 1) {
                        const temp = currentEditingStories[index];
                        currentEditingStories[index] = currentEditingStories[index + 1];
                        currentEditingStories[index + 1] = temp;
                        renderFormStoriesList();
                    }
                };

                item.querySelector(".delete-form-story-btn").onclick = (e) => {
                    e.preventDefault();
                    const index = parseInt(e.currentTarget.dataset.index);
                    if (confirm("Remove this story from the highlight?")) {
                        currentEditingStories.splice(index, 1);
                        renderFormStoriesList();
                    }
                };

                listContainer.appendChild(item);
            });
        }

        // Add Story Button inside form
        const addStoryBtn = document.getElementById("highlight-story-add-btn");
        if (addStoryBtn) {
            addStoryBtn.addEventListener("click", async () => {
                const mediaType = document.getElementById("highlight-story-mediatype").value;
                const fileInput = document.getElementById("highlight-story-file");
                const urlInput = document.getElementById("highlight-story-url");
                const file = fileInput.files[0];
                const urlVal = urlInput ? urlInput.value.trim() : "";

                if (!file && !urlVal) {
                    alert("Please select a local media file OR enter a Media URL to add as a story.");
                    return;
                }

                addStoryBtn.disabled = true;
                addStoryBtn.classList.add("opacity-50");
                try {
                    let mediaUrl = urlVal;
                    if (file) {
                        mediaUrl = await readFileAsBase64(file);
                    }

                    const newStory = {
                        id: "story_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                        mediaUrl: mediaUrl,
                        mediaType: mediaType,
                        timestamp: new Date().toISOString()
                    };
                    currentEditingStories.push(newStory);
                    renderFormStoriesList();
                    
                    // Clear inputs
                    fileInput.value = "";
                    if (urlInput) urlInput.value = "";
                    document.getElementById("highlight-story-file-preview").innerText = "No file chosen";
                } catch (err) {
                    console.error("Failed to read story file:", err);
                    alert("Failed to read media file.");
                } finally {
                    addStoryBtn.disabled = false;
                    addStoryBtn.classList.remove("opacity-50");
                }
            });
        }

        // Cancel Edit Button
        const cancelHighlightBtn = document.getElementById("highlight-cancel-btn");
        if (cancelHighlightBtn) {
            cancelHighlightBtn.addEventListener("click", (e) => {
                e.preventDefault();
                resetHighlightForm();
            });
        }

        // Reset highlight form
        window.resetHighlightForm = function() {
            document.getElementById("highlight-id").value = "new";
            document.getElementById("highlight-input-title").value = "";
            document.getElementById("highlight-input-thumb-file").value = "";
            document.getElementById("highlight-thumb-file-preview").innerText = "No file chosen";
            document.getElementById("highlight-input-thumb-url").value = "";
            
            currentEditingStories = [];
            
            document.getElementById("highlight-stories-manager").classList.add("hidden");
            document.getElementById("highlight-edit-actions").classList.add("hidden");
            document.getElementById("highlight-save-btn").classList.remove("hidden");
            
            document.getElementById("highlight-form-title").innerText = "Create Highlight Circle";
            
            document.querySelectorAll(".story-card-hover").forEach(card => {
                card.classList.remove("border-primary/40", "ring-1", "ring-primary/40");
            });
        };

        // Edit highlight loader
        window.loadHighlightToForm = async function(id) {
            try {
                const highlights = await getHighlights();
                const hl = highlights.find(h => h.id === id);
                if (!hl) return;

                document.querySelectorAll(".story-card-hover").forEach(card => {
                    card.classList.remove("border-primary/40", "ring-1", "ring-primary/40");
                });

                const activeCard = Array.from(document.querySelectorAll(".toggle-highlight-btn"))
                    .find(btn => btn.dataset.id === id)
                    ?.closest(".story-card-hover");
                if (activeCard) {
                    activeCard.classList.add("border-primary/40", "ring-1", "ring-primary/40");
                }

                document.getElementById("highlight-id").value = hl.id;
                document.getElementById("highlight-input-title").value = hl.title;
                document.getElementById("highlight-input-thumb-file").value = "";
                document.getElementById("highlight-thumb-file-preview").innerText = hl.thumbnailUrl && hl.thumbnailUrl.startsWith("data:") ? "Existing cover image loaded" : "No file chosen";
                document.getElementById("highlight-input-thumb-url").value = hl.thumbnailUrl && !hl.thumbnailUrl.startsWith("data:") ? hl.thumbnailUrl : "";

                currentEditingStories = hl.stories ? [...hl.stories] : [];
                renderFormStoriesList();

                document.getElementById("highlight-stories-manager").classList.remove("hidden");
                document.getElementById("highlight-edit-actions").classList.remove("hidden");
                document.getElementById("highlight-save-btn").classList.add("hidden");

                document.getElementById("highlight-form-title").innerText = "Edit Highlight Circle";
                document.getElementById("highlight-input-title").focus();
            } catch (err) {
                console.error("Failed to load highlight for editing:", err);
            }
        };

        highlightForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("highlight-id").value;
            const submitBtn = highlightForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.classList.add("opacity-50");

            try {
                const title = document.getElementById("highlight-input-title").value.trim();
                const thumbUrlInput = document.getElementById("highlight-input-thumb-url").value.trim();
                const thumbFile = document.getElementById("highlight-input-thumb-file").files[0];

                let thumbnailUrl = thumbUrlInput;
                if (thumbFile) {
                    thumbnailUrl = await readFileAsBase64(thumbFile);
                }

                if (!thumbnailUrl && id !== "new") {
                    const highlights = await getHighlights();
                    const existing = highlights.find(h => h.id === id);
                    if (existing) {
                        thumbnailUrl = existing.thumbnailUrl;
                    }
                }

                if (!thumbnailUrl) {
                    thumbnailUrl = "mic";
                }

                const payload = {
                    id,
                    title,
                    thumbnailUrl,
                    stories: currentEditingStories,
                    visible: true
                };

                // Firestore document size limit is 1MB. Calculate size and warn if it exceeds 900KB.
                const payloadSize = JSON.stringify(payload).length;
                if (payloadSize > 900 * 1024) {
                    alert(`Error: The total size of this highlight (${(payloadSize / 1024 / 1024).toFixed(2)}MB) exceeds Firestore's 1.0MB document size limit due to large local video/photo files.\n\nTo fix this:\n1. Remove some large local video stories and add them using external "Media URL" links instead.\n2. Keep local video files extremely short/compressed.`);
                    return;
                }

                await saveHighlight(payload);

                resetHighlightForm();
                reloadStoriesGrid();
                alert(id === "new" ? "Highlight Circle created successfully! Click on it in the list to open it and add stories." : "Highlight saved successfully!");
            } catch (err) {
                console.error("Failed to save highlight:", err);
                alert("Error saving highlight.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove("opacity-50");
            }
        });
    }

    // Form 2: Post Submit Handling
    const postForm = document.getElementById("post-form");
    if (postForm) {
        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = postForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.classList.add("opacity-50");

            try {
                const title = document.getElementById("post-input-title").value.trim();
                const description = document.getElementById("post-input-desc").value.trim();
                const mediaType = document.getElementById("post-input-mediatype").value;
                const ratio = document.getElementById("post-input-ratio").value;

                const mediaFile = document.getElementById("post-input-media-file").files[0];
                const mediaUrlInput = document.getElementById("post-input-media-url");
                const mediaUrlVal = mediaUrlInput ? mediaUrlInput.value.trim() : "";

                let mediaUrl = mediaUrlVal;
                if (mediaFile) {
                    mediaUrl = await readFileAsBase64(mediaFile);
                }

                if (!mediaUrl) {
                    alert("Please select a local media file OR enter a Media URL.");
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("opacity-50");
                    return;
                }

                await savePost({
                    title,
                    description,
                    mediaUrl,
                    mediaType,
                    ratio,
                    visible: true
                });

                postForm.reset();
                if (mediaUrlInput) mediaUrlInput.value = "";
                document.getElementById("post-media-file-preview").innerText = "No file chosen";
                reloadStoriesGrid();
                alert("Post item added successfully!");
            } catch (err) {
                console.error("Failed to add post:", err);
                alert("Error adding post.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove("opacity-50");
            }
        });
    }

    // Form 3: Reel Submit Handling
    const reelForm = document.getElementById("reel-form");
    if (reelForm) {
        reelForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = reelForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.classList.add("opacity-50");

            try {
                const title = document.getElementById("reel-input-title").value.trim();
                const views = document.getElementById("reel-input-views").value.trim() || "0K";

                const mediaFile = document.getElementById("reel-input-media-file").files[0];
                const thumbFile = document.getElementById("reel-input-thumb-file").files[0];
                const mediaUrlInput = document.getElementById("reel-input-media-url");
                const thumbUrlInput = document.getElementById("reel-input-thumb-url");
                const mediaUrlVal = mediaUrlInput ? mediaUrlInput.value.trim() : "";
                const thumbUrlVal = thumbUrlInput ? thumbUrlInput.value.trim() : "";

                let mediaUrl = mediaUrlVal;
                if (mediaFile) {
                    mediaUrl = await readFileAsBase64(mediaFile);
                }

                let thumbnailUrl = thumbUrlVal;
                if (thumbFile) {
                    thumbnailUrl = await readFileAsBase64(thumbFile);
                }

                if (!mediaUrl) {
                    alert("Please select a local video file OR enter a Video URL.");
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("opacity-50");
                    return;
                }

                if (!thumbnailUrl) {
                    thumbnailUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO";
                }

                await saveReel({
                    title,
                    mediaUrl,
                    thumbnailUrl,
                    views,
                    visible: true
                });

                reelForm.reset();
                if (mediaUrlInput) mediaUrlInput.value = "";
                if (thumbUrlInput) thumbUrlInput.value = "";
                document.getElementById("reel-media-file-preview").innerText = "No file chosen";
                document.getElementById("reel-thumb-file-preview").innerText = "No file chosen";
                reloadStoriesGrid();
                alert("Reel clip added successfully!");
            } catch (err) {
                console.error("Failed to add reel:", err);
                alert("Error adding reel.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove("opacity-50");
            }
        });
    }

    // Form 4: Video Submit Handling
    const videoForm = document.getElementById("video-form");
    if (videoForm) {
        // Cancel Video Edit
        const cancelVideoBtn = document.getElementById("video-cancel-btn");
        if (cancelVideoBtn) {
            cancelVideoBtn.addEventListener("click", (e) => {
                e.preventDefault();
                resetVideoForm();
            });
        }

        videoForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("video-id").value;
            const submitBtn = videoForm.querySelector("button[type='submit']");
            submitBtn.disabled = true;
            submitBtn.classList.add("opacity-50");

            try {
                const title = document.getElementById("video-input-title").value.trim();
                const url = document.getElementById("video-input-url").value.trim();
                const visible = document.getElementById("video-input-visible").checked;

                // Validate YouTube ID parsing
                const ytId = getYouTubeId(url);
                if (!ytId) {
                    alert("Invalid YouTube URL! Please paste a valid YouTube watch link, share link, shorts link, or embed link.");
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("opacity-50");
                    return;
                }

                await saveVideo({
                    id,
                    title,
                    url,
                    visible
                });

                resetVideoForm();
                alert(id === "new" ? "YouTube video added successfully!" : "YouTube video saved successfully!");
            } catch (err) {
                console.error("Failed to save video:", err);
                alert("Error saving video.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove("opacity-50");
            }
        });
    }

    // Listen to real-time YouTube Video updates
    listenToVideos((videos) => {
        statsData.videos = videos.length;
        const countEl = document.getElementById("stat-videos-count");
        if (countEl) countEl.innerText = videos.length;
        
        const videosBadge = document.getElementById("videos-active-badge");
        if (videosBadge) {
            const activeCount = videos.filter(v => v.visible).length;
            videosBadge.innerText = `${activeCount} Active Videos`;
        }
        
        renderVideosGrid(videos);
    });

    window.resetVideoForm = function() {
        document.getElementById("video-id").value = "new";
        document.getElementById("video-input-title").value = "";
        document.getElementById("video-input-url").value = "";
        document.getElementById("video-input-visible").checked = true;

        document.getElementById("video-edit-actions").classList.add("hidden");
        const saveBtn = document.getElementById("video-save-btn");
        if (saveBtn) saveBtn.classList.remove("hidden");
        document.getElementById("video-form-title").innerText = "Add YouTube Video";

        document.querySelectorAll("#videos-grid-container .story-card-hover").forEach(card => {
            card.classList.remove("border-primary/40", "ring-1", "ring-primary/40");
        });
    };

    window.loadVideoToForm = function(video) {
        document.getElementById("video-id").value = video.id;
        document.getElementById("video-input-title").value = video.title;
        document.getElementById("video-input-url").value = video.url;
        document.getElementById("video-input-visible").checked = video.visible;

        document.getElementById("video-edit-actions").classList.remove("hidden");
        const saveBtn = document.getElementById("video-save-btn");
        if (saveBtn) saveBtn.classList.add("hidden");
        document.getElementById("video-form-title").innerText = "Edit YouTube Video";
        document.getElementById("video-input-title").focus();
    };

    function renderVideosGrid(videos) {
        const grid = document.getElementById("videos-grid-container");
        if (!grid) return;
        grid.innerHTML = "";

        if (videos.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-on-surface-variant italic text-xs py-4 text-center bg-white/2 border border-white/5 rounded-2xl">No YouTube videos added yet.</div>`;
            return;
        }

        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = `relative aspect-[9/16] rounded-xl overflow-hidden story-card-hover group border border-white/5 bg-surface-container cursor-pointer ${!video.visible ? 'opacity-40 grayscale' : ''}`;
            
            const ytId = getYouTubeId(video.url);
            const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO";

            card.innerHTML = `
                <img class="w-full h-full object-cover opacity-60 pointer-events-none" src="${thumbUrl}" 
                     onload="if (this.naturalWidth <= 120) this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg';"
                     onerror="this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg'" alt="${escapeHTML(video.title)}">
                <div class="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent flex justify-between p-3 z-10 pointer-events-none">
                    <div class="flex flex-col">
                        <span class="font-label-caps text-[9px] text-primary truncate max-w-[120px]" title="${escapeHTML(video.title)}">${escapeHTML(video.title)}</span>
                        <span class="font-label-caps text-[8px] text-on-surface-variant">YouTube Video</span>
                    </div>
                </div>
                <div class="absolute inset-0 bg-background/70 backdrop-blur-sm opacity-0 story-overlay transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
                    <div class="flex justify-between items-center w-full gap-2 mb-2">
                        <button data-id="${video.id}" data-visible="${video.visible}" class="toggle-video-btn flex-1 bg-white/5 hover:bg-white/10 text-primary py-1.5 rounded-lg border border-white/5 transition-colors flex justify-center" title="Toggle visibility">
                            <span class="material-symbols-outlined text-sm">${video.visible ? 'visibility' : 'visibility_off'}</span>
                        </button>
                        <button data-id="${video.id}" class="delete-video-btn flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg border border-red-500/10 transition-colors flex justify-center" title="Delete">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </div>
            `;

            // Click on card itself triggers Edit
            card.addEventListener("click", (e) => {
                if (e.target.closest(".toggle-video-btn") || e.target.closest(".delete-video-btn")) {
                    return;
                }
                document.querySelectorAll("#videos-grid-container .story-card-hover").forEach(c => {
                    c.classList.remove("border-primary/40", "ring-1", "ring-primary/40");
                });
                card.classList.add("border-primary/40", "ring-1", "ring-primary/40");
                loadVideoToForm(video);
            });

            // Toggle visibility click
            const toggleBtn = card.querySelector(".toggle-video-btn");
            toggleBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                toggleBtn.disabled = true;
                try {
                    await saveVideo({
                        id: video.id,
                        title: video.title,
                        url: video.url,
                        visible: !video.visible
                    });
                } catch (err) {
                    console.error("Failed to toggle video visibility:", err);
                    toggleBtn.disabled = false;
                }
            });

            // Delete video click
            const deleteBtn = card.querySelector(".delete-video-btn");
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this YouTube video permanently?")) {
                    deleteBtn.disabled = true;
                    try {
                        await deleteVideo(video.id);
                        resetVideoForm();
                    } catch (err) {
                        console.error("Failed to delete video:", err);
                        deleteBtn.disabled = false;
                    }
                }
            });

            grid.appendChild(card);
        });
    }
}

async function reloadStoriesGrid() {
    const highlightsGrid = document.getElementById("highlights-grid-container");
    const postsGrid = document.getElementById("posts-grid-container");
    const reelsGrid = document.getElementById("reels-grid-container");

    const highlightsBadge = document.getElementById("highlights-active-badge");
    const postsBadge = document.getElementById("posts-active-badge");
    const reelsBadge = document.getElementById("reels-active-badge");

    if (highlightsGrid) highlightsGrid.innerHTML = "";
    if (postsGrid) postsGrid.innerHTML = "";
    if (reelsGrid) reelsGrid.innerHTML = "";

    try {
        // A. Highlights Load
        const highlights = await getHighlights();
        if (highlightsBadge) {
            const visibleCount = highlights.filter(h => h.visible).length;
            highlightsBadge.innerText = `${visibleCount} Active Highlights`;
        }
        if (highlightsGrid) {
            if (highlights.length === 0) {
                highlightsGrid.innerHTML = `<div class="col-span-2 text-on-surface-variant italic text-xs py-4">No highlights added yet.</div>`;
            } else {
                highlights.forEach(hl => {
                    const card = document.createElement("div");
                    card.className = `relative aspect-[9/16] rounded-xl overflow-hidden story-card-hover group border border-white/5 bg-surface-container cursor-pointer ${!hl.visible ? 'opacity-40 grayscale' : ''}`;
                    
                    let thumbContent = "";
                    let backdrop = "";
                    const isCoverIcon = hl.thumbnailUrl && !hl.thumbnailUrl.startsWith("http") && !hl.thumbnailUrl.startsWith("data:") && hl.thumbnailUrl.length < 30;
                    
                    if (isCoverIcon) {
                        thumbContent = `<div class="w-full h-full flex items-center justify-center bg-white/5"><span class="material-symbols-outlined text-xs text-secondary">${hl.thumbnailUrl}</span></div>`;
                        backdrop = `
                            <div class="w-full h-full flex flex-col items-center justify-center bg-white/[0.02]">
                                <span class="material-symbols-outlined text-4xl text-secondary">${hl.thumbnailUrl}</span>
                            </div>
                        `;
                    } else if (hl.thumbnailUrl) {
                        thumbContent = `<img class="w-full h-full object-cover" src="${hl.thumbnailUrl}">`;
                        backdrop = `<img class="w-full h-full object-cover" src="${hl.thumbnailUrl}">`;
                    } else if (hl.stories && hl.stories.length > 0) {
                        const firstStory = hl.stories[0];
                        if (firstStory.mediaType === "video") {
                            backdrop = `<video class="w-full h-full object-cover" src="${firstStory.mediaUrl}" muted playsinline></video>`;
                        } else {
                            backdrop = `<img class="w-full h-full object-cover" src="${firstStory.mediaUrl}">`;
                        }
                        thumbContent = `<div class="w-full h-full flex items-center justify-center bg-white/5"><span class="material-symbols-outlined text-xs text-secondary">photo</span></div>`;
                    } else {
                        thumbContent = `<div class="w-full h-full flex items-center justify-center bg-white/5"><span class="material-symbols-outlined text-xs text-secondary">mic</span></div>`;
                        backdrop = `
                            <div class="w-full h-full flex flex-col items-center justify-center bg-white/[0.02]">
                                <span class="material-symbols-outlined text-4xl text-secondary">mic</span>
                            </div>
                        `;
                    }

                    const storyCount = hl.stories ? hl.stories.length : 0;

                    card.innerHTML = `
                        ${backdrop}
                        <div class="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent flex justify-between p-3 z-10">
                            <div class="flex flex-col">
                                <span class="font-label-caps text-[9px] text-primary truncate max-w-[100px]" title="${escapeHTML(hl.title)}">${escapeHTML(hl.title)}</span>
                                <span class="font-label-caps text-[8px] text-on-surface-variant">${storyCount} Stories</span>
                            </div>
                        </div>
                        <div class="absolute inset-0 bg-background/70 backdrop-blur-sm opacity-0 story-overlay transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
                            <div class="flex justify-between items-center w-full gap-2 mb-2">
                                <button data-id="${hl.id}" data-visible="${hl.visible}" class="toggle-highlight-btn flex-1 bg-white/5 hover:bg-white/10 text-primary py-1.5 rounded-lg border border-white/5 transition-colors flex justify-center" title="Toggle visibility">
                                    <span class="material-symbols-outlined text-sm">${hl.visible ? 'visibility' : 'visibility_off'}</span>
                                </button>
                                <button data-id="${hl.id}" class="delete-highlight-btn flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg border border-red-500/10 transition-colors flex justify-center" title="Delete">
                                    <span class="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                            <div class="text-center flex items-center justify-center gap-1 bg-white/5 py-1 rounded">
                                <div class="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-white/10">${thumbContent}</div>
                                <span class="font-label-caps text-[8px] text-on-surface-variant truncate">Cover</span>
                            </div>
                        </div>
                    `;
                    bindHighlightActions(card);
                    highlightsGrid.appendChild(card);
                });
            }
        }

        // B. Posts Load
        const posts = await getPosts();
        if (postsBadge) {
            const visibleCount = posts.filter(p => p.visible).length;
            postsBadge.innerText = `${visibleCount} Active Posts`;
        }
        if (postsGrid) {
            if (posts.length === 0) {
                postsGrid.innerHTML = `<div class="col-span-2 text-on-surface-variant italic text-xs py-4">No posts added yet.</div>`;
            } else {
                posts.forEach(post => {
                    const card = document.createElement("div");
                    card.className = `relative aspect-[9/16] rounded-xl overflow-hidden story-card-hover group border border-white/5 bg-surface-container ${!post.visible ? 'opacity-40 grayscale' : ''}`;
                    card.innerHTML = `
                        ${post.mediaType === 'video' ? `<video class="w-full h-full object-cover" src="${post.mediaUrl}" muted playsinline></video>` : `<img class="w-full h-full object-cover" src="${post.mediaUrl}">`}
                        <div class="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent flex justify-between p-3">
                            <div class="flex flex-col">
                                <span class="font-label-caps text-[9px] text-primary truncate max-w-[80px]" title="${escapeHTML(post.title)}">${escapeHTML(post.title)}</span>
                                <span class="font-label-caps text-[8px] text-on-surface-variant">${post.ratio}</span>
                            </div>
                        </div>
                        <div class="absolute inset-0 bg-background/70 backdrop-blur-sm opacity-0 story-overlay transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
                            <div class="flex justify-between items-center w-full gap-2 mb-2">
                                <button data-id="${post.id}" data-visible="${post.visible}" class="toggle-post-btn flex-1 bg-white/5 hover:bg-white/10 text-primary py-1.5 rounded-lg border border-white/5 transition-colors flex justify-center" title="Toggle visibility">
                                    <span class="material-symbols-outlined text-sm">${post.visible ? 'visibility' : 'visibility_off'}</span>
                                </button>
                                <button data-id="${post.id}" class="delete-post-btn flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg border border-red-500/10 transition-colors flex justify-center" title="Delete">
                                    <span class="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                            <div class="text-center truncate">
                                <span class="font-label-caps text-[8px] text-on-surface-variant">${escapeHTML(post.description || "")}</span>
                            </div>
                        </div>
                    `;
                    bindPostActions(card);
                    postsGrid.appendChild(card);
                });
            }
        }

        // C. Reels Load
        const reels = await getReels();
        if (reelsBadge) {
            const visibleCount = reels.filter(r => r.visible).length;
            reelsBadge.innerText = `${visibleCount} Active Reels`;
        }
        if (reelsGrid) {
            if (reels.length === 0) {
                reelsGrid.innerHTML = `<div class="col-span-2 text-on-surface-variant italic text-xs py-4">No reels added yet.</div>`;
            } else {
                reels.forEach(reel => {
                    const card = document.createElement("div");
                    card.className = `relative aspect-[9/16] rounded-xl overflow-hidden story-card-hover group border border-white/5 bg-surface-container ${!reel.visible ? 'opacity-40 grayscale' : ''}`;
                    card.innerHTML = `
                        <img class="w-full h-full object-cover" src="${reel.thumbnailUrl}">
                        <div class="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/80 to-transparent flex justify-between p-3">
                            <div class="flex flex-col">
                                <span class="font-label-caps text-[9px] text-primary truncate max-w-[80px]" title="${escapeHTML(reel.title)}">${escapeHTML(reel.title)}</span>
                                <span class="font-label-caps text-[8px] text-on-surface-variant">Views: ${reel.views || "0"}</span>
                            </div>
                        </div>
                        <div class="absolute inset-0 bg-background/70 backdrop-blur-sm opacity-0 story-overlay transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
                            <div class="flex justify-between items-center w-full gap-2 mb-2">
                                <button data-id="${reel.id}" data-visible="${reel.visible}" class="toggle-reel-btn flex-1 bg-white/5 hover:bg-white/10 text-primary py-1.5 rounded-lg border border-white/5 transition-colors flex justify-center" title="Toggle visibility">
                                    <span class="material-symbols-outlined text-sm">${reel.visible ? 'visibility' : 'visibility_off'}</span>
                                </button>
                                <button data-id="${reel.id}" class="delete-reel-btn flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg border border-red-500/10 transition-colors flex justify-center" title="Delete">
                                    <span class="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    `;
                    bindReelActions(card);
                    reelsGrid.appendChild(card);
                });
            }
        }
    } catch (err) {
        console.error("Content grid load error:", err);
    }
}

function bindHighlightActions(cardElement) {
    const toggleBtn = cardElement.querySelector(".toggle-highlight-btn");
    const deleteBtn = cardElement.querySelector(".delete-highlight-btn");

    cardElement.addEventListener("click", (e) => {
        if (e.target.closest(".toggle-highlight-btn") || e.target.closest(".delete-highlight-btn")) {
            return;
        }
        const id = toggleBtn.dataset.id;
        if (typeof window.loadHighlightToForm === "function") {
            window.loadHighlightToForm(id);
        }
    });

    if (toggleBtn) {
        toggleBtn.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;
            const currentVisible = btn.dataset.visible === "true";

            btn.disabled = true;
            try {
                await saveHighlight({
                    id,
                    visible: !currentVisible
                });
                reloadStoriesGrid();
            } catch (err) {
                console.error("Failed to toggle highlight visibility:", err);
                btn.disabled = false;
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;

            if (confirm("Are you sure you want to delete this story highlight Circle?")) {
                btn.disabled = true;
                try {
                    await deleteHighlight(id);
                    reloadStoriesGrid();
                } catch (err) {
                    console.error("Failed to delete highlight:", err);
                    btn.disabled = false;
                }
            }
        });
    }
}

function bindPostActions(cardElement) {
    const toggleBtn = cardElement.querySelector(".toggle-post-btn");
    const deleteBtn = cardElement.querySelector(".delete-post-btn");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;
            const currentVisible = btn.dataset.visible === "true";

            btn.disabled = true;
            try {
                await savePost({
                    id,
                    visible: !currentVisible
                });
                reloadStoriesGrid();
            } catch (err) {
                console.error("Failed to toggle post visibility:", err);
                btn.disabled = false;
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;

            if (confirm("Are you sure you want to delete this post item?")) {
                btn.disabled = true;
                try {
                    await deletePost(id);
                    reloadStoriesGrid();
                } catch (err) {
                    console.error("Failed to delete post:", err);
                    btn.disabled = false;
                }
            }
        });
    }
}

function bindReelActions(cardElement) {
    const toggleBtn = cardElement.querySelector(".toggle-reel-btn");
    const deleteBtn = cardElement.querySelector(".delete-reel-btn");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;
            const currentVisible = btn.dataset.visible === "true";

            btn.disabled = true;
            try {
                await saveReel({
                    id,
                    visible: !currentVisible
                });
                reloadStoriesGrid();
            } catch (err) {
                console.error("Failed to toggle reel visibility:", err);
                btn.disabled = false;
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
            const btn = e.currentTarget;
            const id = btn.dataset.id;

            if (confirm("Are you sure you want to delete this reel clip?")) {
                btn.disabled = true;
                try {
                    await deleteReel(id);
                    reloadStoriesGrid();
                } catch (err) {
                    console.error("Failed to delete reel:", err);
                    btn.disabled = false;
                }
            }
        });
    }
}


/* ────────────────────────────────────────────────────────
   5. PROJECTS HUB CONTROLLER
   ──────────────────────────────────────────────────────── */
let loadedProjectsList = [];

function initProjectsTab() {
    const editForm = document.getElementById("project-edit-form");
    const cancelBtn = document.getElementById("project-cancel-btn");
    const addProjectBtn = document.getElementById("add-project-btn");
    const searchInput = document.getElementById("project-search-input");

    // Cancel / Reset Form
    cancelBtn.addEventListener("click", () => {
        resetProjectForm();
    });

    // Header Add Button
    addProjectBtn.addEventListener("click", () => {
        resetProjectForm();
        document.getElementById("project-title").focus();
    });

    // Search Filtering
    searchInput.addEventListener("input", () => {
        renderFilteredProjects(searchInput.value.trim());
    });

    // Form Submit
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id = document.getElementById("project-id").value;
        const title = document.getElementById("project-title").value.trim();
        const status = document.getElementById("project-status").value;
        const desc = document.getElementById("project-desc").value.trim();
        const detailedDesc = document.getElementById("project-detailed-desc").value.trim();
        const liveUrl = document.getElementById("project-live-url").value.trim();
        let imageUrl = document.getElementById("project-image-url").value;
        const imageFile = document.getElementById("project-input-image-file").files[0];

        if (imageFile) {
            try {
                imageUrl = await readFileAsBase64(imageFile);
            } catch (err) {
                console.error("Failed to read project image:", err);
            }
        }

        if (!imageUrl) {
            alert("Please select a local cover showcase image file to upload from your device.");
            return;
        }

        const submitBtn = editForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.classList.add("opacity-50");

        try {
            await saveProject({
                id,
                title,
                status,
                description: desc,
                detailedDescription: detailedDesc,
                liveUrl,
                imageUrl
            });

            resetProjectForm();
            reloadProjectsList();
            alert("Project saved successfully!");
        } catch (err) {
            console.error("Failed to save project:", err);
            alert("Failed to save project.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove("opacity-50");
        }
    });
}

async function reloadProjectsList() {
    try {
        loadedProjectsList = await getProjects();
        renderFilteredProjects("");
    } catch (e) {
        console.error("Projects list load error:", e);
    }
}

function renderFilteredProjects(query) {
    const listContainer = document.getElementById("projects-list-container");
    listContainer.innerHTML = "";

    const q = query.toLowerCase();
    const filtered = loadedProjectsList.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="col-span-2 text-on-surface-variant italic text-xs py-8 text-center bg-white/2 rounded-xl">No projects found matching query.</div>`;
        return;
    }

    filtered.forEach(proj => {
        const card = document.createElement("div");
        card.className = "project-card relative rounded-xl overflow-hidden glass-panel border border-white/5 cursor-pointer group";
        
        // Highlight border if active editing
        const activeId = document.getElementById("project-id").value;
        if (activeId === proj.id) {
            card.classList.add("border-primary", "ring-1", "ring-primary");
        }

        let statusBg = "bg-emerald-500";
        if (proj.status === "draft") statusBg = "bg-amber-500";
        if (proj.status === "archived") statusBg = "bg-red-500";

        card.innerHTML = `
            <div class="aspect-video relative overflow-hidden bg-surface-container-highest">
                <img alt="${escapeHTML(proj.title)}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102" src="${proj.imageUrl}">
                <div class="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5">
                    <div class="w-1.5 h-1.5 rounded-full ${statusBg}"></div>
                    <span class="font-label-caps text-[9px] text-primary uppercase">${proj.status}</span>
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-body-lg text-sm text-primary font-semibold truncate mb-1">${escapeHTML(proj.title)}</h3>
                <p class="font-body-sm text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">${escapeHTML(proj.description)}</p>
                <div class="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span class="font-label-caps text-[8px] text-on-surface-variant uppercase">ID: ${proj.id}</span>
                    <button class="edit-proj-trigger text-secondary hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-label-caps font-semibold">
                        EDIT <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                </div>
            </div>
        `;

        // Bind Edit Trigger (and whole card click)
        const loadToForm = (e) => {
            e.stopPropagation();
            document.getElementById("project-id").value = proj.id;
            document.getElementById("project-title").value = proj.title;
            document.getElementById("project-status").value = proj.status;
            document.getElementById("project-desc").value = proj.description;
            document.getElementById("project-detailed-desc").value = proj.detailedDescription || "";
            document.getElementById("project-live-url").value = proj.liveUrl || "";
            document.getElementById("project-image-url").value = proj.imageUrl || "";
            document.getElementById("project-image-file-preview").innerText = proj.imageUrl ? "Existing cover image loaded" : "No file chosen";

            // Form Title/Badge UI
            document.getElementById("project-form-title").innerText = "Edit Project";
            const badge = document.getElementById("project-form-id-badge");
            badge.innerText = "EDIT";
            badge.classList.remove("hidden");

            // Add delete option if not new
            setupProjectDeleteBtn(proj.id);

            // Re-render to show active ring
            renderFilteredProjects(document.getElementById("project-search-input").value.trim());
        };

        card.addEventListener("click", loadToForm);
        listContainer.appendChild(card);
    });
}

function resetProjectForm() {
    document.getElementById("project-id").value = "new";
    document.getElementById("project-title").value = "";
    document.getElementById("project-status").value = "published";
    document.getElementById("project-desc").value = "";
    document.getElementById("project-detailed-desc").value = "";
    document.getElementById("project-live-url").value = "";
    document.getElementById("project-image-url").value = "";
    document.getElementById("project-input-image-file").value = "";
    document.getElementById("project-image-file-preview").innerText = "No file chosen";

    document.getElementById("project-form-title").innerText = "Create Project";
    const badge = document.getElementById("project-form-id-badge");
    badge.classList.add("hidden");

    // Remove any delete button from form actions if exists
    const deleteBtn = document.getElementById("project-form-delete-btn");
    if (deleteBtn) deleteBtn.remove();
    
    // Refresh to remove active rings
    renderFilteredProjects(document.getElementById("project-search-input").value.trim());
}

function setupProjectDeleteBtn(projectId) {
    const editForm = document.getElementById("project-edit-form");
    const actionsRow = editForm.querySelector(".flex.gap-3.pt-2");

    // Remove existing if any
    const existing = document.getElementById("project-form-delete-btn");
    if (existing) existing.remove();

    // Create new
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.id = "project-form-delete-btn";
    deleteBtn.className = "flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-label-caps text-[11px] border border-red-500/10 active:scale-[0.98] transition-all";
    deleteBtn.innerText = "Delete Project";

    deleteBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this project permanently?")) {
            deleteBtn.disabled = true;
            deleteBtn.classList.add("opacity-50");
            try {
                await deleteProject(projectId);
                resetProjectForm();
                reloadProjectsList();
                alert("Project deleted.");
            } catch (err) {
                console.error("Failed to delete project:", err);
                deleteBtn.disabled = false;
                deleteBtn.classList.remove("opacity-50");
            }
        }
    });

    // Prepend/insert before Cancel button in form footer row
    actionsRow.insertBefore(deleteBtn, actionsRow.firstElementChild);
}


/* ────────────────────────────────────────────────────────
   6. SETTINGS & SOCIALS CONTROLLER
   ──────────────────────────────────────────────────────── */
async function initSettingsTab() {
    const form = document.getElementById("settings-global-form");
    const avatarFileInput = document.getElementById("setting-input-avatar-file");
    const avatarPreview = document.getElementById("setting-avatar-preview");

    if (avatarFileInput) {
        avatarFileInput.addEventListener("change", async () => {
            const file = avatarFileInput.files[0];
            if (file) {
                try {
                    const base64 = await readFileAsBase64(file);
                    avatarPreview.src = base64;
                } catch (err) {
                    console.error("Failed to read avatar file:", err);
                }
            }
        });
    }

    try {
        const settings = await getSettings();
        populateSettingsFields(settings);
    } catch (e) {
        console.error("Failed to load initial settings:", e);
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const forceMock = document.getElementById("setting-force-mock").checked;
        const prevMock = isForceMock;
        if (forceMock !== prevMock) {
            toggleForceMock(forceMock);
            alert("Database mode changed! Reloading dashboard to initialize correct provider.");
            window.location.reload();
            return;
        }

        let adminAvatar = document.getElementById("setting-admin-avatar").value;
        const avatarFile = avatarFileInput ? avatarFileInput.files[0] : null;
        if (avatarFile) {
            try {
                adminAvatar = await readFileAsBase64(avatarFile);
            } catch (err) {
                console.error("Failed to read avatar file:", err);
            }
        }

        const data = {
            instagram: document.getElementById("setting-instagram").value.trim(),
            youtube: document.getElementById("setting-youtube").value.trim(),
            linkedin: document.getElementById("setting-linkedin").value.trim(),
            x: document.getElementById("setting-x").value.trim(),
            snapchat: document.getElementById("setting-snapchat").value.trim(),
            soundcloud: document.getElementById("setting-soundcloud").value.trim(),
            contactEmail: document.getElementById("setting-contact-email").value.trim(),
            adminName: document.getElementById("setting-admin-name").value.trim(),
            adminAvatar,
            siteTitle: document.getElementById("setting-site-title").value.trim(),
            maintenanceMode: document.getElementById("setting-maintenance").checked
        };

        const submitBtn = form.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.classList.add("opacity-50");

        try {
            await saveSettings(data);
            
            // Reflect updates instantly in Sidebar profile
            document.getElementById("admin-sidebar-name").innerText = data.adminName;
            document.getElementById("admin-sidebar-avatar").src = data.adminAvatar;
            document.getElementById("setting-avatar-preview").src = data.adminAvatar;

            alert("Settings updated successfully!");
        } catch (err) {
            console.error("Failed to save settings:", err);
            alert("Failed to save settings.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove("opacity-50");
        }
    });

    const resetDbBtn = document.getElementById("setting-reset-db-btn");
    if (resetDbBtn) {
        resetDbBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset all mock databases (Stories, Posts, Reels, Videos, Projects, Settings, Guestbook) to their original default states? This will erase all custom added items and reload the page.")) {
                localStorage.removeItem("pt_highlights");
                localStorage.removeItem("pt_posts");
                localStorage.removeItem("pt_reels");
                localStorage.removeItem("pt_videos");
                localStorage.removeItem("pt_projects");
                localStorage.removeItem("pt_settings");
                localStorage.removeItem("pt_guestbook_messages");
                localStorage.removeItem("pt_local_synced");
                
                alert("Database reset successful! Reloading to apply defaults.");
                window.location.reload();
            }
        });
    }

    const syncLocalBtn = document.getElementById("setting-sync-local-btn");
    if (syncLocalBtn) {
        syncLocalBtn.addEventListener("click", async () => {
            const provider = getActiveDatabaseProvider();
            if (provider !== "firebase") {
                alert("You must disable 'Local Storage Mock Database' in Settings, save, and ensure you are connected to Firebase Firestore before syncing.");
                return;
            }
            
            if (!confirm("WARNING: This will overwrite your live Firebase Firestore database with the data stored in this browser's Local Storage. Only use this if you are migrating your local test data to Firebase for the first time.\n\nAre you sure you want to proceed?")) {
                return;
            }
            
            syncLocalBtn.disabled = true;
            const originalText = syncLocalBtn.innerHTML;
            syncLocalBtn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Syncing...`;
            
            try {
                // 1. Settings
                const localSettings = localStorage.getItem("pt_global_settings");
                if (localSettings) {
                    await saveSettings(JSON.parse(localSettings));
                }
                
                // 2. Projects
                const localProjects = localStorage.getItem("pt_projects");
                if (localProjects) {
                    const projects = JSON.parse(localProjects);
                    for (const proj of projects) {
                        await saveProject(proj);
                    }
                }
                
                // 3. Highlights
                const localHighlights = localStorage.getItem("pt_highlights");
                if (localHighlights) {
                    const highlights = JSON.parse(localHighlights);
                    for (const hl of highlights) {
                        await saveHighlight(hl);
                    }
                }
                
                // 5. Posts
                const localPosts = localStorage.getItem("pt_posts");
                if (localPosts) {
                    const posts = JSON.parse(localPosts);
                    for (const post of posts) {
                        await savePost(post);
                    }
                }
                
                // 6. Reels
                const localReels = localStorage.getItem("pt_reels");
                if (localReels) {
                    const reels = JSON.parse(localReels);
                    for (const reel of reels) {
                        await saveReel(reel);
                    }
                }
                
                // 7. Videos
                const localVideos = localStorage.getItem("pt_videos");
                if (localVideos) {
                    const videos = JSON.parse(localVideos);
                    for (const video of videos) {
                        await saveVideo(video);
                    }
                }

                // 8. Guestbook messages
                const localMessages = localStorage.getItem("pt_guestbook_messages");
                if (localMessages) {
                    const messages = JSON.parse(localMessages);
                    const reversed = [...messages].reverse(); // preserve ordering
                    for (const msg of reversed) {
                        await addMessage(msg);
                    }
                }
                
                localStorage.setItem("pt_local_synced", "true");
                alert("Data synced to Firebase Firestore successfully! This browser's local data has been migrated.");
                window.location.reload();
            } catch (err) {
                console.error("Sync failed:", err);
                alert("Failed to sync data. Please verify your Firebase connection and Firestore security rules. Error: " + err.message);
            } finally {
                syncLocalBtn.disabled = false;
                syncLocalBtn.innerHTML = originalText;
            }
        });
    }
}

function populateSettingsFields(settings) {
    document.getElementById("setting-instagram").value = settings.instagram || "";
    document.getElementById("setting-youtube").value = settings.youtube || "";
    document.getElementById("setting-linkedin").value = settings.linkedin || "";
    document.getElementById("setting-x").value = settings.x || "";
    document.getElementById("setting-snapchat").value = settings.snapchat || "";
    document.getElementById("setting-soundcloud").value = settings.soundcloud || "";
    document.getElementById("setting-contact-email").value = settings.contactEmail || "purusharthsinger.7@gmail.com";
    document.getElementById("setting-admin-name").value = settings.adminName || "Purusharth Tripathi";
    document.getElementById("setting-admin-avatar").value = settings.adminAvatar || "";
    document.getElementById("setting-avatar-preview").src = settings.adminAvatar || "";
    const previewFileLabel = document.getElementById("setting-avatar-file-preview");
    if (previewFileLabel) {
        previewFileLabel.innerText = settings.adminAvatar ? "Existing avatar loaded" : "No file chosen";
    }
    document.getElementById("setting-site-title").value = settings.siteTitle || "";
    document.getElementById("setting-maintenance").checked = !!settings.maintenanceMode;
    document.getElementById("setting-force-mock").checked = isForceMock;

    // Sync button visibility: only show if database provider is firebase AND not yet synced
    const syncLocalBtn = document.getElementById("setting-sync-local-btn");
    if (syncLocalBtn) {
        const provider = getActiveDatabaseProvider();
        if (provider === "firebase" && localStorage.getItem("pt_local_synced") !== "true") {
            syncLocalBtn.classList.remove("hidden");
        } else {
            syncLocalBtn.classList.add("hidden");
        }
    }

    // Sidebar profiles sync
    document.getElementById("admin-sidebar-name").innerText = settings.adminName || "Purusharth Tripathi";
    document.getElementById("admin-sidebar-avatar").src = settings.adminAvatar || "";

    // Show Database status operational
    const provider = getActiveDatabaseProvider();
    const dbLabel = document.getElementById("database-status-label");
    const dbDot = dbLabel ? dbLabel.parentElement.nextElementSibling : null;

    if (dbLabel) {
        if (provider === "firebase") {
            dbLabel.innerText = "Firebase Firestore";
            if (dbDot) {
                dbDot.className = "w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
            }
        } else if (provider === "mock-forced") {
            dbLabel.innerText = "Local Storage (Forced Mock)";
            if (dbDot) {
                dbDot.className = "w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]";
            }
        } else {
            dbLabel.innerText = "Local Storage (Permission Fallback)";
            if (dbDot) {
                dbDot.className = "w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
            }
        }
    }
}


/* ────────────────────────────────────────────────────────
   7. WEBGL DRIFTING NOISE BACKGROUND SHADER (Matched homepage)
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
            
            float n = snoise(uv * 1.5 + u_time * 0.05);
            n += 0.4 * snoise(uv * 3.0 - u_time * 0.08);
            
            vec3 baseBackground = vec3(0.05, 0.05, 0.06); 
            vec3 purpleWave = vec3(0.11, 0.08, 0.16);     
            vec3 blueWave = vec3(0.06, 0.08, 0.14);       
            
            vec3 color = mix(baseBackground, purpleWave, n * 0.5 + 0.5);
            color = mix(color, blueWave, snoise(uv * 2.0 + u_time * 0.04) * 0.3 + 0.3);
            
            float dist = distance(uv, mouse);
            float glow = smoothstep(0.35, 0.0, dist);
            color += vec3(0.65, 0.55, 0.95) * glow * 0.12; 
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
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
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const positions = new Float32Array([
        -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
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

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    let startTime = Date.now();
    function render() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(timeLoc, (Date.now() - startTime) * 0.001);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.uniform2f(mouseLoc, mouseX, mouseY);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    render();
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
