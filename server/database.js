'use strict';
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'campuspath.sqlite');

// We expose a promise-based approach internally but provide synchronous-like API via a wrapper
let _db = null;

// ─── Synchronous-style wrapper ────────────────────────────
// sql.js is sync after initialization; we just need to init the WASM first.
// We expose `getDb()` which returns the initialized DB instance.

let _dbReady = false;
let _dbInitCallbacks = [];

async function initDb() {
  const SQL = await initSqlJs();
  let data;
  if (fs.existsSync(DB_PATH)) {
    data = fs.readFileSync(DB_PATH);
  }
  _db = new SQL.Database(data || undefined);
  _db.run('PRAGMA foreign_keys = ON;');
  createSchema();
  seed();
  _dbReady = true;
  _dbInitCallbacks.forEach(cb => cb(_db));
  _dbInitCallbacks = [];
  return _db;
}

function persist() {
  if (_db) {
    fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
  }
}

// ─── Helper wrappers to mimic better-sqlite3 API ─────────
function run(sql, params = []) {
  _db.run(sql, params);
  const rows = _db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: rows[0]?.values[0][0] || 0, changes: _db.getRowsModified() };
}

function get(sql, params = []) {
  const result = _db.exec(sql, params);
  if (!result.length || !result[0].values.length) return undefined;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const obj = {};
  cols.forEach((c, i) => { obj[c] = vals[i]; });
  return obj;
}

function all(sql, params = []) {
  const result = _db.exec(sql, params);
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((c, i) => { obj[c] = vals[i]; });
    return obj;
  });
}

// ─── Schema ───────────────────────────────────────────────
function createSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS Roles (
      role_id INTEGER PRIMARY KEY AUTOINCREMENT, role_name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Departments (
      dept_id INTEGER PRIMARY KEY AUTOINCREMENT, dept_name TEXT NOT NULL UNIQUE, dept_code TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS Users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role_id INTEGER NOT NULL, dept_id INTEGER,
      full_name TEXT NOT NULL, email TEXT UNIQUE, is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS Faculty (
      faculty_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
      dept_id INTEGER NOT NULL, designation TEXT NOT NULL DEFAULT 'Assistant Professor',
      default_room_id INTEGER, phone TEXT
    );
    CREATE TABLE IF NOT EXISTS Students (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
      dept_id INTEGER NOT NULL, roll_number TEXT NOT NULL UNIQUE, semester INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS Location (
      location_id INTEGER PRIMARY KEY AUTOINCREMENT, dept_id INTEGER,
      location_name TEXT NOT NULL, location_type TEXT NOT NULL,
      building TEXT, floor TEXT, nav_guide TEXT
    );
    CREATE TABLE IF NOT EXISTS Time_Slot (
      slot_id INTEGER PRIMARY KEY AUTOINCREMENT, slot_label TEXT NOT NULL,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Schedule (
      schedule_id INTEGER PRIMARY KEY AUTOINCREMENT, faculty_id INTEGER NOT NULL,
      slot_id INTEGER NOT NULL, location_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL, subject TEXT NOT NULL,
      UNIQUE(faculty_id, slot_id, day_of_week)
    );
    CREATE TABLE IF NOT EXISTS Events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT, dept_id INTEGER, location_id INTEGER,
      created_by INTEGER NOT NULL, event_name TEXT NOT NULL, description TEXT,
      event_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1
    );
  `);
}

// ─── Seed ─────────────────────────────────────────────────
function seed() {
  const existing = get('SELECT COUNT(*) as c FROM Roles');
  if (existing && existing.c > 0) { console.log('[DB] Already seeded.'); return; }
  console.log('[DB] Seeding database...');

  // Roles
  for (const r of ['admin', 'hod', 'coordinator', 'faculty', 'student']) {
    run('INSERT INTO Roles(role_name) VALUES(?)', [r]);
  }
  const getRoleId = (n) => get('SELECT role_id FROM Roles WHERE role_name=?', [n]).role_id;

  // Departments
  run('INSERT INTO Departments(dept_name,dept_code) VALUES(?,?)', ['Computer Science & Engineering', 'CSE']);
  run('INSERT INTO Departments(dept_name,dept_code) VALUES(?,?)', ['Electronics & Communication', 'ECE']);
  const cseDeptId = get('SELECT dept_id FROM Departments WHERE dept_code=?', ['CSE']).dept_id;

  // Time Slots
  for (const [l, s, e] of [['Period 1', '08:30', '09:25'], ['Period 2', '09:25', '10:20'], ['Period 3', '10:35', '11:30'], ['Period 4', '11:30', '12:25'], ['Period 5', '13:15', '14:10'], ['Period 6', '14:10', '15:05'], ['Period 7', '15:05', '16:00']]) {
    run('INSERT INTO Time_Slot(slot_label,start_time,end_time) VALUES(?,?,?)', [l, s, e]);
  }

  // Locations
  const locs = [
    [cseDeptId, 'CSE Lab 1', 'lab', 'Tech Block', 'Ground Floor', 'Enter Tech Block main entrance, turn left, first door on right — Room TG-01.'],
    [cseDeptId, 'CSE Lab 2', 'lab', 'Tech Block', 'Ground Floor', 'Enter Tech Block main entrance, turn left, second door on right — Room TG-02.'],
    [cseDeptId, 'AI & ML Lab', 'lab', 'Tech Block', 'First Floor', 'Take stairs to first floor, straight down the corridor — Room TF-10.'],
    [cseDeptId, 'Networking Lab', 'lab', 'Tech Block', 'First Floor', 'First floor, left wing, end of corridor — Room TF-12.'],
    [cseDeptId, 'CS Classroom A', 'classroom', 'Main Block', 'Ground Floor', 'Main Block ground floor, right wing, Room MG-03.'],
    [cseDeptId, 'CS Classroom B', 'classroom', 'Main Block', 'Ground Floor', 'Main Block ground floor, right wing, Room MG-04.'],
    [cseDeptId, 'CS Classroom C', 'classroom', 'Main Block', 'First Floor', 'First floor, right wing — Room MF-05.'],
    [cseDeptId, 'Project Lab', 'lab', 'Tech Block', 'Second Floor', 'Second floor, Tech Block — Room TS-01 (near lift).'],
    [cseDeptId, 'HOD Staff Room', 'staff_room', 'Admin Block', 'First Floor', 'Admin Block, first floor, corridor end — Room AF-01.'],
    [cseDeptId, 'Faculty Staff Room A', 'staff_room', 'Tech Block', 'Ground Floor', 'Tech Block, ground floor, behind the reception — Room TG-10.'],
    [cseDeptId, 'Faculty Staff Room B', 'staff_room', 'Tech Block', 'First Floor', 'Tech Block, first floor, left of the stairwell — Room TF-11.'],
    [null, 'Main Auditorium', 'auditorium', 'Main Block', 'Ground Floor', 'Enter main gate, straight ahead — the large hall at the end of the corridor.'],
  ];
  for (const [d, n, t, b, f, g] of locs) run('INSERT INTO Location(dept_id,location_name,location_type,building,floor,nav_guide) VALUES(?,?,?,?,?,?)', [d, n, t, b, f, g]);

  const getLoc = (n) => get('SELECT location_id FROM Location WHERE location_name=?', [n]).location_id;
  const staffRoomA = getLoc('Faculty Staff Room A');
  const staffRoomB = getLoc('Faculty Staff Room B');
  const hodRoom = getLoc('HOD Staff Room');

  // Create user helper
  const createUser = (uname, pw, role, deptId, name, email) => {
    const hash = bcrypt.hashSync(pw, 10);
    const rid = getRoleId(role);
    return run('INSERT INTO Users(username,password_hash,role_id,dept_id,full_name,email) VALUES(?,?,?,?,?,?)', [uname, hash, rid, deptId, name, email || null]).lastInsertRowid;
  };

  // Admin
  createUser('admin', 'admin123', 'admin', null, 'System Administrator', 'admin@campuspath.edu');

  // HOD
  const hodUid = createUser('hod.cse', 'hod123', 'hod', cseDeptId, 'Dr. Priya Menon', 'priya.menon@cse.edu');
  const hodFacId = run('INSERT INTO Faculty(user_id,dept_id,designation,default_room_id,phone) VALUES(?,?,?,?,?)', [hodUid, cseDeptId, 'Professor & HOD', hodRoom, '9876543210']).lastInsertRowid;

  // Coordinators (no faculty record)
  createUser('coord.cse1', 'coord123', 'coordinator', cseDeptId, 'Mr. Arun Kumar', 'arun.kumar@cse.edu');
  createUser('coord.cse2', 'coord123', 'coordinator', cseDeptId, 'Ms. Divya Nair', 'divya.nair@cse.edu');

  // Faculty (5)
  const fac1Uid = createUser('alice.john', 'fac123', 'faculty', cseDeptId, 'Dr. Alice Johnson', 'alice.j@cse.edu');
  const fac2Uid = createUser('bob.smith', 'fac123', 'faculty', cseDeptId, 'Prof. Bob Smith', 'bob.s@cse.edu');
  const fac3Uid = createUser('carol.das', 'fac123', 'faculty', cseDeptId, 'Dr. Carol Das', 'carol.d@cse.edu');
  const fac4Uid = createUser('david.raj', 'fac123', 'faculty', cseDeptId, 'Prof. David Raj', 'david.r@cse.edu');
  const fac5Uid = createUser('eva.thomas', 'fac123', 'faculty', cseDeptId, 'Dr. Eva Thomas', 'eva.t@cse.edu');

  const ins = (uid, deptId, desig, room, ph) => run('INSERT INTO Faculty(user_id,dept_id,designation,default_room_id,phone) VALUES(?,?,?,?,?)', [uid, deptId, desig, room, ph]).lastInsertRowid;
  const f1 = ins(fac1Uid, cseDeptId, 'Associate Professor', staffRoomA, '9001001001');
  const f2 = ins(fac2Uid, cseDeptId, 'Assistant Professor', staffRoomA, '9001001002');
  const f3 = ins(fac3Uid, cseDeptId, 'Associate Professor', staffRoomB, '9001001003');
  const f4 = ins(fac4Uid, cseDeptId, 'Assistant Professor', staffRoomB, '9001001004');
  const f5 = ins(fac5Uid, cseDeptId, 'Assistant Professor', staffRoomA, '9001001005');

  // Students (10)
  const students = [
    ['s001', 'stu1', cseDeptId, 'Rahul Sharma', 's001@student.edu', 'CS2021001', 5],
    ['s002', 'stu1', cseDeptId, 'Sneha Pillai', 's002@student.edu', 'CS2021002', 5],
    ['s003', 'stu1', cseDeptId, 'Arjun Nambiar', 's003@student.edu', 'CS2021003', 5],
    ['s004', 'stu1', cseDeptId, 'Pooja Iyer', 's004@student.edu', 'CS2021004', 5],
    ['s005', 'stu1', cseDeptId, 'Kiran Babu', 's005@student.edu', 'CS2021005', 5],
    ['s006', 'stu1', cseDeptId, 'Meera George', 's006@student.edu', 'CS2022001', 3],
    ['s007', 'stu1', cseDeptId, 'Vishnu Krishnan', 's007@student.edu', 'CS2022002', 3],
    ['s008', 'stu1', cseDeptId, 'Anjali Das', 's008@student.edu', 'CS2022003', 3],
    ['s009', 'stu1', cseDeptId, 'Rohan Mathew', 's009@student.edu', 'CS2023001', 1],
    ['s010', 'stu1', cseDeptId, 'Lakshmi Suresh', 's010@student.edu', 'CS2023002', 1],
  ];
  for (const [uname, pw, dept, name, email, roll, sem] of students) {
    const uid = createUser(uname, pw, 'student', dept, name, email);
    run('INSERT INTO Students(user_id,dept_id,roll_number,semester) VALUES(?,?,?,?)', [uid, dept, roll, sem]);
  }

  // Schedule
  const getSlot = (l) => get('SELECT slot_id FROM Time_Slot WHERE slot_label=?', [l]).slot_id;
  const addSched = (fid, slot, loc, day, sub) => {
    try { run('INSERT OR IGNORE INTO Schedule(faculty_id,slot_id,location_id,day_of_week,subject) VALUES(?,?,?,?,?)', [fid, getSlot(slot), getLoc(loc), day, sub]); } catch (e) { }
  };

  // Dr. Alice Johnson
  addSched(f1, 'Period 1', 'CS Classroom A', 'Mon', 'Data Structures');
  addSched(f1, 'Period 3', 'CSE Lab 1', 'Mon', 'DS Lab');
  addSched(f1, 'Period 5', 'CS Classroom A', 'Tue', 'Algorithms');
  addSched(f1, 'Period 2', 'CS Classroom B', 'Wed', 'Data Structures');
  addSched(f1, 'Period 6', 'CSE Lab 1', 'Thu', 'DS Lab');
  addSched(f1, 'Period 1', 'CS Classroom C', 'Fri', 'Algorithms');

  // Prof. Bob Smith
  addSched(f2, 'Period 2', 'CS Classroom B', 'Mon', 'Computer Networks');
  addSched(f2, 'Period 4', 'Networking Lab', 'Mon', 'Networks Lab');
  addSched(f2, 'Period 1', 'CS Classroom A', 'Tue', 'Operating Systems');
  addSched(f2, 'Period 3', 'CS Classroom B', 'Wed', 'Computer Networks');
  addSched(f2, 'Period 5', 'Networking Lab', 'Thu', 'Networks Lab');
  addSched(f2, 'Period 2', 'CS Classroom C', 'Fri', 'Operating Systems');

  // Dr. Carol Das
  addSched(f3, 'Period 3', 'CS Classroom C', 'Mon', 'Artificial Intelligence');
  addSched(f3, 'Period 5', 'AI & ML Lab', 'Mon', 'AI Lab');
  addSched(f3, 'Period 2', 'CS Classroom A', 'Tue', 'Machine Learning');
  addSched(f3, 'Period 4', 'AI & ML Lab', 'Wed', 'AI Lab');
  addSched(f3, 'Period 1', 'CS Classroom B', 'Thu', 'Artificial Intelligence');
  addSched(f3, 'Period 3', 'CS Classroom C', 'Fri', 'Machine Learning');

  // Prof. David Raj
  addSched(f4, 'Period 4', 'CS Classroom A', 'Mon', 'Database Management');
  addSched(f4, 'Period 6', 'CSE Lab 2', 'Mon', 'DBMS Lab');
  addSched(f4, 'Period 3', 'CS Classroom B', 'Tue', 'Web Development');
  addSched(f4, 'Period 1', 'CS Classroom C', 'Wed', 'Database Management');
  addSched(f4, 'Period 4', 'CSE Lab 2', 'Thu', 'DBMS Lab');
  addSched(f4, 'Period 5', 'CS Classroom A', 'Fri', 'Web Development');

  // Dr. Eva Thomas
  addSched(f5, 'Period 6', 'CS Classroom B', 'Mon', 'Cloud Computing');
  addSched(f5, 'Period 7', 'Project Lab', 'Mon', 'Project Work');
  addSched(f5, 'Period 4', 'CS Classroom C', 'Tue', 'Cyber Security');
  addSched(f5, 'Period 5', 'CS Classroom B', 'Wed', 'Cloud Computing');
  addSched(f5, 'Period 2', 'Project Lab', 'Thu', 'Project Work');
  addSched(f5, 'Period 6', 'CS Classroom C', 'Fri', 'Cyber Security');

  // HOD schedule
  addSched(hodFacId, 'Period 1', 'CS Classroom B', 'Tue', 'Software Engineering');
  addSched(hodFacId, 'Period 2', 'CS Classroom B', 'Thu', 'Research Methodology');

  // Events
  const adminUid = get('SELECT user_id FROM Users WHERE username=?', ['admin']).user_id;
  const hodUidRef = get('SELECT user_id FROM Users WHERE username=?', ['hod.cse']).user_id;
  const addEv = (deptId, locName, uid, name, desc, date, st, et) =>
    run('INSERT INTO Events(dept_id,location_id,created_by,event_name,description,event_date,start_time,end_time,is_public) VALUES(?,?,?,?,?,?,?,?,1)', [deptId, getLoc(locName), uid, name, desc, date, st, et]);

  addEv(cseDeptId, 'Main Auditorium', hodUidRef, 'TechTalks 2026: AI Revolution', 'A seminar featuring industry experts on the latest AI trends.', '2026-03-05', '10:00', '13:00');
  addEv(cseDeptId, 'AI & ML Lab', hodUidRef, 'ML Workshop — Hands On', 'Practical workshop on building ML models using Python and TensorFlow.', '2026-03-07', '09:00', '12:00');
  addEv(cseDeptId, 'Project Lab', hodUidRef, 'Project Expo 2026', 'Final year student project exhibition for CSE department.', '2026-03-10', '10:00', '17:00');
  addEv(null, 'Main Auditorium', adminUid, 'College Annual Day', 'Grand annual day celebrations with cultural programs.', '2026-03-15', '09:00', '18:00');
  addEv(cseDeptId, 'CS Classroom A', hodUidRef, 'Hackathon Kickoff', 'Orientation and problem statement release for 24hr CSE Hackathon.', '2026-03-20', '14:00', '16:00');
  addEv(cseDeptId, 'Networking Lab', hodUidRef, 'CCNA Certification Prep', 'Preparation session for Cisco CCNA networking certification.', '2026-03-25', '11:00', '14:00');

  persist();
  console.log('[DB] Seed complete!');
}

// ─── Exports ──────────────────────────────────────────────
// We export an object that mirrors the better-sqlite3 synchronous API
// but routes through our sql.js wrapper.
const dbProxy = { run, get, all, persist };

// Initialize and export the ready promise too
dbProxy.ready = initDb().then(() => dbProxy).catch(e => { console.error('[DB] Init failed:', e); process.exit(1); });

module.exports = dbProxy;
