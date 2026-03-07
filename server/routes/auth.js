'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    try {
        const user = db.get(`
      SELECT u.user_id, u.username, u.password_hash, u.full_name, u.email, u.is_active, u.dept_id,
             r.role_name AS role, d.dept_name, d.dept_code
      FROM Users u
      JOIN Roles r ON u.role_id = r.role_id
      LEFT JOIN Departments d ON u.dept_id = d.dept_id
      WHERE u.username = ?`, [username]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.is_active) return res.status(403).json({ error: 'Account is disabled. Contact your HOD or Admin.' });
        if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ user_id: user.user_id, role: user.role, dept_id: user.dept_id, full_name: user.full_name }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { user_id: user.user_id, username: user.username, full_name: user.full_name, email: user.email, role: user.role, dept_id: user.dept_id, dept_name: user.dept_name, dept_code: user.dept_code } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/logout', (_req, res) => res.json({ message: 'Logged out' }));
module.exports = router;
