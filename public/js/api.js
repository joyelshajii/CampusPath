'use strict';

// ─── API Utility ──────────────────────────────────────────
const API = {
    _token: null,

    setToken(t) { this._token = t; },
    clearToken() { this._token = null; },

    async request(method, path, body = null) {
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
            },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`/api${path}`, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    patch(path, body) { return this.request('PATCH', path, body); },
    del(path) { return this.request('DELETE', path); },

    // Convenience methods
    login(u, p) { return this.post('/auth/login', { username: u, password: p }); },
    getFaculty() { return this.get('/faculty'); },
    getFacultyByDept(d) { return this.get(`/faculty/dept/${d}`); },
    // Self-resolving: backend uses JWT to find the faculty's own schedule
    getMySchedule() { return this.get('/faculty/me/schedule'); },
    getFacultySchedule(id) { return this.get(`/faculty/${id}/schedule`); },
    addSchedule(fid, body) { return this.post(`/faculty/${fid}/schedule`, body); },
    delSchedule(sid) { return this.del(`/faculty/schedule/${sid}`); },
    updateFaculty(fid, body) { return this.put(`/faculty/${fid}`, body); },

    getEvents(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.get(`/events${q ? '?' + q : ''}`);
    },
    // Fetch events created by a specific user (for faculty's own events)
    getMyEvents(userId) { return this.get(`/events?created_by=${userId}`); },
    createEvent(body) { return this.post('/events', body); },
    updateEvent(id, body) { return this.put(`/events/${id}`, body); },
    deleteEvent(id) { return this.del(`/events/${id}`); },

    getLocations(deptId) { return this.get(`/locations${deptId ? '?dept_id=' + deptId : ''}`); },
    createLocation(body) { return this.post('/locations', body); },
    updateLocation(id, body) { return this.put(`/locations/${id}`, body); },
    deleteLocation(id) { return this.del(`/locations/${id}`); },

    getUsers(params = {}) {
        const q = new URLSearchParams(params).toString();
        return this.get(`/users${q ? '?' + q : ''}`);
    },
    getUser(id) { return this.get(`/users/${id}`); },
    createUser(body) { return this.post('/users', body); },
    updateUser(id, body) { return this.put(`/users/${id}`, body); },
    deleteUser(id) { return this.del(`/users/${id}`); },
    toggleAccess(id, flag) { return this.patch(`/users/${id}/access`, { is_active: flag }); },
    changeRole(id, role) { return this.patch(`/users/${id}/role`, { role_name: role }); },

    getDepartments() { return this.get('/departments'); },
    createDept(body) { return this.post('/departments', body); },
    updateDept(id, body) { return this.put(`/departments/${id}`, body); },
    deleteDept(id) { return this.del(`/departments/${id}`); },

    getSlots() { return this.get('/utils/slots'); },
    getRoles() { return this.get('/utils/roles'); },
};
