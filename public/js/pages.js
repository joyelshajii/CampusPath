'use strict';

// ══════════════════════════════════════════════════════════
// FIND FACULTY & EVENTS — TABBED INTERFACE
// ══════════════════════════════════════════════════════════
Pages.findFaculty = async function (container) {
  container.innerHTML = `
    <div class="hero-section" style="background: white; padding: 40px 32px; border-radius: var(--radius); border: 1px solid var(--gray-200); margin-bottom: 24px; text-align: center; box-shadow: var(--shadow-sm);">
      <h1 style="font-size: 30px; font-weight: 800; color: var(--gray-900); letter-spacing: -1px; margin-bottom: 6px;">Find Faculty & Events</h1>
      <p style="font-size: 15px; color: var(--gray-500);">Real-time faculty locations and upcoming campus events.</p>
    </div>

    <!-- Tabs -->
    <div class="ff-tabs" id="ff-tab-bar">
      <button class="ff-tab active" id="tab-faculty-btn" onclick="switchFFTab('faculty')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        Live Faculty Locations
      </button>
      <button class="ff-tab" id="tab-events-btn" onclick="switchFFTab('events')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Today's Events
      </button>
    </div>

    <!-- Faculty Tab -->
    <div id="ff-pane-faculty" class="ff-pane active">
      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:center;">
        <div class="search-input-wrap" style="flex:1; min-width:200px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="left:14px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="fac-search" placeholder="Search by name, location, or subject..." oninput="filterFaculty(this.value)" style="height:48px; font-size:15px; padding-left:44px; border-radius:10px; border:1.5px solid var(--gray-200); width:100%; transition:var(--transition);"/>
        </div>
        <select id="fac-filter" onchange="filterFaculty(document.getElementById('fac-search').value)" style="height:48px; min-width:160px; padding:0 14px; border:1.5px solid var(--gray-200); border-radius:10px; font-size:14px; font-weight:500; background:white; cursor:pointer;">
          <option value="">All Status</option>
          <option value="in_class">In Class</option>
          <option value="in_staff_room">In Staff Room</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="Pages.findFaculty(document.getElementById('page-content'))" style="height:48px; padding:0 16px; border-radius:10px; white-space:nowrap;">↻ Refresh</button>
      </div>
      <div id="faculty-grid" class="faculty-grid"></div>
    </div>

    <!-- Events Tab -->
    <div id="ff-pane-events" class="ff-pane" style="display:none;">
      <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:center;">
        <div class="search-input-wrap" style="flex:1; min-width:200px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="left:14px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" id="event-search" placeholder="Search events by name or location..." oninput="filterEvents(this.value)" style="height:48px; font-size:15px; padding-left:44px; border-radius:10px; border:1.5px solid var(--gray-200); width:100%; transition:var(--transition);"/>
        </div>
      </div>
      <div id="events-list" class="events-list"></div>
    </div>

    <!-- Focus Modal (Faculty/Event card click) -->
    <div id="ff-focus-overlay" style="display:none; position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.45); backdrop-filter:blur(6px); align-items:center; justify-content:center; padding:20px;" onclick="closeFocusModal(event)">
      <div id="ff-focus-box" style="background:white; border-radius:20px; max-width:540px; width:100%; max-height:85vh; overflow-y:auto; box-shadow:0 25px 60px rgba(0,0,0,0.2); position:relative; animation: focusIn 0.25s ease-out;">
        <button onclick="closeFocusModal(null,true)" style="position:absolute; top:16px; right:16px; background:var(--gray-100); border:none; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:1;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div id="ff-focus-content" style="padding:28px;"></div>
      </div>
    </div>`;

  window._allFaculty = [];
  window._allEvents = [];

  // Load faculty
  try {
    const data = await API.getFaculty();
    window._allFaculty = data.faculty || [];
    renderFacultyGrid(window._allFaculty);
  } catch (e) {
    document.getElementById('faculty-grid').innerHTML = UI.emptyState('', 'Error loading faculty', e.message);
  }

  // Load events
  try {
    const events = await API.getEvents({ upcoming: 'true' });
    window._allEvents = events;
    renderEventsList(events, document.getElementById('events-list'), false);
  } catch (e) {
    document.getElementById('events-list').innerHTML = `<p style="color:var(--red-500)">${e.message}</p>`;
  }
};

window.switchFFTab = function (tab) {
  const isFaculty = tab === 'faculty';
  document.getElementById('tab-faculty-btn').classList.toggle('active', isFaculty);
  document.getElementById('tab-events-btn').classList.toggle('active', !isFaculty);
  document.getElementById('ff-pane-faculty').style.display = isFaculty ? '' : 'none';
  document.getElementById('ff-pane-events').style.display = isFaculty ? 'none' : '';
};

window.filterFaculty = function (q) {
  const filter = document.getElementById('fac-filter')?.value || '';
  const all = window._allFaculty || [];
  const lower = q.toLowerCase();
  const filtered = all.filter(f => {
    const matchQ = !q || f.full_name.toLowerCase().includes(lower) || (f.current_location || '').toLowerCase().includes(lower) || (f.subject || '').toLowerCase().includes(lower);
    const matchF = !filter || f.status === filter;
    return matchQ && matchF;
  });
  renderFacultyGrid(filtered);
};

window.filterEvents = function (q) {
  const all = window._allEvents || [];
  const lower = q.toLowerCase();
  const filtered = all.filter(ev =>
    !q || ev.event_name.toLowerCase().includes(lower) || (ev.location_name || '').toLowerCase().includes(lower) || (ev.building || '').toLowerCase().includes(lower)
  );
  renderEventsList(filtered, document.getElementById('events-list'), false);
};

function renderFacultyGrid(list) {
  const grid = document.getElementById('faculty-grid');
  if (!list || !list.length) {
    grid.innerHTML = UI.emptyState(
      `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
      'No faculty members found', 'Try adjusting your search or filters'
    );
    return;
  }

  grid.innerHTML = list.map(f => {
    const isClass = f.status === 'in_class';
    const initials = f.full_name ? f.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
    return `<div class="faculty-card ${f.status}" onclick="openFacultyFocusModal(${f.faculty_id})" style="cursor:pointer;">
      <div class="fc-top">
        <div class="fc-avatar">${initials}</div>
        <div class="fc-info">
          <div class="fc-name" title="${f.full_name}">${f.full_name}</div>
          <div class="fc-designation">${f.designation || 'Faculty'}</div>
          <div class="fc-dept">${f.dept_code} — ${f.dept_name}</div>
        </div>
      </div>
      <div class="fc-status">
        <div class="status-dot"></div>
        <div style="flex:1;">
          <div class="fc-loc-name">${f.current_location || 'Location Unknown'}</div>
          <div class="fc-loc-sub">${f.current_building ? f.current_building + (f.current_floor ? ', ' + f.current_floor : '') : 'Building info unavailable'}</div>
          ${isClass ? `
            <div class="fc-subject" style="margin-top:8px;">
              <span style="display:block;font-size:13px;font-weight:700;">${f.subject}</span>
              <span style="font-size:12px;color:var(--gray-500);font-weight:500;">${f.slot_label} · ${f.time_range}</span>
            </div>
          ` : `<div style="margin-top:8px;font-size:13px;color:var(--success);font-weight:600;">Available for meetings</div>`}
        </div>
      </div>
      <div class="fc-nav">
        <div class="fc-nav-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
          Navigation Guide
        </div>
        <div class="fc-nav-text">${f.nav_guide || 'Contact the department office for directions.'}</div>
      </div>
      <div style="margin-top:12px; text-align:center; font-size:12px; color:var(--primary); font-weight:600; opacity:0.7;">Click to focus ↗</div>
    </div>`;
  }).join('');
}

window.openFacultyFocusModal = function (facId) {
  const f = (window._allFaculty || []).find(x => x.faculty_id === facId);
  if (!f) return;
  const isClass = f.status === 'in_class';
  const initials = f.full_name ? f.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
  document.getElementById('ff-focus-content').innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;margin:0 auto 12px;">${initials}</div>
      <div style="font-size:20px;font-weight:800;color:var(--gray-900);">${f.full_name}</div>
      <div style="font-size:14px;color:var(--gray-500);margin-top:4px;">${f.designation || 'Faculty'}</div>
      <div style="margin-top:8px;">${UI.roleBadge(f.role || 'faculty')}</div>
    </div>
    <div style="background:var(--gray-50);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Current Location</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${isClass ? 'var(--primary)' : 'var(--success)'};flex-shrink:0;"></span>
        <span style="font-size:15px;font-weight:700;color:var(--gray-900);">${f.current_location || 'Unknown'}</span>
      </div>
      ${f.current_building ? `<div style="font-size:13px;color:var(--gray-500);margin-left:18px;">${f.current_building}${f.current_floor ? ', ' + f.current_floor : ''}</div>` : ''}
      ${isClass ? `<div style="margin-top:10px;padding:10px;background:white;border-radius:8px;border:1px solid var(--gray-200);">
        <div style="font-size:13px;font-weight:700;color:var(--gray-900);">${f.subject}</div>
        <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${f.slot_label} · ${f.time_range}</div>
      </div>` : `<div style="margin-top:10px;font-size:13px;color:var(--success);font-weight:600;">✓ Available for meetings</div>`}
    </div>
    <div style="background:var(--gray-50);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Navigation Guide</div>
      <div style="font-size:13px;color:var(--gray-700);line-height:1.6;">${f.nav_guide || 'Follow campus signage or contact department office.'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div style="background:var(--gray-50);border-radius:10px;padding:12px;">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Department</div>
        <div style="font-size:13px;font-weight:600;color:var(--gray-800);">${f.dept_name}</div>
      </div>
      ${f.email ? `<div style="background:var(--gray-50);border-radius:10px;padding:12px;">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Email</div>
        <div style="font-size:13px;font-weight:600;color:var(--gray-800);word-break:break-all;">${f.email}</div>
      </div>` : ''}
      ${f.phone ? `<div style="background:var(--gray-50);border-radius:10px;padding:12px;">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Phone</div>
        <div style="font-size:13px;font-weight:600;color:var(--gray-800);">${f.phone}</div>
      </div>` : ''}
    </div>`;
  const overlay = document.getElementById('ff-focus-overlay');
  overlay.style.display = 'flex';
};

window.openEventFocusModal = function (evId) {
  const ev = (window._allEvents || []).find(x => x.event_id === evId);
  if (!ev) return;
  const d = new Date(ev.event_date + 'T00:00:00');
  const day = d.getDate();
  const monthFull = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  document.getElementById('ff-focus-content').innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,var(--primary),#4F46E5);color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 12px;">
        <div style="font-size:24px;font-weight:800;line-height:1;">${day}</div>
        <div style="font-size:10px;font-weight:700;opacity:0.85;">${d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</div>
      </div>
      <div style="font-size:20px;font-weight:800;color:var(--gray-900);">${ev.event_name}</div>
      <div style="font-size:13px;color:var(--gray-500);margin-top:4px;">${monthFull}</div>
    </div>
    ${ev.description ? `<div style="background:var(--gray-50);border-radius:12px;padding:16px;margin-bottom:16px;font-size:14px;color:var(--gray-700);line-height:1.6;">${ev.description}</div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:var(--gray-50);border-radius:10px;padding:12px;">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Time</div>
        <div style="font-size:14px;font-weight:700;color:var(--gray-900);">${UI.formatTime(ev.start_time)} – ${UI.formatTime(ev.end_time)}</div>
      </div>
      <div style="background:var(--gray-50);border-radius:10px;padding:12px;">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Department</div>
        <div style="font-size:14px;font-weight:700;color:var(--gray-900);">${ev.dept_name || 'All Departments'}</div>
      </div>
      ${ev.location_name ? `<div style="background:var(--gray-50);border-radius:10px;padding:12px;grid-column:span 2;">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Venue</div>
        <div style="font-size:14px;font-weight:700;color:var(--gray-900);">${ev.location_name}${ev.building ? ' · ' + ev.building : ''}</div>
      </div>` : ''}
    </div>`;
  const overlay = document.getElementById('ff-focus-overlay');
  overlay.style.display = 'flex';
};

window.closeFocusModal = function (event, force) {
  if (force || !event || event.target === document.getElementById('ff-focus-overlay')) {
    document.getElementById('ff-focus-overlay').style.display = 'none';
  }
};

function renderEventsList(events, el, showActions) {
  if (!events.length) {
    el.innerHTML = UI.emptyState(
      `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'No upcoming events', 'Check back later for campus events.'
    );
    return;
  }

  el.innerHTML = events.map(ev => {
    // Robust date parsing (YYYY-MM-DD -> Date object) to avoid NaN in some browsers
    const [y, m, dayNum] = ev.event_date.split('-').map(Number);
    const d = new Date(y, m - 1, dayNum);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
    const actions = showActions ? `
      <div class="event-actions" style="margin-left:auto; display:flex; gap:8px; flex-shrink:0;">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editEventModal(${ev.event_id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteEventAction(${ev.event_id})">Delete</button>
      </div>` : '';

    return `
    <div class="event-card" style="display:flex; gap:20px; padding:20px; align-items:center; cursor:pointer; transition:var(--transition);" onclick="openEventFocusModal(${ev.event_id})">
      <div class="event-date-badge" style="width:60px;height:60px;background:var(--gray-50);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--gray-100);flex-shrink:0;">
        <div style="font-size:20px;font-weight:800;color:var(--gray-900);line-height:1;">${day}</div>
        <div style="font-size:11px;font-weight:700;color:var(--primary);margin-top:2px;">${month}</div>
      </div>
      <div class="event-info" style="flex:1;">
        <div style="font-size:17px;font-weight:700;color:var(--gray-900);">${ev.event_name}</div>
        ${ev.description ? `<div style="font-size:14px;color:var(--gray-500);margin-top:4px;">${ev.description}</div>` : ''}
        <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--gray-600);font-weight:500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${UI.formatTime(ev.start_time)} – ${UI.formatTime(ev.end_time)}
          </div>
          ${ev.location_name ? `<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--gray-600);font-weight:500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${ev.location_name}${ev.building ? ' · ' + ev.building : ''}
          </div>` : ''}
          <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--gray-600);font-weight:500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            ${ev.dept_name || 'All Departments'}
          </div>
        </div>
      </div>
      ${actions}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// MY ACCOUNT (Faculty)
// ══════════════════════════════════════════════════════════
Pages.myAccount = async function (container) {
  let facData, locations;
  try {
    [facData, locations] = await Promise.all([
      API.getUser(currentUser.user_id),
      API.getLocations(currentUser.dept_id)
    ]);
  } catch (e) { container.innerHTML = UI.emptyState('', 'Error', e.message); return; }

  const staffRooms = locations.filter(l => l.location_type === 'staff_room');
  container.innerHTML = `
    <div class="page-header"><h2>My Account</h2><p>Update your profile and default staff room</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px">
      <div class="card">
        <div class="card-header"><span class="card-title">Personal Info</span></div>
        <div class="card-body">
          <form id="account-form">
            <div class="form-group"><label>Full Name</label><input id="acc-name" value="${facData.full_name || ''}" placeholder="Full name"/></div>
            <div class="form-group"><label>Email</label><input id="acc-email" type="email" value="${facData.email || ''}" placeholder="Email"/></div>
            <div class="form-group"><label>Phone</label><input id="acc-phone" value="${facData.phone || ''}" placeholder="Phone number"/></div>
            <div class="form-group"><label>Designation</label><input id="acc-designation" value="${facData.designation || ''}" placeholder="e.g. Assistant Professor"/></div>
            <div class="form-group"><label>Default Staff Room</label>
              <select id="acc-room">${staffRooms.map(l => `<option value="${l.location_id}" ${l.location_id == facData.default_room_id ? 'selected' : ''}>${l.location_name} — ${l.building || ''} ${l.floor || ''}</option>`).join('')}</select>
            </div>
            <div class="form-actions"><button type="submit" class="btn btn-primary">Save Changes</button></div>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Change Password</span></div>
        <div class="card-body">
          <form id="pw-form">
            <div class="form-group"><label>New Password</label><input id="acc-pw" type="password" placeholder="Enter new password"/></div>
            <div class="form-group"><label>Confirm Password</label><input id="acc-pw2" type="password" placeholder="Confirm new password"/></div>
            <div class="form-actions"><button type="submit" class="btn btn-warning">Update Password</button></div>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('account-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await API.updateUser(currentUser.user_id, {
        full_name: document.getElementById('acc-name').value,
        email: document.getElementById('acc-email').value,
        phone: document.getElementById('acc-phone').value,
        designation: document.getElementById('acc-designation').value,
        default_room_id: document.getElementById('acc-room').value,
      });
      UI.toast('Profile updated successfully!', 'success');
      currentUser.full_name = document.getElementById('acc-name').value;
      localStorage.setItem('cp_user', JSON.stringify(currentUser));
      document.getElementById('user-name-sidebar').textContent = currentUser.full_name;
      document.getElementById('topbar-user').textContent = currentUser.full_name;
      document.getElementById('user-avatar-sidebar').textContent = UI.initials(currentUser.full_name);
    } catch (err) { UI.toast(err.message, 'error'); }
  };

  document.getElementById('pw-form').onsubmit = async (e) => {
    e.preventDefault();
    const pw = document.getElementById('acc-pw').value;
    const pw2 = document.getElementById('acc-pw2').value;
    if (pw !== pw2) { UI.toast('Passwords do not match', 'error'); return; }
    if (pw.length < 4) { UI.toast('Password must be at least 4 characters', 'error'); return; }
    try {
      await API.updateUser(currentUser.user_id, { password: pw });
      UI.toast('Password updated!', 'success');
      document.getElementById('pw-form').reset();
    } catch (err) { UI.toast(err.message, 'error'); }
  };
};

// ══════════════════════════════════════════════════════════
// MY SCHEDULE & EVENTS (Faculty)
// ══════════════════════════════════════════════════════════
Pages.mySchedule = async function (container) {
  container.innerHTML = `
    <div class="page-header"><div class="page-header-row"><div><h2>My Schedule & Events</h2><p>View and manage your timetable and events</p></div><button class="btn btn-primary" onclick="showAddScheduleModal()">+ Add Period</button></div></div>
    <div class="tabs" id="schedule-tabs">
      <button class="tab-btn" data-tab="tab-timetable">My Timetable</button>
      <button class="tab-btn" data-tab="tab-events">My Events</button>
    </div>
    <div id="tab-timetable" class="tab-pane"><div id="sched-table-wrap"></div></div>
    <div id="tab-events" class="tab-pane">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary" onclick="showAddEventModal()">+ Add Event</button></div>
      <div id="my-events-list" class="events-list"></div>
    </div>`;
  UI.initTabs('#schedule-tabs');
  await loadMySchedule();
  await loadMyEvents();
};

async function loadMySchedule() {
  const wrap = document.getElementById('sched-table-wrap');
  if (!wrap) return;
  try {
    // Single self-resolving call — backend uses JWT to look up faculty_id
    const data = await API.getMySchedule();
    const schedule = data.schedule || [];
    const facId = data.faculty_id;
    if (!facId) { wrap.innerHTML = UI.emptyState('', 'No faculty record found', 'Your account may not have a faculty profile linked.'); return; }
    const slots = await API.getSlots();
    renderTimetable(schedule, slots, wrap, facId, true);
  } catch (e) { wrap.innerHTML = UI.emptyState('', 'Error loading timetable', e.message); }
}

function renderTimetable(schedule, slots, wrap, facId, canDelete) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDaySlot = {};
  schedule.forEach(s => {
    const k = `${s.day_of_week}_${s.slot_label}`;
    byDaySlot[k] = s;
  });

  wrap.innerHTML = `<div class="timetable-wrap"><table class="table-wrap timetable schedule-table" style="border:none">
    <thead><tr><th>Time Slot</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead>
    <tbody>${slots.map(slot => `<tr>
      <td><div style="font-weight:700;font-size:12px">${slot.slot_label}</div><div style="font-size:11px;color:var(--gray-400)">${slot.start_time}–${slot.end_time}</div></td>
      ${days.map(day => {
    const s = byDaySlot[`${day}_${slot.slot_label}`];
    if (s) return `<td><div class="sched-cell">
          <div>${s.subject}</div>
          <div class="sched-sub">${s.location_name}</div>
          ${canDelete ? `<button style="font-size:10px;color:var(--red-500);margin-top:2px;background:none;border:none;cursor:pointer" onclick="deleteScheduleItem(${s.schedule_id})">✕ Remove</button>` : ''}
        </div></td>`;
    return `<td><span class="sched-cell-free">—</span></td>`;
  }).join('')}
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function loadMyEvents() {
  const el = document.getElementById('my-events-list');
  if (!el) return;
  try {
    let events;
    if (currentUser.role === 'faculty') {
      // Faculty see ALL their own events (created_by filter) with full CRUD
      events = await API.getMyEvents(currentUser.user_id);
    } else {
      // Others see upcoming dept events
      events = await API.getEvents({ upcoming: 'true', ...(currentUser.dept_id ? { dept_id: currentUser.dept_id } : {}) });
    }
    // Faculty always get edit/delete on their own events; others based on role
    renderEventsList(events, el, currentUser.role !== 'student');
  } catch (e) { if (el) el.innerHTML = UI.emptyState('', 'Error loading events', e.message); }
}

window.deleteScheduleItem = async function (sid) {
  if (!UI.confirm('Remove this schedule entry?')) return;
  try { await API.delSchedule(sid); UI.toast('Removed', 'success'); await loadMySchedule(); }
  catch (e) { UI.toast(e.message, 'error'); }
};

window.showAddScheduleModal = async function (facId) {
  let fid = facId;
  if (!fid) {
    const me = await API.getUser(currentUser.user_id);
    fid = me.faculty_id;
  }
  const [slots, locations] = await Promise.all([API.getSlots(), API.getLocations(currentUser.dept_id)]);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  UI.showModal('Add Schedule Entry', `
    <div class="form-group"><label>Day</label><select id="sched-day">${days.map(d => `<option>${d}</option>`).join('')}</select></div>
    <div class="form-group"><label>Time Slot</label><select id="sched-slot">${slots.map(s => `<option value="${s.slot_id}">${s.slot_label} (${s.start_time}–${s.end_time})</option>`).join('')}</select></div>
    <div class="form-group"><label>Location</label><select id="sched-loc">${locations.map(l => `<option value="${l.location_id}">${l.location_name} — ${l.location_type}</option>`).join('')}</select></div>
    <div class="form-group"><label>Subject</label><input id="sched-sub" placeholder="e.g. Data Structures"/></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitSchedule(${fid})">Add</button>
    </div>`);
};

window.submitSchedule = async function (fid) {
  const body = { day_of_week: document.getElementById('sched-day').value, slot_id: document.getElementById('sched-slot').value, location_id: document.getElementById('sched-loc').value, subject: document.getElementById('sched-sub').value };
  try { await API.addSchedule(fid, body); closeModal(); UI.toast('Schedule added!', 'success'); if (currentPage === 'mySchedule') await loadMySchedule(); else await loadTeacherSchedule(fid); }
  catch (e) { UI.toast(e.message, 'error'); }
};

window.showAddEventModal = async function (eventData) {
  const locations = await API.getLocations(currentUser.dept_id);
  const ev = eventData || {};
  const isEdit = !!ev.event_id;
  UI.showModal(isEdit ? 'Edit Event' : 'Add Event', `
    <div class="form-group"><label>Event Name</label><input id="ev-name" value="${ev.event_name || ''}" placeholder="Event name"/></div>
    <div class="form-group"><label>Description</label><textarea id="ev-desc">${ev.description || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Date</label><input id="ev-date" type="date" value="${ev.event_date || ''}"/></div>
      <div class="form-group"><label>Start Time</label><input id="ev-start" type="time" value="${ev.start_time || ''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>End Time</label><input id="ev-end" type="time" value="${ev.end_time || ''}"/></div>
      <div class="form-group"><label>Location</label><select id="ev-loc"><option value="">— Select Location —</option>${locations.map(l => `<option value="${l.location_id}" ${l.location_id == ev.location_id ? 'selected' : ''}>${l.location_name}</option>`).join('')}</select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEvent(${ev.event_id || 'null'})">${isEdit ? 'Update' : 'Create'} Event</button>
    </div>`);
};

window.submitEvent = async function (eventId) {
  const body = { event_name: document.getElementById('ev-name').value, description: document.getElementById('ev-desc').value, event_date: document.getElementById('ev-date').value, start_time: document.getElementById('ev-start').value, end_time: document.getElementById('ev-end').value, location_id: document.getElementById('ev-loc').value || null };
  try {
    if (eventId) await API.updateEvent(eventId, body); else await API.createEvent(body);
    closeModal(); UI.toast(eventId ? 'Event updated!' : 'Event created!', 'success');
    if (currentPage === 'mySchedule') await loadMyEvents();
  } catch (e) { UI.toast(e.message, 'error'); }
};

window.editEventModal = async function (id) {
  try {
    const ev = await API.get(`/events/${id}`);
    showAddEventModal(ev);
  } catch (e) { UI.toast(e.message, 'error'); }
};

window.deleteEventAction = async function (id) {
  if (!UI.confirm('Delete this event?')) return;
  try { await API.deleteEvent(id); UI.toast('Event deleted', 'success'); if (currentPage === 'mySchedule') await loadMyEvents(); else await loadManageEvents(); }
  catch (e) { UI.toast(e.message, 'error'); }
};
