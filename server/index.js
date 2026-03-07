'use strict';
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty');
const eventsRoutes = require('./routes/events');
const locationsRoutes = require('./routes/locations');
const usersRoutes = require('./routes/users');
const departmentsRoutes = require('./routes/departments');
const utilsRoutes = require('./routes/utils');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/utils', utilsRoutes);

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Wait for DB to be ready before accepting requests
db.ready.then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 CampusPath running at http://localhost:${PORT}\n`);
        console.log('Default logins:');
        console.log('  Admin:       admin / admin123');
        console.log('  HOD:         hod.cse / hod123');
        console.log('  Coordinator: coord.cse1 / coord123');
        console.log('  Faculty:     alice.john / fac123');
        console.log('  Student:     s001 / stu1\n');
    });
});
