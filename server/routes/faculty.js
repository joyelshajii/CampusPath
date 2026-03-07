'use strict';
const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    // Calculate IST current time
    const now = new Date();
    const istOffset = 5 * 60 + 30;
    const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const istMin = (utcMin + istOffset) % (24 * 60);
    const istH = String(Math.floor(istMin / 60)).padStart(2, '0');
    const istM = String(istMin % 60).padStart(2, '0');
    const currentTime = `${istH}:${istM}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const nowIST = new Date(now.getTime() + istOffset * 60000);
    const dayOfWeek = days[nowIST.getUTCDay()];

    const faculty = db.all(`
    SELECT f.faculty_id, f.designation, f.phone, u.full_name, u.email, u.user_id, u.is_active,
           d.dept_name, d.dept_code, d.dept_id,
           dr.location_name AS default_room_name, dr.building AS default_building,
           dr.floor AS default_floor, dr.nav_guide AS default_nav_guide, dr.location_type AS default_room_type
    FROM Faculty f
    JOIN Users u ON f.user_id = u.user_id
    JOIN Departments d ON f.dept_id = d.dept_id
    LEFT JOIN Location dr ON f.default_room_id = dr.location_id
    ORDER BY u.full_name`);

    const result = faculty.map(fac => {
        const schedule = db.get(`
      SELECT s.subject, l.location_name, l.building, l.floor, l.nav_guide, l.location_type,
             ts.slot_label, ts.start_time, ts.end_time
      FROM Schedule s
      JOIN Time_Slot ts ON s.slot_id = ts.slot_id
      JOIN Location l ON s.location_id = l.location_id
      WHERE s.faculty_id = ? AND s.day_of_week = ? AND ts.start_time <= ? AND ts.end_time > ?`,
            [fac.faculty_id, dayOfWeek, currentTime, currentTime]);
        if (schedule) {
            return { ...fac, status: 'in_class', current_location: schedule.location_name, current_building: schedule.building, current_floor: schedule.floor, nav_guide: schedule.nav_guide, location_type: schedule.location_type, subject: schedule.subject, slot_label: schedule.slot_label, time_range: `${schedule.start_time} – ${schedule.end_time}` };
        }
        return { ...fac, status: 'in_staff_room', current_location: fac.default_room_name || 'Unknown', current_building: fac.default_building, current_floor: fac.default_floor, nav_guide: fac.default_nav_guide || 'Contact department for directions.', location_type: fac.default_room_type || 'staff_room', subject: null, slot_label: null, time_range: null };
    });
    res.json({ currentTime, dayOfWeek, faculty: result });
});

router.get('/dept/:deptId', authenticate, (req, res) => {
    const { deptId } = req.params;
    if (req.user.role !== 'admin' && req.user.dept_id !== parseInt(deptId)) return res.status(403).json({ error: 'Access denied' });
    res.json(db.all(`SELECT f.faculty_id, f.designation, f.phone, f.default_room_id, u.user_id, u.full_name, u.email, u.is_active, u.username FROM Faculty f JOIN Users u ON f.user_id = u.user_id WHERE f.dept_id = ? ORDER BY u.full_name`, [deptId]));
});

// ── Self-resolving routes for the logged-in faculty (must be before /:facultyId) ──

router.get('/me', authenticate, (req, res) => {
    const self = db.get('SELECT faculty_id, designation, phone, default_room_id FROM Faculty WHERE user_id=?', [req.user.user_id]);
    if (!self) return res.status(404).json({ error: 'No faculty profile linked to your account.' });
    res.json(self);
});

router.get('/me/schedule', authenticate, (req, res) => {
    const self = db.get('SELECT faculty_id FROM Faculty WHERE user_id=?', [req.user.user_id]);
    if (!self) return res.status(404).json({ error: 'No faculty profile linked to your account.' });
    console.log(`[Faculty] GET /me/schedule → user_id=${req.user.user_id}, faculty_id=${self.faculty_id}`);
    const schedule = db.all(`
    SELECT s.schedule_id, s.day_of_week, s.subject,
           ts.slot_id, ts.slot_label, ts.start_time, ts.end_time,
           l.location_id, l.location_name, l.building, l.floor, l.location_type
    FROM Schedule s
    JOIN Time_Slot ts ON s.slot_id = ts.slot_id
    JOIN Location l ON s.location_id = l.location_id
    WHERE s.faculty_id = ?
    ORDER BY CASE s.day_of_week WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 END, ts.start_time`,
        [self.faculty_id]);
    console.log(`[Faculty] /me/schedule returned ${schedule.length} rows for faculty_id=${self.faculty_id}`);
    res.json({ faculty_id: self.faculty_id, schedule });
});

router.get('/:facultyId/schedule', authenticate, (req, res) => {
    res.json(db.all(`
    SELECT s.schedule_id, s.day_of_week, s.subject, ts.slot_id, ts.slot_label, ts.start_time, ts.end_time,
           l.location_name, l.building, l.floor, l.location_type
    FROM Schedule s JOIN Time_Slot ts ON s.slot_id = ts.slot_id JOIN Location l ON s.location_id = l.location_id
    WHERE s.faculty_id = ?
    ORDER BY CASE s.day_of_week WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3 WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6 END, ts.start_time`,
        [req.params.facultyId]));
});

router.post('/:facultyId/schedule', authenticate, (req, res) => {
    const { role } = req.user;
    const { facultyId } = req.params;
    const { slot_id, location_id, day_of_week, subject } = req.body;
    if (!['admin', 'hod', 'coordinator', 'faculty'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'faculty') {
        const self = db.get('SELECT faculty_id FROM Faculty WHERE user_id=?', [req.user.user_id]);
        if (!self || self.faculty_id !== parseInt(facultyId)) return res.status(403).json({ error: 'Can only edit own schedule' });
    }
    try {
        const r = db.run('INSERT INTO Schedule(faculty_id,slot_id,location_id,day_of_week,subject) VALUES(?,?,?,?,?)', [facultyId, slot_id, location_id, day_of_week, subject]);
        db.persist();
        res.json({ schedule_id: r.lastInsertRowid });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/schedule/:scheduleId', authenticate, (req, res) => {
    const { role } = req.user;
    if (role === 'student') return res.status(403).json({ error: 'Forbidden' });
    if (role === 'faculty') {
        const self = db.get('SELECT faculty_id FROM Faculty WHERE user_id=?', [req.user.user_id]);
        const s = db.get('SELECT * FROM Schedule WHERE schedule_id=?', [req.params.scheduleId]);
        if (!s || s.faculty_id !== self?.faculty_id) return res.status(403).json({ error: 'Forbidden' });
    }
    db.run('DELETE FROM Schedule WHERE schedule_id=?', [req.params.scheduleId]);
    db.persist();
    res.json({ success: true });
});

router.put('/:facultyId', authenticate, (req, res) => {
    const { role } = req.user;
    if (!['admin', 'hod', 'coordinator', 'faculty'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'faculty') {
        const self = db.get('SELECT faculty_id FROM Faculty WHERE user_id=?', [req.user.user_id]);
        if (!self || self.faculty_id !== parseInt(req.params.facultyId)) return res.status(403).json({ error: 'Forbidden' });
    }
    const { designation, default_room_id, phone } = req.body;
    if (designation) db.run('UPDATE Faculty SET designation=? WHERE faculty_id=?', [designation, req.params.facultyId]);
    if (default_room_id) db.run('UPDATE Faculty SET default_room_id=? WHERE faculty_id=?', [default_room_id, req.params.facultyId]);
    if (phone) db.run('UPDATE Faculty SET phone=? WHERE faculty_id=?', [phone, req.params.facultyId]);
    db.persist();
    res.json({ success: true });
});

module.exports = router;
