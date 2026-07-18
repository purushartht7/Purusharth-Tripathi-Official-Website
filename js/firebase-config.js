/**
 * Firebase Config & Real-time Firestore Operations Module
 * Supports automatic fallback to localStorage-based Mock Database if credentials are unconfigured.
 */

const firebaseConfig = {
  apiKey: "AIzaSyBcolGo0wzYRZ-Ay6wSe56bU7fs1Reu7B0",
  authDomain: "purusharth-portfolio.firebaseapp.com",
  projectId: "purusharth-portfolio",
  storageBucket: "purusharth-portfolio.firebasestorage.app",
  messagingSenderId: "391329088680",
  appId: "1:391329088680:web:fc85d4a613d2461ae56e9d",
  measurementId: "G-FXS1L1N9WQ"
};

// Check if credentials are still placeholders
export const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

// Check if forced mock database mode is enabled
export const isForceMock = localStorage.getItem("pt_force_mock") === "true";

export function getActiveDatabaseProvider() {
    if (isForceMock) return "mock-forced";
    if (useFirebase && db) return "firebase";
    return "mock-fallback";
}

export function toggleForceMock(state) {
    localStorage.setItem("pt_force_mock", state ? "true" : "false");
}

let db = null;
let useFirebase = false;

// Mock database callbacks list (for simulating Firestore real-time updates)
const mockCallbacks = [];

if (isConfigured && !isForceMock) {
    try {
        // Dynamically import Firebase libraries
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        useFirebase = true;
        console.log("Firebase Firestore initialized successfully.");
        
        // Auto-bootstrap defaults if Firebase is empty
        bootstrapFirebaseData();
    } catch (e) {
        console.error("Failed to initialize Firebase, falling back to LocalStorage mock database:", e);
    }
} else {
    if (isForceMock) {
        console.log("Forced LocalStorage Mock Database mode active.");
    } else {
        console.warn("Firebase is not configured yet. Falling back to LocalStorage Mock Database.");
    }
}

/* ────────────────────────────────────────────────────────
   1. GUESTBOOK CRUD OPERATIONS
   ──────────────────────────────────────────────────────── */

/**
 * Save a message to the database (Firestore or Mock LocalStorage)
 * @param {Object} message - { name, message, color, emoji }
 */
export async function addMessage(message) {
    const messageData = {
        name: message.name || "Anonymous",
        message: message.message || "",
        color: message.color || "obsidian",
        emoji: message.emoji || "✨",
        timestamp: new Date().toISOString()
    };

    if (useFirebase && db) {
        try {
            const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await addDoc(collection(db, "guestbook"), {
                ...messageData,
                timestamp: serverTimestamp() // Use Firebase Server Timestamp
            });
            return true;
        } catch (e) {
            console.error("Firebase write error, attempting LocalStorage fallback:", e);
        }
    }

    // Mock LocalStorage database write
    const localMessages = JSON.parse(localStorage.getItem("pt_guestbook_messages") || "[]");
    localMessages.unshift(messageData); // Prepend so new messages are first
    localStorage.setItem("pt_guestbook_messages", JSON.stringify(localMessages));
    
    // Trigger all active snapshot listeners
    triggerMockChange();
    return true;
}

/**
 * Delete a guestbook message
 * @param {String|Number} id - Firestore Document ID or LocalStorage index
 */
export async function deleteMessage(id) {
    if (useFirebase && db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "guestbook", id));
            return true;
        } catch (e) {
            console.error("Firebase delete error, attempting LocalStorage fallback:", e);
        }
    }

    // LocalStorage delete
    let localMessages = JSON.parse(localStorage.getItem("pt_guestbook_messages") || "[]");
    if (typeof id === "number") {
        localMessages.splice(id, 1);
    } else {
        // Fallback search by index/timestamp if id matches
        const index = localMessages.findIndex(m => m.timestamp === id || m.id === id);
        if (index > -1) {
            localMessages.splice(index, 1);
        } else {
            // Assume the id might be an index passed as string
            const idx = parseInt(id, 10);
            if (!isNaN(idx) && idx >= 0 && idx < localMessages.length) {
                localMessages.splice(idx, 1);
            }
        }
    }
    localStorage.setItem("pt_guestbook_messages", JSON.stringify(localMessages));
    triggerMockChange();
    return true;
}

/**
 * Register a listener for real-time updates on the guestbook messages
 * @param {Function} callback - Callback function that receives an array of messages
 */
export async function listenToMessages(callback) {
    if (useFirebase && db) {
        try {
            const { collection, onSnapshot, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "guestbook"), orderBy("timestamp", "desc"));
            
            return onSnapshot(q, (snapshot) => {
                const messages = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    messages.push({
                        id: doc.id,
                        name: data.name,
                        message: data.message,
                        color: data.color,
                        emoji: data.emoji,
                        timestamp: data.timestamp ? (data.timestamp.seconds ? new Date(data.timestamp.seconds * 1000).toISOString() : data.timestamp) : new Date().toISOString()
                    });
                });
                callback(messages);
            }, (error) => {
                console.error("Firestore snapshot error, falling back to LocalStorage:", error);
                setupMockListener(callback);
            });
        } catch (e) {
            console.error("Failed to setup Firestore listener, using Mock:", e);
        }
    }

    setupMockListener(callback);
    // Return an unsubscribe function
    return () => {
        const index = mockCallbacks.indexOf(callback);
        if (index > -1) mockCallbacks.splice(index, 1);
    };
}

// Helpers for mock database
function setupMockListener(callback) {
    mockCallbacks.push(callback);
    
    // Bootstrapping some initial dummy messages if database is completely empty
    const localMessages = localStorage.getItem("pt_guestbook_messages");
    if (!localMessages) {
        const dummyMessages = [
            {
                name: "Aarav Sharma",
                message: "Absolutely loved the Empty Hall Sessions cover! Keep up the brilliant work, Purusharth! 🔥",
                color: "emerald",
                emoji: "🎵",
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
                name: "Mishika Sen",
                message: "Rival in Retro has some of the cleanest fan jerseys I have ever seen. High fidelity tech at its best!",
                color: "sapphire",
                emoji: "⚽",
                timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
            },
            {
                name: "Rohan Verma",
                message: "Your voice is stellar, man! Need more covers on YouTube soon.",
                color: "ruby",
                emoji: "🎤",
                timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
            }
        ];
        localStorage.setItem("pt_guestbook_messages", JSON.stringify(dummyMessages));
    }
    
    // Send current items immediately
    const items = JSON.parse(localStorage.getItem("pt_guestbook_messages") || "[]");
    // Ensure all items have an id (using timestamp as fallback id)
    const itemsWithIds = items.map((item, idx) => ({
        id: item.id || item.timestamp || idx.toString(),
        ...item
    }));
    callback(itemsWithIds);
}

function triggerMockChange() {
    const items = JSON.parse(localStorage.getItem("pt_guestbook_messages") || "[]");
    const itemsWithIds = items.map((item, idx) => ({
        id: item.id || item.timestamp || idx.toString(),
        ...item
    }));
    mockCallbacks.forEach(callback => callback(itemsWithIds));
}


/* ────────────────────────────────────────────────────────
   2. SOCIALS & SETTINGS CRUD
   ──────────────────────────────────────────────────────── */

const defaultSettings = {
    instagram: "https://www.instagram.com/purusharth.wav/",
    youtube: "https://youtube.com/@purusharthsinger.7?si=MioMWBFa09r7Iv3d",
    linkedin: "https://www.linkedin.com/in/purushartht7/",
    x: "https://x.com/purushartht7?s=20",
    snapchat: "https://www.snapchat.com/add/purushartht_7?share_id=1r9wJxf_wWw&locale=en-IN",
    soundcloud: "https://on.soundcloud.com/8Bvj9DETOOwazT4Uek",
    contactEmail: "purusharthsinger.7@gmail.com",
    siteTitle: "Purusharth Tripathi | Official Website & Portfolio",
    maintenanceMode: false,
    adminName: "Purusharth Tripathi",
    adminAvatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDynESh32YZGFQtvx5XoOk7AiJbitbSlLQyl0i_7CS8orYzEGvM_RZHkkDwzwr_c11wqxK8gYkSX7LUwToIqBC_mdzlv_F_gMhokoa2ZsPevFcwjrPw3pwIQTQ39x2ojOb1Bbq0o73ANtLqfwloFYWOPc-cL-3Lwes8STPBj44XsAsj84XlTSxr37wdx-xVJXlnZqye1mXSXJBUo0frTFLthJIab2_8f-CxRWYTz5YdvJEy8rKLX3uUO1okoLt-hH-fdH-XQCkXdOVf"
};

export async function getSettings() {
    if (useFirebase && db) {
        try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const docRef = doc(db, "settings", "global");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...defaultSettings, ...docSnap.data() };
            }
        } catch (e) {
            console.error("Firestore settings fetch error:", e);
        }
    }
    
    // Fallback to LocalStorage
    const local = localStorage.getItem("pt_global_settings");
    if (local) {
        return { ...defaultSettings, ...JSON.parse(local) };
    }
    localStorage.setItem("pt_global_settings", JSON.stringify(defaultSettings));
    return defaultSettings;
}

export async function saveSettings(settings) {
    if (useFirebase && db) {
        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const docRef = doc(db, "settings", "global");
            await setDoc(docRef, settings, { merge: true });
            return true;
        } catch (e) {
            console.error("Firestore settings save error:", e);
        }
    }

    const current = await getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem("pt_global_settings", JSON.stringify(updated));
    return true;
}


/* ────────────────────────────────────────────────────────
   3. PROJECTS CRUD OPERATIONS
   ──────────────────────────────────────────────────────── */

const defaultProjects = [
    {
        id: "redcardlive",
        title: "RedCardLive",
        description: "Real-time sports tracking and live matches commentary hub. Designed with deep dark mode aesthetics and high-performance WebSockets updates.",
        detailedDescription: "Ultimate Companion App for the FIFA World Cup 2026. Real-time scores, insights, bracket dynamics, and a fully integrated admin dashboard powered by Firebase. Implements low-latency updates and WebGL background shader integration.",
        status: "published",
        liveUrl: "https://redcardlive.vercel.app/",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYavfBmjEgnnaJ4RKuZlLXkfK2mxb22ljCANlfaP-gaBJJQqda86Jmf5ToocWLByjpcE88bSXud7hv49yjBNanEuLRCheqOIvfbP5Ys53UxHPohmfyfdXB02HEYECq8dd0ktIxI3MwEyLtV-05UogewkFsAb5bmhy01L3K8wk0nYdr7J3hul-KBjQ146SnT99LMUtM_pFP3JGPGJLknddOOu6TKFHFbF3x__imeX8rSj9H7022qqvZ0RPV5TO8iLgG3NAN1pggB0Gz",
        timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
    },
    {
        id: "rivalinretro",
        title: "Rival in Retro",
        description: "A retro-inspired gaming hub and interactive store for premium merchandise and gaming gear.",
        detailedDescription: "Premium Fan Jersey store featuring classic vintage football kits. Built with modular designs, interactive shopping drawers, and custom WhatsApp message order routing. Includes smooth scroll effects and product search systems.",
        status: "published",
        liveUrl: "https://rivalinretro.vercel.app/",
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBc0fv09fFoY7saA5hnBsVs95OW29ZSy4UBBrlpp7W-vxNOndfiY-DqosOKZ7XoPFxBBEnRqbV2vhId-C-C-evB27A3uJXawxLTcNbec90oOWeAijAVzIS0lCV46PN4w3s5wyEv9Jf6S36rrCylWiF2QG23rkuKbe1hNfiaFBQyYd3674vBwfHKP9e9Sq2XHOuhkvmvbwWZJBBSfeSIxZzQhNmVydPqx8p318_1uGak01f5XcuFGLYDD10hVwjtsTcIj-80YLqSXfYg",
        timestamp: new Date(Date.now() - 3600000 * 24 * 10).toISOString()
    }
];

export async function getProjects() {
    if (useFirebase && db) {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "projects"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const projects = [];
            querySnapshot.forEach((doc) => {
                projects.push({ id: doc.id, ...doc.data() });
            });
            if (projects.length > 0) return projects;
        } catch (e) {
            console.error("Firestore projects fetch error:", e);
        }
    }

    // Fallback to LocalStorage
    const local = localStorage.getItem("pt_projects");
    if (local) {
        return JSON.parse(local);
    }
    localStorage.setItem("pt_projects", JSON.stringify(defaultProjects));
    return defaultProjects;
}

export async function saveProject(project) {
    const projectData = {
        title: project.title || "Untitled Project",
        description: project.description || "",
        detailedDescription: project.detailedDescription || "",
        status: project.status || "draft",
        liveUrl: project.liveUrl || "",
        imageUrl: project.imageUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDYavfBmjEgnnaJ4RKuZlLXkfK2mxb22ljCANlfaP-gaBJJQqda86Jmf5ToocWLByjpcE88bSXud7hv49yjBNanEuLRCheqOIvfbP5Ys53UxHPohmfyfdXB02HEYECq8dd0ktIxI3MwEyLtV-05UogewkFsAb5bmhy01L3K8wk0nYdr7J3hul-KBjQ146SnT99LMUtM_pFP3JGPGJLknddOOu6TKFHFbF3x__imeX8rSj9H7022qqvZ0RPV5TO8iLgG3NAN1pggB0Gz",
        timestamp: project.timestamp || new Date().toISOString()
    };

    if (useFirebase && db) {
        try {
            const { collection, addDoc, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            if (project.id && project.id !== "new") {
                const docRef = doc(db, "projects", project.id);
                await setDoc(docRef, projectData, { merge: true });
            } else {
                await addDoc(collection(db, "projects"), projectData);
            }
            return true;
        } catch (e) {
            console.error("Firestore project save error:", e);
        }
    }

    // LocalStorage save
    const current = await getProjects();
    if (project.id && project.id !== "new") {
        const idx = current.findIndex(p => p.id === project.id);
        if (idx > -1) {
            current[idx] = { ...current[idx], ...projectData };
        } else {
            current.unshift({ id: project.id, ...projectData });
        }
    } else {
        const newId = "proj_" + Date.now();
        current.unshift({ id: newId, ...projectData });
    }
    localStorage.setItem("pt_projects", JSON.stringify(current));
    return true;
}

export async function deleteProject(projectId) {
    if (useFirebase && db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "projects", projectId));
            return true;
        } catch (e) {
            console.error("Firestore project delete error:", e);
        }
    }

    const current = await getProjects();
    const filtered = current.filter(p => p.id !== projectId);
    localStorage.setItem("pt_projects", JSON.stringify(filtered));
    return true;
}


/* ────────────────────────────────────────────────────────
   4. STORIES & REELS CRUD OPERATIONS
   ──────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────
   4. DYNAMIC CONTENT CRUD (HIGHLIGHTS, POSTS, REELS)
   ──────────────────────────────────────────────────────── */

// A. STORY HIGHLIGHTS DEFAULT CONFIG & OPERATIONS
const defaultHighlights = [
    {
        id: "highlight_1",
        title: "Studio",
        thumbnailUrl: "mic", 
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        stories: [
            {
                id: "story_1_1",
                mediaUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop",
                mediaType: "photo",
                timestamp: new Date(Date.now() - 3600000 * 1).toISOString()
            },
            {
                id: "story_1_2",
                mediaUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop",
                mediaType: "photo",
                timestamp: new Date(Date.now() - 3600000 * 1).toISOString()
            }
        ]
    },
    {
        id: "highlight_2",
        title: "Live Shows",
        thumbnailUrl: "theater_comedy", 
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        stories: [
            {
                id: "story_2_1",
                mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                mediaType: "video",
                timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
            }
        ]
    },
    {
        id: "highlight_3",
        title: "Practice",
        thumbnailUrl: "music_note",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        stories: [
            {
                id: "story_3_1",
                mediaUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop",
                mediaType: "photo",
                timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
            }
        ]
    },
    {
        id: "highlight_4",
        title: "BTS",
        thumbnailUrl: "workspace_premium",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        stories: [
            {
                id: "story_4_1",
                mediaUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop",
                mediaType: "photo",
                timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
            }
        ]
    },
    {
        id: "highlight_5",
        title: "Travel",
        thumbnailUrl: "flight_takeoff",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        stories: [
            {
                id: "story_5_1",
                mediaUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop",
                mediaType: "photo",
                timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
            }
        ]
    }
];

function migrateHighlight(hl) {
    if (!hl.stories || hl.stories.length === 0) {
        if (hl.mediaUrl) {
            hl.stories = [
                {
                    id: "story_migrated_" + hl.id,
                    mediaUrl: hl.mediaUrl,
                    mediaType: hl.mediaType || "photo",
                    timestamp: hl.timestamp || new Date().toISOString()
                }
            ];
        } else {
            hl.stories = [];
        }
    }
    delete hl.mediaUrl;
    delete hl.mediaType;
    return hl;
}

export async function getHighlights() {
    if (useFirebase && db) {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "highlights"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push(migrateHighlight({ id: doc.id, ...doc.data() }));
            });
            if (list.length > 0) return list;
        } catch (e) {
            console.error("Firestore highlights fetch error:", e);
        }
    }
    const local = localStorage.getItem("pt_highlights");
    if (local) {
        try {
            const parsed = JSON.parse(local);
            return parsed.map(hl => migrateHighlight(hl));
        } catch (e) {
            console.error("Local highlights parse error, resetting:", e);
        }
    }
    localStorage.setItem("pt_highlights", JSON.stringify(defaultHighlights));
    return defaultHighlights;
}

export async function saveHighlight(item) {
    const data = {
        title: item.title || "Untitled Highlight",
        thumbnailUrl: item.thumbnailUrl || "mic",
        stories: item.stories || [],
        visible: item.visible !== undefined ? item.visible : true,
        timestamp: item.timestamp || new Date().toISOString()
    };
    if (useFirebase && db) {
        try {
            const { collection, addDoc, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            if (item.id && !item.id.startsWith("new")) {
                await setDoc(doc(db, "highlights", item.id), data, { merge: true });
            } else {
                await addDoc(collection(db, "highlights"), data);
            }
            return true;
        } catch (e) {
            console.error("Firestore highlight save error:", e);
        }
    }
    const current = await getHighlights();
    if (item.id && !item.id.startsWith("new")) {
        const idx = current.findIndex(s => s.id === item.id);
        if (idx > -1) current[idx] = { ...current[idx], ...data };
    } else {
        const newId = "highlight_" + Date.now();
        current.unshift({ id: newId, ...data });
    }
    localStorage.setItem("pt_highlights", JSON.stringify(current));
    return true;
}

export async function deleteHighlight(itemId) {
    if (useFirebase && db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "highlights", itemId));
            return true;
        } catch (e) {
            console.error("Firestore highlight delete error:", e);
        }
    }
    const current = await getHighlights();
    const filtered = current.filter(s => s.id !== itemId);
    localStorage.setItem("pt_highlights", JSON.stringify(filtered));
    return true;
}


// B. POSTS DEFAULT CONFIG & OPERATIONS
const defaultPosts = [
    {
        id: "post_1",
        title: "The Empty Hall Sessions",
        description: "Live Acoustic performance cover session",
        mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBjJj5wjlFhYp-KMDgvllBTdtVYHQTfx62BJqHc8LDNrlzVk9cew1vVmNqwLKgRMtYxPZ3FpXwvgcrJnVa-XPDGDej9U2yYM8ndrvtW2f-SqxzOlrb1PlgO4WQUgwp92rA0DPk3Tf5tb8NVNF2EVQ37AyaeRvuFKBfbPGanEFwP73ogVYHUcn1jdBuAzfMeF-cSgqgybh1bw5Nm5rc16pzY4_7XG1vke3oB8uuiyAMYEHMs9nKEwmoTghmtrYtqw9iSo8dqdpLSGHr8",
        mediaType: "photo",
        ratio: "featured",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
        id: "post_2",
        title: "Editorial '23",
        description: "Fine-art portrait shot",
        mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO",
        mediaType: "photo",
        ratio: "portrait",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
        id: "post_3",
        title: "Songwriting Sessions",
        description: "Writing Drafts & melodies",
        mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDVxWeh-tc0U8uFf_lSxEYstlvf83s6yvDw000_oaAzy_rxV7vFMML9aXT9Kntj_m_5i0L3OsJcVwCdQprZrxtYn15W7d-9cmL5Xob5mnYTOv2XNQHLw0JYns0r8xYenlZLPOG-Tu3iViZQDbW27Iyn6rMt9bJDJOXTsUouwrlnGOYRBJp_H2-2EU_VB8-7J11Fo1ET4w5h3BxStaPpbIOP6nVGSw4D4Y_EtysQn5C_9cQ1r6gMBuTy9VCyXatX1AVo7Jlu7E8uAhBv",
        mediaType: "photo",
        ratio: "square",
        visible: false,
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
        id: "post_4",
        title: "Late Night Mixes",
        description: "DAW audio stems mixing log",
        mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFem1RZKAcgZoZr2gT48Oe0avtfc7UFdzs0JwVIiKdmre_Ed_O-Sivdoy4JGACq--FJ1bSygrsEUBeWIiiRZmGVE9ZLXO9bqhEy__ipCdIElrk6c3nb6MVBB0FwDixA5Y8nU6W5Dxt_sqMJ8Ope4CP7zdIMuv4cGBdK8gLwpq6dZDiH6_4AZltaSn5sYnhkHMJlkpjhiUB3ePWXxwts9iPro0o36M8zgN-o6vnoZffl78544UAz7DEyOkyxr3gaXjd-xB9PC4FlIM2",
        mediaType: "photo",
        ratio: "landscape",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 36).toISOString()
    }
];

export async function getPosts() {
    if (useFirebase && db) {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            if (list.length > 0) return list;
        } catch (e) {
            console.error("Firestore posts fetch error:", e);
        }
    }
    const local = localStorage.getItem("pt_posts");
    if (local) return JSON.parse(local);
    localStorage.setItem("pt_posts", JSON.stringify(defaultPosts));
    return defaultPosts;
}

export async function savePost(item) {
    const data = {
        title: item.title || "Untitled Post",
        description: item.description || "",
        mediaUrl: item.mediaUrl || "",
        mediaType: item.mediaType || "photo",
        ratio: item.ratio || "standard",
        visible: item.visible !== undefined ? item.visible : true,
        timestamp: item.timestamp || new Date().toISOString()
    };
    if (useFirebase && db) {
        try {
            const { collection, addDoc, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            if (item.id && !item.id.startsWith("new")) {
                await setDoc(doc(db, "posts", item.id), data, { merge: true });
            } else {
                await addDoc(collection(db, "posts"), data);
            }
            return true;
        } catch (e) {
            console.error("Firestore post save error:", e);
        }
    }
    const current = await getPosts();
    if (item.id && !item.id.startsWith("new")) {
        const idx = current.findIndex(s => s.id === item.id);
        if (idx > -1) current[idx] = { ...current[idx], ...data };
    } else {
        const newId = "post_" + Date.now();
        current.unshift({ id: newId, ...data });
    }
    localStorage.setItem("pt_posts", JSON.stringify(current));
    return true;
}

export async function deletePost(itemId) {
    if (useFirebase && db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "posts", itemId));
            return true;
        } catch (e) {
            console.error("Firestore post delete error:", e);
        }
    }
    const current = await getPosts();
    const filtered = current.filter(s => s.id !== itemId);
    localStorage.setItem("pt_posts", JSON.stringify(filtered));
    return true;
}


// C. REELS DEFAULT CONFIG & OPERATIONS
const defaultReels = [
    {
        id: "reel_1",
        title: "Vocal Warmups",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO",
        views: "124K",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
        id: "reel_2",
        title: "Empty Hall Session BTS",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO",
        views: "89K",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 30).toISOString()
    },
    {
        id: "reel_3",
        title: "Piano Jamming",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO",
        views: "210K",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 50).toISOString()
    },
    {
        id: "reel_4",
        title: "Writing New Single",
        mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhnLqcW-4Bny19V-OmmyyMJ19Tq4jFS8JnXXJ71OmhETVyeIFQ8Ph862w_BiD0842_bFy_47ZkW3NTtyjg5O3tr9z9WWmeEpCX5lex0oKUH8llh-50iYQjeFr-xnVvdDtlX8quhPh4CVcu4lnvi0QYFjj2ZN6lGMHAwZWilzZ8P9zT6GpCKg6f8314r984IjXDkOelkYfl4wJlEGbT5nzaH1FnPjcg9Nwb855qkDtdYrGemY3OLwUh_BQNuiW-mp15NB7-vE0pCgaO",
        views: "56K",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 90).toISOString()
    }
];

export async function getReels() {
    if (useFirebase && db) {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "reels"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            if (list.length > 0) return list;
        } catch (e) {
            console.error("Firestore reels fetch error:", e);
        }
    }
    const local = localStorage.getItem("pt_reels");
    if (local) return JSON.parse(local);
    localStorage.setItem("pt_reels", JSON.stringify(defaultReels));
    return defaultReels;
}

export async function saveReel(item) {
    const data = {
        title: item.title || "Untitled Reel",
        mediaUrl: item.mediaUrl || "",
        thumbnailUrl: item.thumbnailUrl || "",
        views: item.views || "0K",
        visible: item.visible !== undefined ? item.visible : true,
        timestamp: item.timestamp || new Date().toISOString()
    };
    if (useFirebase && db) {
        try {
            const { collection, addDoc, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            if (item.id && !item.id.startsWith("new")) {
                await setDoc(doc(db, "reels", item.id), data, { merge: true });
            } else {
                await addDoc(collection(db, "reels"), data);
            }
            return true;
        } catch (e) {
            console.error("Firestore reel save error:", e);
        }
    }
    const current = await getReels();
    if (item.id && !item.id.startsWith("new")) {
        const idx = current.findIndex(s => s.id === item.id);
        if (idx > -1) current[idx] = { ...current[idx], ...data };
    } else {
        const newId = "reel_" + Date.now();
        current.unshift({ id: newId, ...data });
    }
    localStorage.setItem("pt_reels", JSON.stringify(current));
    return true;
}

export async function deleteReel(itemId) {
    if (useFirebase && db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "reels", itemId));
            return true;
        } catch (e) {
            console.error("Firestore reel delete error:", e);
        }
    }
    const current = await getReels();
    const filtered = current.filter(s => s.id !== itemId);
    localStorage.setItem("pt_reels", JSON.stringify(filtered));
    return true;
}


// E. YOUTUBE VIDEOS DEFAULT CONFIG & OPERATIONS
const defaultVideos = [
    {
        id: "video_1",
        title: "Purusharth Tripathi - Tu Hi Re (Acoustic Cover)",
        url: "https://www.youtube.com/watch?v=Umqb9KUHs_k",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    },
    {
        id: "video_2",
        title: "Purusharth Tripathi - Kabira (Live Performance)",
        url: "https://www.youtube.com/watch?v=jGPfnK1mC1E",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 24 * 7).toISOString()
    },
    {
        id: "video_3",
        title: "Purusharth Tripathi - Jeena Jeena (Studio Sessions)",
        url: "https://www.youtube.com/watch?v=F5tSoKaOspU",
        visible: true,
        timestamp: new Date(Date.now() - 3600000 * 24 * 12).toISOString()
    }
];

const mockVideosCallbacks = [];

function setupMockVideosListener(callback) {
    mockVideosCallbacks.push(callback);
    const localVideos = localStorage.getItem("pt_videos");
    if (!localVideos) {
        localStorage.setItem("pt_videos", JSON.stringify(defaultVideos));
    }
    const items = JSON.parse(localStorage.getItem("pt_videos") || "[]");
    const itemsWithIds = items.map((item, idx) => ({
        id: item.id || item.timestamp || idx.toString(),
        ...item
    }));
    callback(itemsWithIds);
}

function triggerMockVideosChange() {
    const items = JSON.parse(localStorage.getItem("pt_videos") || "[]");
    const itemsWithIds = items.map((item, idx) => ({
        id: item.id || item.timestamp || idx.toString(),
        ...item
    }));
    mockVideosCallbacks.forEach(callback => callback(itemsWithIds));
}

export async function listenToVideos(callback) {
    if (useFirebase && db) {
        try {
            const { collection, onSnapshot, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
            
            return onSnapshot(q, (snapshot) => {
                const videos = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    videos.push({
                        id: doc.id,
                        title: data.title,
                        url: data.url,
                        visible: data.visible !== undefined ? data.visible : true,
                        timestamp: data.timestamp ? (data.timestamp.seconds ? new Date(data.timestamp.seconds * 1000).toISOString() : data.timestamp) : new Date().toISOString()
                    });
                });
                callback(videos);
            }, (error) => {
                console.error("Firestore video snapshot error, falling back to LocalStorage:", error);
                setupMockVideosListener(callback);
            });
        } catch (e) {
            console.error("Failed to setup Firestore video listener, using Mock:", e);
        }
    }

    setupMockVideosListener(callback);
    return () => {
        const index = mockVideosCallbacks.indexOf(callback);
        if (index > -1) mockVideosCallbacks.splice(index, 1);
    };
}

export async function getVideos() {
    if (useFirebase && db) {
        try {
            const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            if (list.length > 0) return list;
        } catch (e) {
            console.error("Firestore videos fetch error:", e);
        }
    }
    const local = localStorage.getItem("pt_videos");
    if (local) return JSON.parse(local);
    localStorage.setItem("pt_videos", JSON.stringify(defaultVideos));
    return defaultVideos;
}

export async function saveVideo(item) {
    const data = {
        title: item.title || "Untitled Video",
        url: item.url || "",
        visible: item.visible !== undefined ? item.visible : true,
        timestamp: item.timestamp || new Date().toISOString()
    };
    if (useFirebase && db) {
        try {
            const { collection, addDoc, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            if (item.id && !item.id.startsWith("new")) {
                await setDoc(doc(db, "videos", item.id), data, { merge: true });
            } else {
                await addDoc(collection(db, "videos"), data);
            }
            return true;
        } catch (e) {
            console.error("Firestore video save error:", e);
        }
    }
    const current = await getVideos();
    if (item.id && !item.id.startsWith("new")) {
        const idx = current.findIndex(s => s.id === item.id);
        if (idx > -1) current[idx] = { ...current[idx], ...data };
    } else {
        const newId = "video_" + Date.now();
        current.unshift({ id: newId, ...data });
    }
    localStorage.setItem("pt_videos", JSON.stringify(current));
    triggerMockVideosChange();
    return true;
}

export async function deleteVideo(itemId) {
    if (useFirebase && db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "videos", itemId));
            return true;
        } catch (e) {
            console.error("Firestore video delete error:", e);
        }
    }
    const current = await getVideos();
    const filtered = current.filter(s => s.id !== itemId);
    localStorage.setItem("pt_videos", JSON.stringify(filtered));
    triggerMockVideosChange();
    return true;
}

export function getYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}


// F. AUTO BOOTSTRAPPING FOR FIREBASE
async function bootstrapFirebaseData() {
    if (!useFirebase || !db) return;
    
    try {
        const { doc, getDoc, setDoc, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        
        // 1. Settings Bootstrapping
        const settingsRef = doc(db, "settings", "global");
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
            await setDoc(settingsRef, defaultSettings);
            console.log("Firebase auto-bootstrap: Global settings initialized.");
        }
        
        // 2. Projects Bootstrapping
        const projectsCol = collection(db, "projects");
        const projectsSnap = await getDocs(projectsCol);
        if (projectsSnap.empty) {
            for (const proj of defaultProjects) {
                const { id, ...data } = proj;
                await setDoc(doc(db, "projects", id), data);
            }
            console.log("Firebase auto-bootstrap: Projects initialized.");
        }
        
        // 3. Highlights Bootstrapping
        const highlightsCol = collection(db, "highlights");
        const highlightsSnap = await getDocs(highlightsCol);
        if (highlightsSnap.empty) {
            for (const item of defaultHighlights) {
                const { id, ...data } = item;
                await setDoc(doc(db, "highlights", id), data);
            }
            console.log("Firebase auto-bootstrap: Highlights initialized.");
        }

        // 4. Posts Bootstrapping
        const postsCol = collection(db, "posts");
        const postsSnap = await getDocs(postsCol);
        if (postsSnap.empty) {
            for (const item of defaultPosts) {
                const { id, ...data } = item;
                await setDoc(doc(db, "posts", id), data);
            }
            console.log("Firebase auto-bootstrap: Posts initialized.");
        }

        // 5. Reels Bootstrapping
        const reelsCol = collection(db, "reels");
        const reelsSnap = await getDocs(reelsCol);
        if (reelsSnap.empty) {
            for (const item of defaultReels) {
                const { id, ...data } = item;
                await setDoc(doc(db, "reels", id), data);
            }
            console.log("Firebase auto-bootstrap: Reels initialized.");
        }

        // 6. Videos Bootstrapping
        const videosCol = collection(db, "videos");
        const videosSnap = await getDocs(videosCol);
        if (videosSnap.empty) {
            for (const item of defaultVideos) {
                const { id, ...data } = item;
                await setDoc(doc(db, "videos", id), data);
            }
            console.log("Firebase auto-bootstrap: Videos initialized.");
        }
    } catch (e) {
        console.error("Firebase auto-bootstrapping error:", e);
    }
}

