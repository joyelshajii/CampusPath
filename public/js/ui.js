'use strict';

// ─── UI Helpers ───────────────────────────────────────────
const UI = {
    // Toast notifications
    toast(msg, type = 'info', title = '') {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#0056D2',
        };
        const icons = {
            success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.success}" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
            error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.error}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.warning}" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
            info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.info}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.style.cssText = `display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: white; border-radius: 12px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-lg); margin-bottom: 12px; min-width: 320px; animation: slideIn 0.3s ease-out;`;

        t.innerHTML = `
            <div style="flex-shrink: 0; margin-top: 2px;">${icons[type] || icons.info}</div>
            <div class="toast-msg" style="flex: 1;">
                ${title ? `<div class="toast-title" style="font-weight: 700; font-size: 14px; color: var(--gray-900); margin-bottom: 2px;">${title}</div>` : ''}
                <div style="font-size: 13.5px; color: var(--gray-600); line-height: 1.4;">${msg}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" style="color: var(--gray-400); hover: color: var(--gray-600); transition: 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>`;
        document.getElementById('toast-container').appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(20px)';
            t.style.transition = '0.3s ease-in';
            setTimeout(() => t.remove(), 300);
        }, 4000);
    },

    // Modal
    showModal(title, bodyHTML, { wide = false } = {}) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHTML;
        const box = document.getElementById('modal-box');
        box.style.maxWidth = wide ? '800px' : '520px';
        box.style.borderRadius = '16px';
        box.style.overflow = 'hidden';
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('modal-body').innerHTML = '';
    },

    // Confirm dialog
    confirm(msg) { return window.confirm(msg); },

    // Loading state in page
    showLoader(el) {
        if (el) el.innerHTML = `<div class="page-loader" style="height: 300px;"><div class="spinner"></div></div>`;
    },

    // Empty state
    emptyState(icon, title, desc = '') {
        return `
        <div class="empty-state" style="padding: 64px 32px; text-align: center; background: white; border-radius: 16px; border: 1.5px dashed var(--gray-200);">
            <div style="color: var(--gray-300); margin-bottom: 20px; display: flex; justify-content: center;">${icon || '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>'}</div>
            <h4 style="font-size: 18px; font-weight: 700; color: var(--gray-900); margin-bottom: 8px;">${title}</h4>
            ${desc ? `<p style="font-size: 14px; color: var(--gray-500); max-width: 320px; margin: 0 auto; line-height: 1.5;">${desc}</p>` : ''}
        </div>`;
    },

    // Role badge
    roleBadge(role) {
        const labels = { admin: 'Admin', hod: 'HOD', coordinator: 'Coordinator', faculty: 'Faculty', student: 'Student' };
        const colors = {
            admin: 'background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;',
            hod: 'background: #fdf2f8; color: #9d174d; border: 1px solid #fbcfe8;',
            coordinator: 'background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;',
            faculty: 'background: #fffbeb; color: #92400e; border: 1px solid #fef3c7;',
            student: 'background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;',
        };
        return `<span class="role-badge" style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; ${colors[role] || ''}">${labels[role] || role}</span>`;
    },

    // Location type badge
    locTypeBadge(type) {
        const labels = { lab: 'Lab', classroom: 'Classroom', staff_room: 'Staff Room', auditorium: 'Auditorium', other: 'Other' };
        return `<span class="badge" style="background: var(--gray-100); color: var(--gray-700); border: 1px solid var(--gray-200); font-size: 11px; font-weight: 600;">${labels[type] || type}</span>`;
    },

    // Active/Inactive badge
    activeBadge(isActive) {
        return isActive
            ? `<span class="badge" style="background: #ecfdf5; color: #059669; border: 1px solid #10b98133; font-size: 11px; font-weight: 600;">● Active</span>`
            : `<span class="badge" style="background: #fef2f2; color: #dc2626; border: 1px solid #ef444433; font-size: 11px; font-weight: 600;">● Inactive</span>`;
    },

    // Avatar initials
    initials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    // Format date string to readable
    formatDate(d) {
        if (!d) return '';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    // Format time
    formatTime(t) {
        if (!t) return '';
        const [h, m] = t.split(':');
        const hour = parseInt(h);
        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    },

    // Location type icon SVG
    locIcon(type) {
        const icons = {
            lab: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`,
            classroom: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`,
            staff_room: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
            auditorium: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
        };
        return icons[type] || icons.classroom;
    },

    // Day label
    dayLabel(d) {
        const m = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
        return m[d] || d;
    },

    // Tabs
    initTabs(containerSel) {
        const container = document.querySelector(containerSel);
        if (!container) return;
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Deactivate all sibling buttons
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

                // Hide all panes (look globally for .tab-pane and remove active)
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                // Activate this button
                btn.classList.add('active');

                // Show the target pane by ID
                const targetId = btn.dataset.tab;
                const pane = document.getElementById(targetId);
                if (pane) {
                    pane.classList.add('active');
                    console.log(`[UI] Activated tab pane: #${targetId}`);
                } else {
                    console.warn(`[UI] Tab pane not found: #${targetId}`);
                }
            });
        });
        // Activate first tab
        const first = container.querySelector('.tab-btn');
        if (first) first.click();
    },
};

// ─── Global helpers ───────────────────────────────────────
function closeModal() { UI.closeModal(); }
function closeModalOnOverlay(e) { if (e.target === document.getElementById('modal-overlay')) UI.closeModal(); }

function togglePassword() {
    const inp = document.getElementById('login-password');
    inp.type = inp.type === 'password' ? 'text' : 'password';
}
