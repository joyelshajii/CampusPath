'use strict';

// ─── App State ────────────────────────────────────────────
let currentUser = null;
let currentPage = null;

// ─── Menu Definitions per Role ────────────────────────────
const MENUS = {
    student: [
        { id: 'findFaculty', label: 'Find Faculty & Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>` },
    ],
    faculty: [
        { id: 'findFaculty', label: 'Find Faculty & Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>` },
        { id: 'myAccount', label: 'Manage My Account', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>` },
        { id: 'mySchedule', label: 'My Schedule & Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
    ],
    coordinator: [
        { id: 'findFaculty', label: 'Find Faculty & Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>` },
        { id: 'manageTeachers', label: 'Manage Teachers & Schedules', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
        { id: 'manageStudents', label: 'Manage Students', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` },
        { id: 'manageLocations', label: 'Manage Dept Locations', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
        { id: 'manageEvents', label: 'Manage Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>` },
    ],
    hod: [
        { id: 'findFaculty', label: 'Find Faculty & Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>` },
        { id: 'manageTeachers', label: 'Manage Teachers & Schedules', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
        { id: 'manageCoordinators', label: 'Manage Coordinators', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/><path d="M19 11l2 2-4 4"/></svg>` },
        { id: 'manageStudents', label: 'Manage Students', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` },
        { id: 'manageLocations', label: 'Manage Dept Locations', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
        { id: 'manageEvents', label: 'Manage Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>` },
        {
            id: 'manageAccess', label: 'Manage Access', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
            sub: [
                { id: 'manageAccess_students', label: 'Student Access' },
                { id: 'manageAccess_teachers', label: 'Teacher Access' },
                { id: 'manageAccess_coordinators', label: 'Coordinator Access' },
            ]
        },
    ],
    admin: [
        { id: 'findFaculty', label: 'Find Faculty & Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>` },
        { id: 'manageDepartments', label: 'Manage Departments', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
        { id: 'manageHODs', label: 'Manage HODs', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>` },
        { id: 'manageCoordinators', label: 'Manage Coordinators', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/><path d="M19 11l2 2-4 4"/></svg>` },
        { id: 'manageTeachers', label: 'Manage Teachers & Schedules', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
        { id: 'manageStudents', label: 'Manage Students', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>` },
        { id: 'manageLocations', label: 'Manage Locations', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>` },
        { id: 'manageEvents', label: 'Manage All Events', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>` },
        {
            id: 'controlAccess', label: 'Control Overall Access', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
            sub: [
                { id: 'manageAccess_students', label: 'Student Access' },
                { id: 'manageAccess_teachers', label: 'Teacher Access' },
                { id: 'manageAccess_coordinators', label: 'Coordinator Access' },
                { id: 'manageAccess_hods', label: 'HOD Access' },
            ]
        },
    ],
};

// ─── Page Titles ──────────────────────────────────────────
const PAGE_TITLES = {
    findFaculty: 'Find Faculty & Events',
    myAccount: 'Manage My Account',
    mySchedule: 'My Schedule & Events',
    manageTeachers: 'Manage Teachers & Schedules',
    manageCoordinators: 'Manage Coordinators',
    manageStudents: 'Manage Students',
    manageLocations: 'Manage Locations',
    manageEvents: 'Manage Events',
    manageAccess: 'Manage Access',
    manageAccess_students: 'Student Access Management',
    manageAccess_teachers: 'Teacher Access Management',
    manageAccess_coordinators: 'Coordinator Access Management',
    manageAccess_hods: 'HOD Access Management',
    manageDepartments: 'Manage Departments',
    manageHODs: 'Manage HODs',
    controlAccess: 'Control Overall Access',
};

// ─── Login ────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Signing in...';
    try {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const data = await API.login(username, password);
        API.setToken(data.token);
        sessionStorage.setItem('cp_token', data.token);
        sessionStorage.setItem('cp_user', JSON.stringify(data.user));
        initApp(data.user);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Sign In';
    }
});

function quickLogin(u, p) {
    document.getElementById('login-username').value = u;
    document.getElementById('login-password').value = p;
    document.getElementById('login-form').requestSubmit();
}

// ─── App init ─────────────────────────────────────────────
function initApp(user) {
    currentUser = user;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    buildSidebar(user);
    startClock();
    navigateTo('findFaculty');
}

function doLogout() {
    sessionStorage.removeItem('cp_token');
    sessionStorage.removeItem('cp_user');
    API.clearToken();
    currentUser = null;
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').classList.add('hidden');
}

// ─── Sidebar Builder ──────────────────────────────────────
function buildSidebar(user) {
    // Avatar & name
    document.getElementById('user-avatar-sidebar').textContent = UI.initials(user.full_name);
    document.getElementById('user-name-sidebar').textContent = user.full_name;
    document.getElementById('user-role-sidebar').innerHTML = UI.roleBadge(user.role);
    document.getElementById('topbar-user').textContent = user.full_name;
    if (user.dept_name) {
        document.getElementById('sidebar-dept').innerHTML = `<strong>${user.dept_code}</strong> — ${user.dept_name}`;
    }

    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    const menus = MENUS[user.role] || [];

    menus.forEach(item => {
        const section = document.createElement('div');
        section.className = 'nav-section';
        if (item.sub) {
            // Item with submenu
            const parent = document.createElement('div');
            parent.className = 'nav-item';
            parent.id = `nav-${item.id}`;
            parent.innerHTML = `${item.icon}<span class="nav-label">${item.label}</span><svg class="nav-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
            const subEl = document.createElement('div');
            subEl.className = 'subnav hidden';
            subEl.id = `subnav-${item.id}`;
            item.sub.forEach(s => {
                const si = document.createElement('div');
                si.className = 'nav-item';
                si.id = `nav-${s.id}`;
                si.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/></svg><span class="nav-label">${s.label}</span>`;
                si.onclick = () => navigateTo(s.id);
                subEl.appendChild(si);
            });
            parent.onclick = (e) => {
                e.stopPropagation();
                const isOpen = !subEl.classList.contains('hidden');
                subEl.classList.toggle('hidden', isOpen);
                parent.classList.toggle('expanded', !isOpen);
            };
            section.appendChild(parent);
            section.appendChild(subEl);
        } else {
            const el = document.createElement('div');
            el.className = 'nav-item';
            el.id = `nav-${item.id}`;
            el.innerHTML = `${item.icon}<span class="nav-label">${item.label}</span>`;
            el.onclick = () => navigateTo(item.id);
            section.appendChild(el);
        }
        nav.appendChild(section);
    });

    // Sidebar toggle (collapse/expand on desktop)
    document.getElementById('sidebar-toggle').onclick = () => {
        const sidebar = document.getElementById('sidebar');
        const shell = document.getElementById('app-shell');
        sidebar.classList.toggle('collapsed');
        shell.classList.toggle('sidebar-collapsed');
    };
}

// ─── Navigation ───────────────────────────────────────────
async function navigateTo(pageId) {
    currentPage = pageId;
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${pageId}`);
    if (navEl) {
        navEl.classList.add('active');
        // Open parent subnav if needed
        const parent = navEl.closest('.subnav');
        if (parent) { parent.classList.remove('hidden'); parent.previousElementSibling?.classList.add('expanded'); }
    }
    // Update topbar title
    document.getElementById('topbar-title').textContent = PAGE_TITLES[pageId] || pageId;
    // Load page
    const content = document.getElementById('page-content');
    UI.showLoader(content);
    // Close mobile sidebar on navigation
    closeSidebar();
    try {
        await renderPage(pageId, content);
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><h4>Error loading page</h4><p>${err.message}</p></div>`;
    }
}

async function renderPage(pageId, container) {
    switch (pageId) {
        case 'findFaculty': await Pages.findFaculty(container); break;
        case 'myAccount': await Pages.myAccount(container); break;
        case 'mySchedule': await Pages.mySchedule(container); break;
        case 'manageTeachers': await Pages.manageTeachers(container); break;
        case 'manageCoordinators': await Pages.manageUsers(container, 'coordinator', 'Coordinators'); break;
        case 'manageStudents': await Pages.manageUsers(container, 'student', 'Students'); break;
        case 'manageLocations': await Pages.manageLocations(container); break;
        case 'manageEvents': await Pages.manageEvents(container); break;
        case 'manageAccess_students': await Pages.manageAccess(container, 'student'); break;
        case 'manageAccess_teachers': await Pages.manageAccess(container, 'faculty'); break;
        case 'manageAccess_coordinators': await Pages.manageAccess(container, 'coordinator'); break;
        case 'manageAccess_hods': await Pages.manageAccess(container, 'hod'); break;
        case 'manageDepartments': await Pages.manageDepartments(container); break;
        case 'manageHODs': await Pages.manageUsers(container, 'hod', 'HODs'); break;
        case 'controlAccess': await Pages.manageAccess(container, 'all'); break;
        default: container.innerHTML = `<div class="empty-state"><h4>Page not found</h4></div>`;
    }
}

// ─── Clock ────────────────────────────────────────────────
function startClock() {
    function tick() {
        const now = new Date();
        const istOffset = 5 * 60 + 30;
        const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
        const istMin = (utcMin + istOffset) % (24 * 60);
        const h = Math.floor(istMin / 60), m = istMin % 60;
        const hh = h > 12 ? h - 12 : h || 12;
        const mm = String(m).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const istDate = new Date(now.getTime() + istOffset * 60000);
        const day = days[istDate.getUTCDay()];
        document.getElementById('topbar-time').textContent = `${day}, ${hh}:${mm} ${ampm} IST`;
    }
    tick();
    setInterval(tick, 30000);
}

// ─── Mobile Sidebar ───────────────────────────────────────
function openSidebar() {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('sidebar-overlay').classList.add('visible');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
}

// ─── Pages namespace ──────────────────────────────────────
const Pages = {};

// ─── Session restore (sessionStorage only — never persists across browser restarts) ──
(function () {
    const token = sessionStorage.getItem('cp_token');
    const userStr = sessionStorage.getItem('cp_user');
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            API.setToken(token);
            initApp(user);
        } catch { sessionStorage.clear(); }
    }
})();
