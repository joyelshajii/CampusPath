'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

function canAccessDept(reqUser, targetDeptId) {
    if (reqUser.role === 'admin') return true;
    return reqUser.dept_id === parseInt(targetDeptId);
}

// GET /users — HOD, Coordinator, Admin can all see all users globally (for viewing)
// Dept scoping is only enforced at write time
router.get('/', authenticate, (req, res) => {
    const { role } = req.user;
    const { role_filter, dept_id: deptFilter } = req.query;
    let sql = `SELECT u.user_id, u.username, u.full_name, u.email, u.is_active, r.role_name AS role,
             d.dept_name, d.dept_code, d.dept_id,
             f.faculty_id, f.designation, f.phone,
             s.student_id, s.roll_number, s.semester
             FROM Users u JOIN Roles r ON u.role_id = r.role_id
             LEFT JOIN Departments d ON u.dept_id = d.dept_id
             LEFT JOIN Faculty f ON u.user_id = f.user_id
             LEFT JOIN Students s ON u.user_id = s.user_id
             WHERE 1=1`;
    const params = [];
    // Only admin can filter by specific dept via query param
    if (deptFilter) { sql += ' AND u.dept_id = ?'; params.push(deptFilter); }
    if (role_filter) { sql += ' AND r.role_name = ?'; params.push(role_filter); }
    sql += ' ORDER BY r.role_id, u.full_name';
    res.json(db.all(sql, params));
});

router.get('/:id', authenticate, (req, res) => {
    const u = db.get(`SELECT u.user_id, u.username, u.full_name, u.email, u.is_active, u.dept_id,
    r.role_name AS role, d.dept_name, f.faculty_id, f.designation, f.phone, f.default_room_id,
    s.student_id, s.roll_number, s.semester
    FROM Users u JOIN Roles r ON u.role_id = r.role_id LEFT JOIN Departments d ON u.dept_id = d.dept_id
    LEFT JOIN Faculty f ON u.user_id = f.user_id LEFT JOIN Students s ON u.user_id = s.user_id
    WHERE u.user_id = ?`, [req.params.id]);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
});

router.post('/', authenticate, (req, res) => {
    const { role } = req.user;
    if (!['admin', 'hod', 'coordinator'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const { username, password, full_name, email, role_name, dept_id, designation, phone, roll_number, semester } = req.body;
    if (!username || !password || !full_name || !role_name) return res.status(400).json({ error: 'Missing required fields' });
    if (role === 'hod' && !['coordinator', 'faculty', 'student'].includes(role_name)) return res.status(403).json({ error: 'HOD can only create coordinator/faculty/student' });
    if (role === 'coordinator' && role_name !== 'student') return res.status(403).json({ error: 'Coordinators can only create students' });

    // Determine effective dept_id: non-admins always use their own dept
    const effectiveDeptId = (role === 'admin') ? (dept_id || null) : req.user.dept_id;

    const roleRow = db.get('SELECT role_id FROM Roles WHERE role_name=?', [role_name]);
    if (!roleRow) return res.status(400).json({ error: 'Invalid role' });

    // Enforce one HOD per department
    if (role_name === 'hod' && effectiveDeptId) {
        const hodRoleId = db.get('SELECT role_id FROM Roles WHERE role_name=?', ['hod']);
        const existingHod = db.get('SELECT u.user_id, u.full_name FROM Users u WHERE u.role_id=? AND u.dept_id=?', [hodRoleId.role_id, effectiveDeptId]);
        if (existingHod) {
            return res.status(409).json({ error: `An HOD already exists for this department (${existingHod.full_name}). Only one HOD is allowed per department.` });
        }
    }

    const hash = bcrypt.hashSync(password, 10);
    let userId;
    try {
        const r = db.run(
            'INSERT INTO Users(username,password_hash,role_id,dept_id,full_name,email) VALUES(?,?,?,?,?,?)',
            [username, hash, roleRow.role_id, effectiveDeptId, full_name, email || null]
        );
        userId = r.lastInsertRowid;
    } catch (e) {
        return res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Username or email already exists' : e.message });
    }

    // Secondary inserts are separate — errors here don't invalidate the user creation
    try {
        if (['faculty', 'hod'].includes(role_name)) {
            db.run(
                'INSERT INTO Faculty(user_id,dept_id,designation,phone) VALUES(?,?,?,?)',
                [userId, effectiveDeptId, designation || 'Assistant Professor', phone || null]
            );
        } else if (role_name === 'student') {
            if (!roll_number) {
                // Rollback and return error
                db.run('DELETE FROM Users WHERE user_id=?', [userId]);
                db.persist();
                return res.status(400).json({ error: 'Roll number required for students' });
            }
            db.run(
                'INSERT INTO Students(user_id,dept_id,roll_number,semester) VALUES(?,?,?,?)',
                [userId, effectiveDeptId, roll_number, semester || 1]
            );
        } else if (role_name === 'coordinator') {
            // coordinators don't need a Faculty/Students record but ensure dept linked
        }
    } catch (e) {
        // Secondary insert failed — report but user was created
        console.error('Secondary insert failed for user', userId, e.message);
    }

    db.persist();
    res.json({ user_id: userId, success: true });
});

router.put('/:id', authenticate, (req, res) => {
    const { role, user_id } = req.user;
    const targetId = parseInt(req.params.id);
    const target = db.get('SELECT u.*, r.role_name FROM Users u JOIN Roles r ON u.role_id=r.role_id WHERE u.user_id=?', [targetId]);
    if (!target) return res.status(404).json({ error: 'Not found' });
    // Non-admins can only edit users in their own dept or themselves
    if (role !== 'admin' && target.dept_id !== req.user.dept_id && user_id !== targetId) return res.status(403).json({ error: 'Forbidden' });
    const { full_name, email, password, designation, phone, default_room_id, roll_number, semester } = req.body;
    if (full_name) db.run('UPDATE Users SET full_name=? WHERE user_id=?', [full_name, targetId]);
    if (email) db.run('UPDATE Users SET email=? WHERE user_id=?', [email, targetId]);
    if (password) db.run('UPDATE Users SET password_hash=? WHERE user_id=?', [bcrypt.hashSync(password, 10), targetId]);
    const fac = db.get('SELECT faculty_id FROM Faculty WHERE user_id=?', [targetId]);
    if (fac) {
        if (designation) db.run('UPDATE Faculty SET designation=? WHERE faculty_id=?', [designation, fac.faculty_id]);
        if (phone) db.run('UPDATE Faculty SET phone=? WHERE faculty_id=?', [phone, fac.faculty_id]);
        if (default_room_id !== undefined && default_room_id !== null) db.run('UPDATE Faculty SET default_room_id=? WHERE faculty_id=?', [default_room_id, fac.faculty_id]);
    }
    const stu = db.get('SELECT student_id FROM Students WHERE user_id=?', [targetId]);
    if (stu) {
        if (roll_number) db.run('UPDATE Students SET roll_number=? WHERE student_id=?', [roll_number, stu.student_id]);
        if (semester) db.run('UPDATE Students SET semester=? WHERE student_id=?', [semester, stu.student_id]);
    }
    db.persist();
    res.json({ success: true });
});

router.delete('/:id', authenticate, (req, res) => {
    const { role } = req.user;
    if (!['admin', 'hod', 'coordinator'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const target = db.get('SELECT u.*, r.role_name FROM Users u JOIN Roles r ON u.role_id=r.role_id WHERE u.user_id=?', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'Not found' });
    if (role !== 'admin' && target.dept_id !== req.user.dept_id) return res.status(403).json({ error: 'Dept mismatch' });
    if (role === 'coordinator' && target.role_name !== 'student') return res.status(403).json({ error: 'Coordinators can only delete students' });
    if (role === 'hod' && target.role_name === 'admin') return res.status(403).json({ error: 'Cannot delete admin' });
    db.run('DELETE FROM Faculty WHERE user_id=?', [req.params.id]);
    db.run('DELETE FROM Students WHERE user_id=?', [req.params.id]);
    db.run('DELETE FROM Users WHERE user_id=?', [req.params.id]);
    db.persist();
    res.json({ success: true });
});

router.patch('/:id/access', authenticate, (req, res) => {
    const { role } = req.user;
    if (!['admin', 'hod'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const target = db.get('SELECT u.*, r.role_name FROM Users u JOIN Roles r ON u.role_id=r.role_id WHERE u.user_id=?', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'Not found' });
    if (role !== 'admin' && target.dept_id !== req.user.dept_id) return res.status(403).json({ error: 'Dept mismatch' });
    const { is_active } = req.body;
    db.run('UPDATE Users SET is_active=? WHERE user_id=?', [is_active ? 1 : 0, req.params.id]);
    db.persist();
    res.json({ success: true, is_active: is_active ? 1 : 0 });
});

router.patch('/:id/role', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { role_name } = req.body;
    const roleRow = db.get('SELECT role_id FROM Roles WHERE role_name=?', [role_name]);
    if (!roleRow) return res.status(400).json({ error: 'Invalid role' });

    // Enforce one HOD per department when changing role to HOD
    if (role_name === 'hod') {
        const u = db.get('SELECT * FROM Users WHERE user_id=?', [req.params.id]);
        if (u && u.dept_id) {
            const existingHod = db.get('SELECT u2.user_id, u2.full_name FROM Users u2 WHERE u2.role_id=? AND u2.dept_id=? AND u2.user_id!=?', [roleRow.role_id, u.dept_id, req.params.id]);
            if (existingHod) {
                return res.status(409).json({ error: `An HOD already exists for this department (${existingHod.full_name}). Only one HOD is allowed per department.` });
            }
        }
    }

    db.run('UPDATE Users SET role_id=? WHERE user_id=?', [roleRow.role_id, req.params.id]);
    if (['faculty', 'hod'].includes(role_name)) {
        const exists = db.get('SELECT faculty_id FROM Faculty WHERE user_id=?', [req.params.id]);
        if (!exists) {
            const u = db.get('SELECT * FROM Users WHERE user_id=?', [req.params.id]);
            if (u.dept_id) db.run('INSERT OR IGNORE INTO Faculty(user_id,dept_id,designation) VALUES(?,?,?)', [req.params.id, u.dept_id, 'Assistant Professor']);
        }
    }
    db.persist();
    res.json({ success: true });
});

module.exports = router;
