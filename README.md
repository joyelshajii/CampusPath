# CampusPath: Campus Navigation System

CampusPath is a comprehensive, full-stack campus navigation and management system designed to streamline faculty availability tracking, event venue management, and real-time navigation. It features a robust Role-Based Access Control (RBAC) system for various campus stakeholders.

##  Key Features

-   **Role-Based Access Control (RBAC)**: Custom dashboards and permissions for students, faculty, coordinators, HODs, and admins.
-   **Faculty Management**: Track faculty availability, schedules, and departmental details.
-   **Event & Venue Tracking**: Manage campus events, check venue availability, and book locations.
-   **Interactive Navigation**: Real-time campus navigation to find departments, blocks, and specific rooms.
-   **Department Coordination**: Tools for HODs and Coordinators to manage their respective departments and faculty.

##  Technology Stack

-   **Frontend**: 
    -   HTML5 & CSS3 (Custom responsive designs)
    -   Vanilla JavaScript (Single-page application logic)
-   **Backend**: 
    -   Node.js & Express.js
    -   JWT (JSON Web Tokens) for secure authentication
    -   Bcrypt.js for password hashing
-   **Database**: 
    -   SQL.js (SQLite implementation for Node.js)

##  Project Structure

```text
campuspath2/
├── public/             # Frontend assets
│   ├── css/            # Stylings
│   ├── js/             # Frontend logic & API handlers
│   └── index.html      # Main application entry
├── server/             # Backend application
│   ├── middleware/     # Auth & RBAC logic
│   ├── routes/         # API endpoints (Auth, Users, Events, etc.)
│   ├── database.js     # SQL.js initialization & queries
│   └── index.js        # Server entry point
└── campuspath.sqlite   # Project database
```

##  Setup & Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/campuspath.git
    cd campuspath
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Application**:
    ```bash
    npm start
    # or
    npm run dev
    ```

4.  **Access the App**:
    Open your browser and navigate to `http://localhost:3000`.

##  User Roles

-   **Admin**: Full system control, user management, and global data access.
-   **HOD (Head of Department)**: Manage departmental faculty, schedules, and reports.
-   **Coordinator**: Assist in scheduling and departmental event management.
-   **Faculty**: Manage personal schedules, availability, and view student requests.
-   **Student**: View navigation, faculty schedules, and event updates.

##  License

This project is licensed under the MIT License - see the LICENSE file for details.

---

