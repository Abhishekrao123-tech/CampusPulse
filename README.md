# ⚡ CampusPulse — College Event Management System

CampusPulse is a full-stack, production-ready campus event management web application. It allows students to discover, register for, comment on, bookmark, and receive ticketing QR codes for various campus events (hackathons, workshops, fests). Admins can manage events (create, edit, delete, approve), list registrations, mark attendance, and view analytics charts.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Fetch API, QR Server API.
- **Backend**: Node.js, Express.js (REST API).
- **Database**: MySQL (relational storage with constraints).
- **Security**: Helmet, CORS, Express Rate Limiter, Express Sanitizer (`xss-clean`), bcrypt password hashing, and jsonwebtoken (JWT) role authorization middleware.
- **Emails**: Nodemailer with SMTP credentials (and console logging fallbacks).
- **QR Codes**: Node-QR-Code compiler integration.

---

## 📂 Folder Structure

```text
campuspulse/
├── backend/
│   ├── config/
│   │   └── db.js               # MySQL2 connection pool setup
│   ├── controllers/
│   │   ├── adminController.js  # Dashboard statistics & analytics queries
│   │   ├── authController.js   # JWT, Bcrypt register, login & resets
│   │   ├── eventController.js  # Event CRUD, comments & bookmarks
│   │   └── regController.js    # Registering, cancellation, roll call & certs
│   ├── middleware/
│   │   ├── admin.js            # Admin privilege check
│   │   ├── auth.js             # JWT bearer header token validation
│   │   └── upload.js           # Multer storage configuration for avatars/banners
│   ├── routes/
│   │   ├── admin.js            # Dashboard routers
│   │   ├── auth.js             # User account routers
│   │   ├── events.js           # Events routers
│   │   ├── notifications.js    # In-app notifications router
│   │   ├── registrations.js    # Tickets & attendance router
│   │   └── upload.js           # Multer file routers
│   ├── services/
│   │   └── emailService.js     # Nodemailer transactional email module
│   ├── uploads/                # Directory storing avatars/banners
│   │   ├── avatars/
│   │   └── banners/
│   ├── .env                    # Configured environment credentials
│   ├── .env.example            # Environment configuration template
│   ├── package.json            # Node backend dependencies
│   ├── server.js               # Express server entry point
│   └── test.js                 # Integration check script
│
├── frontend/
│   ├── services/
│   │   └── api.js              # Fetch API request wrappers
│   ├── index.html              # Core app client layout
│   ├── reset-password.html     # Reset password form
│   ├── script.js               # Rendering state & user flows
│   ├── style.css               # Theme styling sheet
│   └── vercel.json             # Vercel SPA routing rules
│
├── schema.sql                  # MySQL database initialization script
├── DATABASE_SETUP.md           # Local database installation guide
├── API_DOCUMENTATION.md        # Comprehensive REST endpoints guide
└── README.md                   # This instructions file
```

---

## ✨ Features (Including Bonus Additions)

1. **Authentication**: JWT token storage, bcrypt password hashes, protected router middlewares.
2. **Role Authorization**: Distinct views/features for **Students** and **Admins**.
3. **Event Approval Workflow**: Student club event creations start as `pending` and must be validated/approved by admins.
4. **QR Code Tickets**: Automatically generated unique ticketing code shown inside event bookings details page, with emailed copy.
5. **Attendance Mark**: Admins have a checkbox roll-call register list to check in students attending an event.
6. **Certificate of Participation**: Once attendance is marked, a professional, printable HTML certificate becomes downloadable.
7. **Emails Service**: Sends transactional emails on registrations (with embedded QR code), event updates, and password resets.
8. **Dark Mode Persistence**: Seamless light/dark mode toggler in the navbar that persists in browser local storage.
9. **Comments**: Real-time forum chat comments posted inside event detail views.
10. **Bookmarks**: Flag events of interest to track them in student dashboard panels.
11. **Analytics Dashboard**: Dynamic bar charts listing registrations by category, department popularity, and monthly timelines.

---

## 🚀 Quick Start Guide

### 1. Database Setup

Ensure MySQL Server is running locally. Import the schema script to configure tables:

```bash
mysql -u root -p < schema.sql
```

_(Refer to [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed credentials setup instructions)._

### 2. Backend Environment Variables

Configure the environment variables in `backend/.env`. Refer to `backend/.env.example` for keys.

### 3. Install & Start Backend

Run the following commands:

```bash
cd backend
npm install
npm run dev
```

The backend API server will start on port `5000`.

### 4. Open Frontend

You can host the `frontend` folder using any static server (like VS Code Live Server or python simple HTTP server). By default, the frontend is configured to connect to `http://localhost:5000/api` for local execution.

---

## 🧪 Running Integration Checks

To verify connection pools and query schemas, run:

```bash
cd backend
node test.js
```

## 📄 Documentation

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [DATABASE_SETUP.md](DATABASE_SETUP.md)
