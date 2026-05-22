// Application State
let courseData = { modules: [] };
let currentLessonId = null;
const expandedModules = new Set();
let videoServerUrl = localStorage.getItem('primeVideoServerUrl') || '';

// DOM Elements
const curriculumList = document.getElementById('curriculum-list');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const lessonInfoTitle = document.getElementById('lesson-info-title');
const lessonDescription = document.getElementById('lesson-description');
const markCompleteBtn = document.getElementById('mark-complete-btn');
const videoPlayer = document.getElementById('video-player');

// Fetch course data and Initialize App
async function fetchCourseDataAndInit() {
    try {
        const response = await fetch('course_data.json');
        courseData = await response.json();
        
        // Load saved progress from localStorage
        loadProgress();
        
        // Set first lesson as current
        if (courseData.modules.length > 0) {
            expandedModules.add(courseData.modules[0].id); // Open first module by default
            if (courseData.modules[0].lessons.length > 0) {
                currentLessonId = courseData.modules[0].lessons[0].id;
            }
        }

        initApp();
    } catch (error) {
        console.error("Failed to load course data:", error);
    }
}

// Persist Progress
function saveProgress() {
    const completedIds = [];
    courseData.modules.forEach(module => {
        module.lessons.forEach(lesson => {
            if (lesson.completed) completedIds.push(lesson.id);
        });
    });
    localStorage.setItem('primeLearningProgress', JSON.stringify(completedIds));
}

function loadProgress() {
    const savedProgress = localStorage.getItem('primeLearningProgress');
    if (savedProgress) {
        try {
            const completedIds = JSON.parse(savedProgress);
            courseData.modules.forEach(module => {
                module.lessons.forEach(lesson => {
                    if (completedIds.includes(lesson.id)) {
                        lesson.completed = true;
                    }
                });
            });
        } catch (e) {
            console.error("Failed to load progress", e);
        }
    }
}

function initApp() {
    renderCurriculum();
    if (currentLessonId) {
        loadLesson(currentLessonId);
    }
    updateProgress();
    
    // Event listener for mark complete button (remove old ones first to prevent duplicates if initApp called multiple times)
    markCompleteBtn.removeEventListener('click', toggleLessonCompletion);
    markCompleteBtn.addEventListener('click', toggleLessonCompletion);

    // Setup Video Server Input
    const videoServerInput = document.getElementById('video-server-url');
    if (videoServerInput) {
        videoServerInput.value = videoServerUrl;
        // Bind input event to save URL and reload current video dynamically
        videoServerInput.replaceWith(videoServerInput.cloneNode(true));
        const newInput = document.getElementById('video-server-url');
        newInput.addEventListener('input', (e) => {
            let val = e.target.value.trim();
            if (val.endsWith('/')) {
                val = val.slice(0, -1);
            }
            videoServerUrl = val;
            localStorage.setItem('primeVideoServerUrl', videoServerUrl);
            if (currentLessonId) {
                loadLesson(currentLessonId);
            }
        });
    }
}

// Find lesson by ID
function findLesson(lessonId) {
    for (const module of courseData.modules) {
        const lesson = module.lessons.find(l => l.id === lessonId);
        if (lesson) return { lesson, module };
    }
    return null;
}

// Render the sidebar curriculum
function renderCurriculum() {
    curriculumList.innerHTML = '';
    
    courseData.modules.forEach(module => {
        // Check if all lessons are completed
        const allCompleted = module.lessons.length > 0 && module.lessons.every(l => l.completed);

        // Create module header
        const moduleHeader = document.createElement('div');
        moduleHeader.className = `module-header ${expandedModules.has(module.id) ? 'open' : ''}`;
        
        moduleHeader.innerHTML = `
            <div class="module-header-left">
                <i class="fa-solid fa-chevron-right module-arrow"></i>
                <span class="module-title-text">${module.title}</span>
            </div>
            <i class="fa-solid fa-circle-check module-completed-icon ${allCompleted ? 'visible' : ''}" title="Module Completed"></i>
        `;
        
        // Toggle expanded state
        moduleHeader.addEventListener('click', () => {
            if (expandedModules.has(module.id)) {
                expandedModules.delete(module.id);
            } else {
                expandedModules.add(module.id);
            }
            renderCurriculum();
        });
        
        curriculumList.appendChild(moduleHeader);
        
        // Create lessons container
        const lessonsContainer = document.createElement('div');
        lessonsContainer.className = `module-lessons ${expandedModules.has(module.id) ? 'open' : ''}`;
        
        // Create lesson items
        module.lessons.forEach(lesson => {
            const lessonItem = document.createElement('div');
            lessonItem.className = `lesson-item ${lesson.id === currentLessonId ? 'active' : ''} ${lesson.completed ? 'completed' : ''}`;
            lessonItem.dataset.id = lesson.id;
            
            lessonItem.innerHTML = `
                <div class="lesson-status">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="lesson-details">
                    <div class="lesson-name">${lesson.title}</div>
                    <div class="lesson-duration">
                        <i class="fa-regular fa-clock"></i> ${lesson.duration}
                    </div>
                </div>
            `;
            
            lessonItem.addEventListener('click', () => loadLesson(lesson.id));
            lessonsContainer.appendChild(lessonItem);
        });
        
        curriculumList.appendChild(lessonsContainer);
    });
}

// Load a specific lesson into the main view
function loadLesson(lessonId) {
    currentLessonId = lessonId;
    const data = findLesson(lessonId);
    if (!data) return;
    
    const { lesson } = data;
    
    // Update DOM texts
    lessonInfoTitle.textContent = lesson.title;
    lessonDescription.innerHTML = `<p>${lesson.description}</p>`;
    
    // Inject Video Player
    if (lesson.videoSrc) {
        const resolvedSrc = videoServerUrl ? `${videoServerUrl}/${lesson.videoSrc}` : lesson.videoSrc;
        videoPlayer.innerHTML = `
            <video id="plyr-video" controls playsinline style="width: 100%; height: 100%; object-fit: contain; background: #000;">
                <source src="${encodeURI(resolvedSrc)}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
        // Initialize Plyr
        new Plyr('#plyr-video', {
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
            settings: ['captions', 'quality', 'speed', 'loop']
        });
    } else {
        videoPlayer.innerHTML = `
            <div class="video-placeholder">
                <i class="fa-regular fa-circle-play fa-4x"></i>
                <h2 id="current-lesson-title">${lesson.title}</h2>
                <p>No video available</p>
            </div>
        `;
    }

    // Update button state
    updateCompleteButton(lesson.completed);
    
    // Re-render sidebar to update active state
    renderCurriculum();
}

// Toggle completion status
function toggleLessonCompletion() {
    const data = findLesson(currentLessonId);
    if (!data) return;
    
    // Toggle state
    data.lesson.completed = !data.lesson.completed;
    saveProgress(); // Save to localStorage
    
    // Update UI
    updateCompleteButton(data.lesson.completed);
    renderCurriculum();
    updateProgress();
    
    if (data.lesson.completed) {
        createConfetti();
    }
}

function updateCompleteButton(isCompleted) {
    if (isCompleted) {
        markCompleteBtn.classList.add('is-completed');
        markCompleteBtn.innerHTML = `<i class="fa-solid fa-check-circle"></i> Completed`;
    } else {
        markCompleteBtn.classList.remove('is-completed');
        markCompleteBtn.innerHTML = `<i class="fa-solid fa-check"></i> Mark as Completed`;
    }
}

// Calculate and update progress
function updateProgress() {
    let totalLessons = 0;
    let completedLessons = 0;
    
    courseData.modules.forEach(module => {
        module.lessons.forEach(lesson => {
            totalLessons++;
            if (lesson.completed) completedLessons++;
        });
    });
    
    const percentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    
    progressBar.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
}

// Fun little confetti effect for completing a lesson
function createConfetti() {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.zIndex = '9999';
        confetti.style.pointerEvents = 'none';
        
        document.body.appendChild(confetti);
        
        const animation = confetti.animate([
            { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: 1 },
            { transform: `translate3d(${Math.random() * 200 - 100}px, 100vh, 0) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: Math.random() * 1000 + 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => confetti.remove();
    }
}

// Login Logic
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');

if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();
        
        console.log("Login attempt with:", usernameInput);

        if (usernameInput === 'dharunthandesh' && passwordInput === 'Dharun@123') {
            console.log("Credentials match!");
            loginError.textContent = '';
            loginScreen.classList.remove('active');
            loginScreen.style.display = 'none'; // Ensure it's hidden
            appContainer.style.display = 'flex';
            
            // Start the app which fetches the JSON and loads UI
            fetchCourseDataAndInit();
        } else {
            console.log("Credentials failed.");
            loginError.textContent = 'Invalid username or password.';
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        appContainer.style.display = 'none';
        loginScreen.style.display = 'flex';
        // Add a slight delay for transition
        setTimeout(() => loginScreen.classList.add('active'), 50);
        document.getElementById('password').value = '';
    });
}
