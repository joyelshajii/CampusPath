'use strict';
const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    const { dept_id, date, upcoming, created_by } = req.query;
    let sql = `SELECT e.*, d.dept_name, l.location_name, l.building, l.floor, u.full_name AS created_by_name
               FROM Events e
               LEFT JOIN Departments d ON e.dept_id = d.dept_id
               LEFT JOIN Location l ON e.location_id = l.location_id
               JOIN Users u ON e.created_by = u.user_id
               WHERE 1=1`;
    const params = [];
    // If fetching by creator (faculty's own events), don't filter by is_public.
    // IMPORTANT: parseInt() is required — query params arrive as strings, but
    // created_by is stored as an INTEGER in SQLite. sql.js strict comparison
    // would return 0 rows without explicit coercion.
    if (created_by) {
        const creatorId = parseInt(created_by, 10);
        console.log(`[Events] GET /?created_by=${created_by} → querying as integer ${creatorId}`);
        sql += ' AND e.created_by = ?'; params.push(creatorId);
    } else {
        sql += ' AND e.is_public = 1';
        if (dept_id) { sql += ' AND (e.dept_id = ? OR e.dept_id IS NULL)'; params.push(parseInt(dept_id, 10)); }
    }
    if (date) { sql += ' AND e.event_date = ?'; params.push(date); }
    if (upcoming === 'true') { sql += " AND e.event_date >= date('now')"; }
    sql += ' ORDER BY e.event_date ASC, e.start_time ASC';
    const results = db.all(sql, params);
    console.log(`[Events] GET / returned ${results.length} event(s)`);
    res.json(results);
});

router.get('/:id', authenticate, (req, res) => {
    const event = db.get(`SELECT e.*, d.dept_name, l.location_name, l.building, l.floor, l.nav_guide, u.full_name AS created_by_name
               FROM Events e
               LEFT JOIN Departments d ON e.dept_id = d.dept_id
               LEFT JOIN Location l ON e.location_id = l.location_id
               JOIN Users u ON e.created_by = u.user_id
               WHERE e.event_id = ?`, [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
});

router.post('/', authenticate, (req, res) => {
    const { role, dept_id, user_id } = req.user;
    if (role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const { event_name, description, event_date, start_time, end_time, location_id, is_public, dept_id: bdept } = req.body;
    if (!event_name || !event_date || !start_time || !end_time) return res.status(400).json({ error: 'event_name, event_date, start_time, end_time are required' });
    const useDept = role === 'admin' ? (bdept || null) : dept_id;
    const r = db.run(
        'INSERT INTO Events(dept_id,location_id,created_by,event_name,description,event_date,start_time,end_time,is_public) VALUES(?,?,?,?,?,?,?,?,?)',
        [useDept, location_id || null, user_id, event_name, description || null, event_date, start_time, end_time, is_public !== undefined ? is_public : 1]
    );
    db.persist();
    res.json({ event_id: r.lastInsertRowid });
});

router.put('/:id', authenticate, (req, res) => {
    const { role, dept_id, user_id } = req.user;
    if (role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const event = db.get('SELECT * FROM Events WHERE event_id=?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Not found' });
    // Faculty can only edit their own events
    if (role === 'faculty' && event.created_by !== user_id) return res.status(403).json({ error: 'Can only edit own events' });
    if (['coordinator', 'hod'].includes(role) && event.dept_id !== dept_id && event.created_by !== user_id) return res.status(403).json({ error: 'Department mismatch' });
    const { event_name, description, event_date, start_time, end_time, location_id, is_public } = req.body;
    if (event_name) db.run('UPDATE Events SET event_name=? WHERE event_id=?', [event_name, req.params.id]);
    if (description !== undefined) db.run('UPDATE Events SET description=? WHERE event_id=?', [description, req.params.id]);
    if (event_date) db.run('UPDATE Events SET event_date=? WHERE event_id=?', [event_date, req.params.id]);
    if (start_time) db.run('UPDATE Events SET start_time=? WHERE event_id=?', [start_time, req.params.id]);
    if (end_time) db.run('UPDATE Events SET end_time=? WHERE event_id=?', [end_time, req.params.id]);
    if (location_id !== undefined) db.run('UPDATE Events SET location_id=? WHERE event_id=?', [location_id || null, req.params.id]);
    if (is_public !== undefined) db.run('UPDATE Events SET is_public=? WHERE event_id=?', [is_public, req.params.id]);
    db.persist();
    res.json({ success: true });
});

router.delete('/:id', authenticate, (req, res) => {
    const { role, dept_id, user_id } = req.user;
    if (role === 'student') return res.status(403).json({ error: 'Forbidden' });
    const event = db.get('SELECT * FROM Events WHERE event_id=?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Not found' });
    // Faculty can only delete their own events
    if (role === 'faculty' && event.created_by !== user_id) return res.status(403).json({ error: 'Forbidden' });
    if (['coordinator', 'hod'].includes(role) && event.dept_id !== dept_id && event.created_by !== user_id) return res.status(403).json({ error: 'Department mismatch' });
    db.run('DELETE FROM Events WHERE event_id=?', [req.params.id]);
    db.persist();
    res.json({ success: true });
});

module.exports = router;
