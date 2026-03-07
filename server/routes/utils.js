'use strict';
const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/slots', authenticate, (req, res) => res.json(db.all('SELECT * FROM Time_Slot ORDER BY start_time')));
router.get('/departments', authenticate, (req, res) => res.json(db.all('SELECT * FROM Departments ORDER BY dept_name')));
router.get('/roles', authenticate, (req, res) => res.json(db.all('SELECT * FROM Roles ORDER BY role_id')));

module.exports = router;
