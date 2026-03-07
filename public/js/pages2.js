'use strict';

// ══════════════════════════════════════════════════════════
// MANAGE TEACHERS & SCHEDULES
// ══════════════════════════════════════════════════════════
Pages.manageTeachers = async function (container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>Manage Teachers & Schedules</h2><p>View, edit and manage faculty timetables</p></div>
        ${['admin', 'hod'].includes(currentUser.role) ? `<button class="btn btn-primary" onclick="showAddUserModal('faculty')">+ Add Faculty</button>` : ''}
      </div>
    </div>
    <div id="teachers-content"><div class="page-loader"><div class="spinner"></div></div></div>`;

  try {
    const [faculty, slots] = await Promise.all([
      API.getUsers({ role_filter: 'faculty' }),
      API.getSlots()
    ]);
    window._teacherSlots = slots;
    // For HOD/Coordinator: filter to show all, but mark which ones are in their dept
    renderTeachersTable(faculty, document.getElementById('teachers-content'));
  } catch (e) { document.getElementById('teachers-content').innerHTML = UI.emptyState('', 'Error', e.message); }
};

function renderTeachersTable(list, wrap) {
  if (!list.length) { wrap.innerHTML = UI.emptyState('', 'No faculty found'); return; }
  // canEdit: admin/hod can edit; coordinator can only edit faculty in their own dept
  wrap.innerHTML = `
    <div class="search-row"><div class="search-input-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" placeholder="Search faculty..." id="teacher-search" oninput="filterTeacherTable(this.value)"/>
    </div></div>
    <div class="table-wrap">
    <table id="teacher-table">
      <thead><tr><th>Name</th><th>Designation</th><th>Department</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="teacher-tbody">${list.map(f => {
    const canManage = currentUser.role === 'admin' || f.dept_id === currentUser.dept_id;
    return `
        <tr data-name="${(f.full_name || '').toLowerCase()}">
          <td><div style="font-weight:600">${f.full_name}</div><div style="font-size:12px;color:var(--gray-400)">${f.role === 'hod' ? 'HOD' : 'Faculty'}</div></td>
          <td>${f.designation || '—'}</td>
          <td><span style="font-size:12px;background:var(--gray-50);padding:2px 8px;border-radius:6px;border:1px solid var(--gray-200);">${f.dept_code || '—'}</span></td>
          <td>${f.email || '—'}</td>
          <td>${UI.activeBadge(f.is_active)}</td>
          <td><div class="td-actions">
            <button class="btn btn-secondary btn-sm" onclick="viewTeacherSchedule(${f.faculty_id},'${(f.full_name || '').replace(/'/g, "\\'")}')">📅 Schedule</button>
            ${canManage ? `<button class="btn btn-secondary btn-sm" onclick="showEditUserModal(${f.user_id})">Edit</button>` : ''}
            ${(canManage && ['admin', 'hod'].includes(currentUser.role)) ? `<button class="btn btn-danger btn-sm" onclick="deleteUserAction(${f.user_id})">Delete</button>` : ''}
          </div></td>
        </tr>`;
  }).join('')}
      </tbody>
    </table></div>`;
}

window.filterTeacherTable = function (q) {
  document.querySelectorAll('#teacher-tbody tr').forEach(row => {
    row.style.display = row.dataset.name.includes(q.toLowerCase()) ? '' : 'none';
  });
};

window.viewTeacherSchedule = async function (facId, name) {
  const [schedule, slots] = await Promise.all([API.getFacultySchedule(facId), API.getSlots()]);
  const canEdit = ['admin', 'hod', 'coordinator'].includes(currentUser.role);
  const wrap = document.createElement('div');
  renderTimetable(schedule, slots, wrap, facId, false);
  UI.showModal(`Schedule: ${name}`, `
    ${canEdit ? `<div style="text-align:right;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="showAddScheduleModal(${facId})">+ Add Period</button></div>` : ''}
    ${wrap.innerHTML}`, { wide: true });
};

window.loadTeacherSchedule = async function (facId) {
  const modal = document.getElementById('modal-body');
  if (modal) {
    const [schedule, slots] = await Promise.all([API.getFacultySchedule(facId), API.getSlots()]);
    const wrap = document.createElement('div');
    renderTimetable(schedule, slots, wrap, facId, false);
    const existing = modal.querySelector('.timetable-wrap');
    if (existing) existing.replaceWith(wrap.querySelector('.timetable-wrap'));
  }
};

// ══════════════════════════════════════════════════════════
// MANAGE USERS (students / coordinators / HODs)
// ══════════════════════════════════════════════════════════
Pages.manageUsers = async function (container, roleFilter, title) {
  const canAdd = currentUser.role === 'admin' ||
    (currentUser.role === 'hod') ||
    (currentUser.role === 'coordinator' && roleFilter === 'student');
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>Manage ${title}</h2><p>Add, edit and manage ${title.toLowerCase()}</p></div>
        ${canAdd ? `<button class="btn btn-primary" onclick="showAddUserModal('${roleFilter}')">+ Add ${title.slice(0, -1)}</button>` : ''}
      </div>
    </div>
    <div id="users-table-wrap"><div class="page-loader"><div class="spinner"></div></div></div>`;

  try {
    const users = await API.getUsers({ role_filter: roleFilter });
    renderUsersTable(users, document.getElementById('users-table-wrap'), roleFilter);
  } catch (e) { document.getElementById('users-table-wrap').innerHTML = UI.emptyState('', 'Error', e.message); }
};

function renderUsersTable(list, wrap, role) {
  const isStudent = role === 'student';
  if (!list.length) { wrap.innerHTML = UI.emptyState('', `No ${role}s found`, `Use the button above to add a ${role}.`); return; }
  wrap.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Username</th><th>Department</th>${isStudent ? '<th>Roll No</th><th>Sem</th>' : '<th>Email</th>'}<th>Status</th><th>Actions</th></tr></thead>
    <tbody>${list.map(u => {
    const canManage = currentUser.role === 'admin' || u.dept_id === currentUser.dept_id;
    const canDelete = canManage && (['admin', 'hod'].includes(currentUser.role) || (currentUser.role === 'coordinator' && role === 'student'));
    return `<tr>
      <td><div style="font-weight:600">${u.full_name}</div></td>
      <td><code style="font-size:12px;background:var(--gray-50);padding:2px 6px;border-radius:4px">${u.username}</code></td>
      <td><span style="font-size:12px;background:var(--gray-50);padding:2px 8px;border-radius:6px;border:1px solid var(--gray-200);">${u.dept_code || '—'}</span></td>
      ${isStudent ? `<td>${u.roll_number || '—'}</td><td><span class="badge badge-info">Sem ${u.semester || 1}</span></td>` : `<td>${u.email || '—'}</td>`}
      <td>${UI.activeBadge(u.is_active)}</td>
      <td><div class="td-actions">
        ${canManage ? `<button class="btn btn-secondary btn-sm" onclick="showEditUserModal(${u.user_id})">Edit</button>` : ''}
        ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteUserAction(${u.user_id})">Delete</button>` : ''}
      </div></td>
    </tr>`;
  }).join('')}
    </tbody>
  </table></div>`;
}

// ──────────────────────────────────────────────────────────
// ADD USER MODAL — with Department selector
// ──────────────────────────────────────────────────────────
window.showAddUserModal = async function (role) {
  const isStudent = role === 'student';
  const isFaculty = role === 'faculty' || role === 'hod';
  const isAdmin = currentUser.role === 'admin';

  // Load departments for the selector (admin picks; others default to their own)
  let depts = [];
  if (isAdmin) {
    try { depts = await API.getDepartments(); } catch { }
  }

  const deptSelector = isAdmin
    ? `<div class="form-group"><label>Department *</label><select id="nu-dept"><option value="">— Select Department —</option>${depts.map(d => `<option value="${d.dept_id}">${d.dept_name} (${d.dept_code})</option>`).join('')}</select></div>`
    : `<div class="form-group"><label>Department</label><input value="${currentUser.dept_name || 'Your Department'}" disabled style="background:var(--gray-50);color:var(--gray-500);cursor:not-allowed;"/><input type="hidden" id="nu-dept" value="${currentUser.dept_id || ''}"/></div>`;

  const designationInput = isFaculty
    ? `<div class="form-group"><label>Designation</label>
            <input id="nu-desig" placeholder="e.g. Professor, Assistant Professor, Lecturer" value="Assistant Professor" style="background:white;"/>
           </div>
           <div class="form-group"><label>Phone</label><input id="nu-phone" placeholder="Phone number"/></div>`
    : '';

  UI.showModal(`Add ${role.charAt(0).toUpperCase() + role.slice(1)}`, `
    <div class="form-row">
      <div class="form-group"><label>Full Name *</label><input id="nu-name" placeholder="Full name"/></div>
      <div class="form-group"><label>Username *</label><input id="nu-user" placeholder="username"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Password *</label><input id="nu-pw" type="password" placeholder="password"/></div>
      <div class="form-group"><label>Email</label><input id="nu-email" type="email" placeholder="email@edu"/></div>
    </div>
    ${deptSelector}
    ${isStudent ? `<div class="form-row"><div class="form-group"><label>Roll Number *</label><input id="nu-roll" placeholder="CS2024001"/></div><div class="form-group"><label>Semester</label><input id="nu-sem" type="number" value="1" min="1" max="8"/></div></div>` : ''}
    ${designationInput}
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitNewUser('${role}')">Create</button>
    </div>`);
};

window.submitNewUser = async function (role) {
  const deptInput = document.getElementById('nu-dept');
  const deptId = deptInput ? (parseInt(deptInput.value) || currentUser.dept_id || null) : (currentUser.dept_id || null);

  const body = {
    username: document.getElementById('nu-user').value.trim(),
    password: document.getElementById('nu-pw').value,
    full_name: document.getElementById('nu-name').value.trim(),
    email: document.getElementById('nu-email')?.value || null,
    role_name: role,
    dept_id: deptId,
  };
  if (!body.username || !body.password || !body.full_name) { UI.toast('Name, username and password are required', 'error'); return; }
  if (role === 'student') {
    body.roll_number = document.getElementById('nu-roll').value.trim();
    body.semester = parseInt(document.getElementById('nu-sem').value) || 1;
    if (!body.roll_number) { UI.toast('Roll number is required for students', 'error'); return; }
  }
  if (role === 'faculty' || role === 'hod') {
    body.designation = document.getElementById('nu-desig')?.value || 'Assistant Professor';
    body.phone = document.getElementById('nu-phone')?.value || null;
  }
  try {
    await API.createUser(body);
    closeModal();
    UI.toast('User created successfully!', 'success');
    await renderPage(currentPage, document.getElementById('page-content'));
  } catch (e) { UI.toast(e.message, 'error'); }
};

window.showEditUserModal = async function (userId) {
  const u = await API.getUser(userId);
  const isStudent = !!u.student_id;
  const isFaculty = !!u.faculty_id;
  UI.showModal('Edit User', `
    <div class="form-group"><label>Full Name</label><input id="eu-name" value="${u.full_name || ''}"/></div>
    <div class="form-group"><label>Email</label><input id="eu-email" type="email" value="${u.email || ''}"/></div>
    <div class="form-group"><label>New Password (leave blank to keep)</label><input id="eu-pw" type="password" placeholder="New password"/></div>
    ${isFaculty ? `<div class="form-group"><label>Designation</label><input id="eu-desig" value="${u.designation || ''}" placeholder="e.g. Assistant Professor"/></div><div class="form-group"><label>Phone</label><input id="eu-phone" value="${u.phone || ''}"/></div>` : ''}
    ${isStudent ? `<div class="form-row"><div class="form-group"><label>Roll Number</label><input id="eu-roll" value="${u.roll_number || ''}"/></div><div class="form-group"><label>Semester</label><input id="eu-sem" type="number" value="${u.semester || 1}" min="1" max="8"/></div></div>` : ''}
    ${currentUser.role === 'admin' ? `<div class="form-group"><label>Change Role</label><select id="eu-role"><option value="">— Keep current (${u.role}) —</option><option value="student">Student</option><option value="faculty">Faculty</option><option value="coordinator">Coordinator</option><option value="hod">HOD</option><option value="admin">Admin</option></select></div>` : ''}
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditUser(${userId}, ${!!u.faculty_id}, ${!!u.student_id})">Save</button>
    </div>`);
};

window.submitEditUser = async function (id, isFac, isStu) {
  const body = {
    full_name: document.getElementById('eu-name').value,
    email: document.getElementById('eu-email').value,
  };
  const pw = document.getElementById('eu-pw').value;
  if (pw) body.password = pw;
  if (isFac) { body.designation = document.getElementById('eu-desig')?.value; body.phone = document.getElementById('eu-phone')?.value; }
  if (isStu) { body.roll_number = document.getElementById('eu-roll')?.value; body.semester = parseInt(document.getElementById('eu-sem')?.value) || 1; }
  try {
    await API.updateUser(id, body);
    const newRole = document.getElementById('eu-role')?.value;
    if (newRole) await API.changeRole(id, newRole);
    closeModal();
    UI.toast('User updated!', 'success');
    await renderPage(currentPage, document.getElementById('page-content'));
  } catch (e) { UI.toast(e.message, 'error'); }
};

window.deleteUserAction = async function (id) {
  if (!UI.confirm('Delete this user? This cannot be undone.')) return;
  try { await API.deleteUser(id); UI.toast('User deleted', 'success'); await renderPage(currentPage, document.getElementById('page-content')); }
  catch (e) { UI.toast(e.message, 'error'); }
};

// ══════════════════════════════════════════════════════════
// MANAGE LOCATIONS — with Department selector
// ══════════════════════════════════════════════════════════
Pages.manageLocations = async function (container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>Manage Locations</h2><p>Classrooms, labs, staff rooms and other spaces</p></div>
        <button class="btn btn-primary" onclick="showAddLocationModal()">+ Add Location</button>
      </div>
    </div>
    <div id="loc-content"><div class="page-loader"><div class="spinner"></div></div></div>`;
  await loadLocations();
};

async function loadLocations() {
  const wrap = document.getElementById('loc-content');
  try {
    // Admin sees all; others see their dept + global
    const locs = await API.getLocations(currentUser.role === 'admin' ? null : currentUser.dept_id);
    if (!locs.length) { wrap.innerHTML = UI.emptyState('', 'No locations found'); return; }
    const byType = {};
    locs.forEach(l => { if (!byType[l.location_type]) byType[l.location_type] = []; byType[l.location_type].push(l); });
    wrap.innerHTML = Object.entries(byType).map(([type, list]) => `
      <div style="margin-bottom:24px">
        <div style="font-size:14px;font-weight:700;color:var(--gray-700);margin-bottom:10px;display:flex;align-items:center;gap:6px">${UI.locTypeBadge(type)} <span>${list.length} location${list.length > 1 ? 's' : ''}</span></div>
        <div class="table-wrap"><table><thead><tr><th>Name</th><th>Building</th><th>Floor</th><th>Department</th><th>Navigation Guide</th><th>Actions</th></tr></thead>
        <tbody>${list.map(l => {
      const canManage = currentUser.role === 'admin' || l.dept_id === currentUser.dept_id;
      return `<tr>
          <td><div style="font-weight:600">${l.location_name}</div></td>
          <td>${l.building || '—'}</td><td>${l.floor || '—'}</td>
          <td>${l.dept_name || '<span style="color:var(--gray-400)">All Depts</span>'}</td>
          <td style="max-width:200px;font-size:12px;color:var(--gray-500)">${l.nav_guide || '—'}</td>
          <td><div class="td-actions">
            ${canManage ? `<button class="btn btn-secondary btn-sm" onclick="showEditLocationModal(${l.location_id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteLocationAction(${l.location_id})">Delete</button>` : '<span style="color:var(--gray-400);font-size:12px">View only</span>'}
          </div></td>
        </tr>`;
    }).join('')}</tbody></table></div>
      </div>`).join('');
  } catch (e) { wrap.innerHTML = UI.emptyState('', 'Error', e.message); }
}

window.showAddLocationModal = async function (existing) {
  const isEdit = !!existing;
  const e = existing || {};
  const types = ['classroom', 'lab', 'staff_room', 'auditorium', 'other'];
  const isAdmin = currentUser.role === 'admin';

  let depts = [];
  if (isAdmin) {
    try { depts = await API.getDepartments(); } catch { }
  }

  const deptSelector = isAdmin
    ? `<div class="form-group"><label>Department</label><select id="loc-dept"><option value="">— All / Global —</option>${depts.map(d => `<option value="${d.dept_id}" ${d.dept_id == e.dept_id ? 'selected' : ''}>${d.dept_name} (${d.dept_code})</option>`).join('')}</select></div>`
    : `<div class="form-group"><label>Department</label><input value="${currentUser.dept_name || 'Your Department'}" disabled style="background:var(--gray-50);color:var(--gray-500);cursor:not-allowed;"/><input type="hidden" id="loc-dept" value="${currentUser.dept_id || ''}"/></div>`;

  UI.showModal(isEdit ? 'Edit Location' : 'Add Location', `
    <div class="form-row">
      <div class="form-group"><label>Name *</label><input id="loc-name" value="${e.location_name || ''}" placeholder="e.g. CS Lab 3"/></div>
      <div class="form-group"><label>Type *</label><select id="loc-type">${types.map(t => `<option value="${t}" ${t === e.location_type ? 'selected' : ''}>${t.replace('_', ' ')}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Building</label><input id="loc-building" value="${e.building || ''}" placeholder="e.g. Tech Block"/></div>
      <div class="form-group"><label>Floor</label><input id="loc-floor" value="${e.floor || ''}" placeholder="e.g. Ground Floor"/></div>
    </div>
    ${deptSelector}
    <div class="form-group"><label>Navigation Guide</label><textarea id="loc-nav">${e.nav_guide || ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitLocation(${e.location_id || 'null'})">${isEdit ? 'Update' : 'Add'} Location</button>
    </div>`);
};

window.showEditLocationModal = async function (id) {
  const locs = await API.getLocations();
  const loc = locs.find(l => l.location_id === id);
  if (loc) showAddLocationModal(loc);
};

window.submitLocation = async function (id) {
  const deptInput = document.getElementById('loc-dept');
  const deptId = deptInput ? (parseInt(deptInput.value) || null) : (currentUser.dept_id || null);
  const body = {
    location_name: document.getElementById('loc-name').value,
    location_type: document.getElementById('loc-type').value,
    building: document.getElementById('loc-building').value,
    floor: document.getElementById('loc-floor').value,
    nav_guide: document.getElementById('loc-nav').value,
    dept_id: deptId,
  };
  try {
    if (id) await API.updateLocation(id, body); else await API.createLocation(body);
    closeModal(); UI.toast(id ? 'Location updated!' : 'Location added!', 'success'); await loadLocations();
  } catch (e) { UI.toast(e.message, 'error'); }
};

window.deleteLocationAction = async function (id) {
  if (!UI.confirm('Delete this location?')) return;
  try { await API.deleteLocation(id); UI.toast('Deleted', 'success'); await loadLocations(); }
  catch (e) { UI.toast(e.message, 'error'); }
};

// ══════════════════════════════════════════════════════════
// MANAGE EVENTS (Admin / HOD / Coordinator — Full CRUD)
// ══════════════════════════════════════════════════════════
Pages.manageEvents = async function (container) {
  const role = currentUser.role;
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>Manage Events</h2><p>${role === 'admin' ? 'All events across all departments' : 'Events for your department'}</p></div>
        <button class="btn btn-primary" onclick="showManageEventModal()">+ Add Event</button>
      </div>
    </div>
    ${role === 'admin' ? `<div style="margin-bottom:16px;display:flex;gap:10px;align-items:center;">
      <label style="font-size:14px;font-weight:600;color:var(--gray-700);">Filter:</label>
      <select id="ev-dept-filter" onchange="loadManageEvents()" style="height:40px;padding:0 12px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:14px;background:white;">
        <option value="">All Departments</option>
      </select>
    </div>` : ''}
    <div id="manage-events-content"><div class="page-loader"><div class="spinner"></div></div></div>`;

  // Populate dept filter for admin
  if (role === 'admin') {
    try {
      const depts = await API.getDepartments();
      const sel = document.getElementById('ev-dept-filter');
      if (sel) depts.forEach(d => { const o = document.createElement('option'); o.value = d.dept_id; o.textContent = `${d.dept_name} (${d.dept_code})`; sel.appendChild(o); });
    } catch { }
  }

  await loadManageEvents();
};

window.loadManageEvents = async function () {
  const wrap = document.getElementById('manage-events-content');
  if (!wrap) return;
  wrap.innerHTML = `<div class="page-loader"><div class="spinner"></div></div>`;
  try {
    const params = {};
    const deptFilter = document.getElementById('ev-dept-filter');
    if (deptFilter && deptFilter.value) params.dept_id = deptFilter.value;
    else if (currentUser.role !== 'admin' && currentUser.dept_id) params.dept_id = currentUser.dept_id;
    const events = await API.getEvents(params);
    if (!events.length) { wrap.innerHTML = UI.emptyState('', 'No events found', 'Click "+ Add Event" to create one.'); return; }

    wrap.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Event Name</th><th>Date</th><th>Time</th><th>Venue</th><th>Department</th><th>Actions</th></tr></thead>
        <tbody>${events.map(ev => `<tr>
          <td><div style="font-weight:600">${ev.event_name}</div>${ev.description ? `<div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${ev.description.substring(0, 60)}${ev.description.length > 60 ? '...' : ''}</div>` : ''}</td>
          <td>${UI.formatDate(ev.event_date)}</td>
          <td style="white-space:nowrap;">${UI.formatTime(ev.start_time)} – ${UI.formatTime(ev.end_time)}</td>
          <td>${ev.location_name || '<span style="color:var(--gray-400)">—</span>'}</td>
          <td><span style="font-size:12px;background:var(--gray-50);padding:2px 8px;border-radius:6px;border:1px solid var(--gray-200);">${ev.dept_name || 'Global'}</span></td>
          <td><div class="td-actions">
            <button class="btn btn-secondary btn-sm" onclick="showManageEventModal(${ev.event_id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEventAction(${ev.event_id})">Delete</button>
          </div></td>
        </tr>`).join('')}
        </tbody></table></div>`;
  } catch (e) { if (wrap) wrap.innerHTML = UI.emptyState('', 'Error', e.message); }
};

window.showManageEventModal = async function (eventId) {
  const isAdmin = currentUser.role === 'admin';
  let ev = {};
  if (eventId) {
    try { ev = await API.get(`/events/${eventId}`); } catch (e) { UI.toast(e.message, 'error'); return; }
  }

  let depts = [], locations = [];
  try {
    [locations] = await Promise.all([API.getLocations(isAdmin ? null : currentUser.dept_id)]);
    if (isAdmin) depts = await API.getDepartments();
  } catch { }

  const deptSelector = isAdmin
    ? `<div class="form-group"><label>Department</label><select id="mev-dept"><option value="">— Global / All —</option>${depts.map(d => `<option value="${d.dept_id}" ${d.dept_id == ev.dept_id ? 'selected' : ''}>${d.dept_name} (${d.dept_code})</option>`).join('')}</select></div>`
    : '';

  UI.showModal(eventId ? 'Edit Event' : 'Add Event', `
    <div class="form-group"><label>Event Name *</label><input id="mev-name" value="${ev.event_name || ''}" placeholder="Event name"/></div>
    <div class="form-group"><label>Description</label><textarea id="mev-desc">${ev.description || ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Date *</label><input id="mev-date" type="date" value="${ev.event_date || ''}"/></div>
      <div class="form-group"><label>Start Time *</label><input id="mev-start" type="time" value="${ev.start_time || ''}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>End Time *</label><input id="mev-end" type="time" value="${ev.end_time || ''}"/></div>
      <div class="form-group"><label>Venue</label><select id="mev-loc"><option value="">— Select Location —</option>${locations.map(l => `<option value="${l.location_id}" ${l.location_id == ev.location_id ? 'selected' : ''}>${l.location_name}</option>`).join('')}</select></div>
    </div>
    ${deptSelector}
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitManageEvent(${eventId || 'null'})">${eventId ? 'Update' : 'Create'} Event</button>
    </div>`);
};

window.submitManageEvent = async function (eventId) {
  const body = {
    event_name: document.getElementById('mev-name').value,
    description: document.getElementById('mev-desc').value,
    event_date: document.getElementById('mev-date').value,
    start_time: document.getElementById('mev-start').value,
    end_time: document.getElementById('mev-end').value,
    location_id: document.getElementById('mev-loc').value || null,
  };
  const deptSel = document.getElementById('mev-dept');
  if (deptSel) body.dept_id = deptSel.value || null;
  if (!body.event_name || !body.event_date || !body.start_time || !body.end_time) {
    UI.toast('Event name, date and times are required', 'error'); return;
  }
  try {
    if (eventId) await API.updateEvent(eventId, body); else await API.createEvent(body);
    closeModal();
    UI.toast(eventId ? 'Event updated!' : 'Event created!', 'success');
    await loadManageEvents();
  } catch (e) { UI.toast(e.message, 'error'); }
};

// ══════════════════════════════════════════════════════════
// MANAGE ACCESS (Grant / Revoke Login)
// ══════════════════════════════════════════════════════════
Pages.manageAccess = async function (container, roleFilter) {
  const titleMap = { student: 'Student', faculty: 'Teacher', coordinator: 'Coordinator', hod: 'HOD', all: 'All Users' };
  const title = titleMap[roleFilter] || roleFilter;
  container.innerHTML = `
    <div class="page-header"><h2>${title} Access Management</h2><p>Grant or revoke login access for users</p></div>
    <div class="info-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      Revoking access prevents the user from logging in. Their data is preserved and access can be re-granted at any time.
    </div>
    <div id="access-table"><div class="page-loader"><div class="spinner"></div></div></div>`;

  try {
    const params = roleFilter !== 'all' ? { role_filter: roleFilter } : {};
    const users = await API.getUsers(params);
    const wrap = document.getElementById('access-table');
    if (!users.length) { wrap.innerHTML = UI.emptyState('', 'No users found'); return; }
    wrap.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Department</th><th>Access Status</th><th>Action</th></tr></thead>
      <tbody>${users.map(u => `<tr id="access-row-${u.user_id}">
        <td style="font-weight:600">${u.full_name}</td>
        <td><code style="font-size:12px;background:var(--gray-50);padding:2px 6px;border-radius:4px">${u.username}</code></td>
        <td>${UI.roleBadge(u.role)}</td>
        <td>${u.dept_name || '<span style="color:var(--gray-400)">Global</span>'}</td>
        <td id="access-status-${u.user_id}">${UI.activeBadge(u.is_active)}</td>
        <td>
          ${u.is_active
        ? `<button class="btn btn-danger btn-sm" id="access-btn-${u.user_id}" onclick="toggleUserAccess(${u.user_id},false,'${(u.full_name || '').replace(/'/g, "\\'")}')">Revoke Access</button>`
        : `<button class="btn btn-success btn-sm" id="access-btn-${u.user_id}" onclick="toggleUserAccess(${u.user_id},true,'${(u.full_name || '').replace(/'/g, "\\'")}')">Grant Access</button>`}
        </td>
      </tr>`).join('')}
      </tbody></table></div>`;
  } catch (e) { document.getElementById('access-table').innerHTML = UI.emptyState('', 'Error', e.message); }
};

window.toggleUserAccess = async function (id, activate, name) {
  const action = activate ? 'grant access to' : 'revoke access for';
  if (!UI.confirm(`Are you sure you want to ${action} ${name}?`)) return;
  try {
    await API.toggleAccess(id, activate);
    UI.toast(`Access ${activate ? 'granted to' : 'revoked for'} ${name}`, activate ? 'success' : 'warning');
    document.getElementById(`access-status-${id}`).innerHTML = UI.activeBadge(activate ? 1 : 0);
    const btn = document.getElementById(`access-btn-${id}`);
    if (activate) {
      btn.className = 'btn btn-danger btn-sm';
      btn.textContent = 'Revoke Access';
      btn.onclick = () => window.toggleUserAccess(id, false, name);
    } else {
      btn.className = 'btn btn-success btn-sm';
      btn.textContent = 'Grant Access';
      btn.onclick = () => window.toggleUserAccess(id, true, name);
    }
  } catch (e) { UI.toast(e.message, 'error'); }
};

// ══════════════════════════════════════════════════════════
// MANAGE DEPARTMENTS (Admin only)
// ══════════════════════════════════════════════════════════
Pages.manageDepartments = async function (container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>Manage Departments</h2><p>Add, edit or delete global departments</p></div>
        <button class="btn btn-primary" onclick="showAddDeptModal()">+ Add Department</button>
      </div>
    </div>
    <div id="dept-content"><div class="page-loader"><div class="spinner"></div></div></div>`;
  await loadDepartments();
};

async function loadDepartments() {
  const wrap = document.getElementById('dept-content');
  try {
    const depts = await API.getDepartments();
    if (!depts.length) { wrap.innerHTML = UI.emptyState('', 'No departments yet'); return; }
    wrap.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Department Name</th><th>Code</th><th>Actions</th></tr></thead>
      <tbody>${depts.map(d => `<tr>
        <td style="font-weight:600">${d.dept_name}</td>
        <td><span class="badge badge-info">${d.dept_code}</span></td>
        <td><div class="td-actions">
          <button class="btn btn-secondary btn-sm" onclick="showEditDeptModal(${d.dept_id},'${(d.dept_name || '').replace(/'/g, "\\'")}','${d.dept_code}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDeptAction(${d.dept_id})">Delete</button>
        </div></td>
      </tr>`).join('')}
      </tbody></table></div>`;
  } catch (e) { wrap.innerHTML = UI.emptyState('', 'Error', e.message); }
}

window.showAddDeptModal = function () {
  UI.showModal('Add Department', `
    <div class="form-group"><label>Department Name *</label><input id="dept-name" placeholder="e.g. Mechanical Engineering"/></div>
    <div class="form-group"><label>Department Code *</label><input id="dept-code" placeholder="e.g. MECH"/></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitDept(null)">Add Department</button>
    </div>`);
};

window.showEditDeptModal = function (id, name, code) {
  UI.showModal('Edit Department', `
    <div class="form-group"><label>Department Name</label><input id="dept-name" value="${name}"/></div>
    <div class="form-group"><label>Department Code</label><input id="dept-code" value="${code}"/></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitDept(${id})">Save</button>
    </div>`);
};

window.submitDept = async function (id) {
  const body = { dept_name: document.getElementById('dept-name').value, dept_code: document.getElementById('dept-code').value };
  try {
    if (id) await API.updateDept(id, body); else await API.createDept(body);
    closeModal(); UI.toast(id ? 'Department updated!' : 'Department created!', 'success'); await loadDepartments();
  } catch (e) { UI.toast(e.message, 'error'); }
};

window.deleteDeptAction = async function (id) {
  if (!UI.confirm('Delete this department? All associated data may be affected.')) return;
  try { await API.deleteDept(id); UI.toast('Department deleted', 'success'); await loadDepartments(); }
  catch (e) { UI.toast(e.message, 'error'); }
};
