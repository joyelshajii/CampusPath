'use strict';
const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    const { dept_id } = req.query;
    let sql = `SELECT l.*, d.dept_name FROM Location l LEFT JOIN Departments d ON l.dept_id = d.dept_id`;
    const params = [];
    if (dept_id) { sql += ' WHERE l.dept_id = ? OR l.dept_id IS NULL'; params.push(dept_id); }
    sql += ' ORDER BY l.location_type, l.location_name';
    res.json(db.all(sql, params));
});

router.post('/', authenticate, (req, res) => {
    const { role, dept_id } = req.user;
    if (!['admin', 'hod', 'coordinator'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const { location_name, location_type, building, floor, nav_guide, dept_id: bd } = req.body;
    const useDept = role === 'admin' ? (bd || dept_id) : dept_id;
    const r = db.run('INSERT INTO Location(dept_id,location_name,location_type,building,floor,nav_guide) VALUES(?,?,?,?,?,?)', [useDept, location_name, location_type, building || null, floor || null, nav_guide || null]);
    db.persist();
    res.json({ location_id: r.lastInsertRowid });
});

router.put('/:id', authenticate, (req, res) => {
    const { role, dept_id } = req.user;
    if (!['admin', 'hod', 'coordinator'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const loc = db.get('SELECT * FROM Location WHERE location_id=?', [req.params.id]);
    if (!loc) return res.status(404).json({ error: 'Not found' });
    if (role !== 'admin' && loc.dept_id && loc.dept_id !== dept_id) return res.status(403).json({ error: 'Department mismatch' });
    const { location_name, location_type, building, floor, nav_guide } = req.body;
    if (location_name) db.run('UPDATE Location SET location_name=? WHERE location_id=?', [location_name, req.params.id]);
    if (location_type) db.run('UPDATE Location SET location_type=? WHERE location_id=?', [location_type, req.params.id]);
    if (building !== undefined) db.run('UPDATE Location SET building=? WHERE location_id=?', [building, req.params.id]);
    if (floor !== undefined) db.run('UPDATE Location SET floor=? WHERE location_id=?', [floor, req.params.id]);
    if (nav_guide !== undefined) db.run('UPDATE Location SET nav_guide=? WHERE location_id=?', [nav_guide, req.params.id]);
    db.persist();
    res.json({ success: true });
});

router.delete('/:id', authenticate, (req, res) => {
    const { role, dept_id } = req.user;
    if (!['admin', 'hod', 'coordinator'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const loc = db.get('SELECT * FROM Location WHERE location_id=?', [req.params.id]);
    if (!loc) return res.status(404).json({ error: 'Not found' });
    if (role !== 'admin' && loc.dept_id && loc.dept_id !== dept_id) return res.status(403).json({ error: 'Department mismatch' });
    db.run('DELETE FROM Location WHERE location_id=?', [req.params.id]);
    db.persist();
    res.json({ success: true });
});

module.exports = router;
