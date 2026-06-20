# 🔌 CampusPulse REST API Documentation

This document describes all API endpoints exposed by the **CampusPulse** backend server.

## Base URL
- **Localhost**: `http://localhost:5000/api`
- **Railway**: `https://<your-railway-app>.up.railway.app/api`

## Headers & Authorization
Protected endpoints require a JSON Web Token (JWT) provided in the `Authorization` header as a Bearer token:
```text
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 1. Authentication Endpoints (`/auth`)

### Register Student
Register a new student account.
- **URL**: `/auth/register`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "johndoe@campus.edu",
    "password": "password123",
    "department": "Computer Science",
    "year": "2"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 3,
      "name": "John Doe",
      "email": "johndoe@campus.edu",
      "department": "Computer Science",
      "year": "2",
      "role": "student",
      "profile_image": null
    }
  }
  ```

### Login User
Authenticate student or admin and retrieve JWT.
- **URL**: `/auth/login`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "student@campus.edu",
    "password": "password"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "name": "Alex Johnson",
      "email": "student@campus.edu",
      "department": "Computer Science",
      "year": "2",
      "role": "student",
      "profile_image": null
    }
  }
  ```

### Logout User
Log out of active session (destroys client state).
- **URL**: `/auth/logout`
- **Method**: `POST`
- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### Get Active Session User
- **URL**: `/auth/me`
- **Method**: `GET`
- **Access**: Private (Protected)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "name": "Alex Johnson",
      "email": "student@campus.edu",
      "department": "Computer Science",
      "year": "2",
      "role": "student",
      "profile_image": null
    }
  }
  ```

### Request Reset Password Token
Request password reset link emailed or logged to console.
- **URL**: `/auth/forgot-password`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "student@campus.edu"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "If email exists, a reset link has been sent"
  }
  ```

### Reset User Password
Update password using token.
- **URL**: `/auth/reset-password`
- **Method**: `POST`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "student@campus.edu",
    "token": "some_token_here",
    "newPassword": "newsecurepassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password reset successfully. You can now log in."
  }
  ```

---

## 📅 2. Event Management Endpoints (`/events`)

### Fetch Events List
Get list of events with query filters.
- **URL**: `/events`
- **Method**: `GET`
- **Access**: Public (Students only see approved events, Admins see all)
- **Query Parameters**:
  - `search` (string)
  - `department` (string)
  - `category` (string)
  - `status` (upcoming/ongoing/expired)
  - `sort` (date_asc/date_desc/popularity/created)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "events": [
      {
        "id": "1",
        "name": "TechFest 2025",
        "description": "24-hour hackathon...",
        "department": "Computer Science",
        "category": "Hackathon",
        "organizer": "CS Club",
        "venue": "Main Auditorium",
        "date": "2026-06-25",
        "time": "09:00",
        "capacity": 200,
        "banner_image": null,
        "color": "#a855f7",
        "status": "approved",
        "registrations": 42
      }
    ]
  }
  ```

### Get Single Event by ID
Retrieves details, comments thread, bookmark status, and registration status.
- **URL**: `/events/:id`
- **Method**: `GET`
- **Access**: Public (Decodes bearer JWT if passed)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "event": {
      "id": "1",
      "name": "TechFest 2025",
      "description": "24-hour hackathon...",
      "department": "Computer Science",
      "category": "Hackathon",
      "organizer": "CS Club",
      "venue": "Main Auditorium",
      "date": "2026-06-25",
      "time": "09:00",
      "capacity": 200,
      "color": "#a855f7",
      "status": "approved",
      "registrations": 42,
      "comments": [
        {
          "id": 5,
          "comment": "Can first years participate?",
          "created_at": "2026-06-19T10:14:00Z",
          "userName": "Alex Johnson",
          "userRole": "student",
          "userProfileImage": null
        }
      ],
      "isRegistered": true,
      "isBookmarked": false,
      "registrationId": 12,
      "attended": false
    }
  }
  ```

### Create Event
- **URL**: `/events`
- **Method**: `POST`
- **Access**: Private (Admin Only)
- **Request Body**:
  ```json
  {
    "name": "AI Workshop",
    "description": "Deep learning intro",
    "department": "Computer Science",
    "category": "Workshop",
    "organizer": "ACM Club",
    "venue": "Lab 3",
    "date": "2026-07-02",
    "time": "14:00",
    "capacity": 50,
    "color": "#3b82f6"
  }
  ```
- **Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Event created successfully",
    "eventId": 4
  }
  ```

### Update Event Details
- **URL**: `/events/:id`
- **Method**: `PUT`
- **Access**: Private (Admin Only)
- **Request Body**: *(Pass only updated fields)*
  ```json
  {
    "venue": "Main Seminar Hall",
    "capacity": 60
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Event updated successfully"
  }
  ```

### Delete Event
- **URL**: `/events/:id`
- **Method**: `DELETE`
- **Access**: Private (Admin Only)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Event deleted successfully"
  }
  ```

---

## 🎫 3. Booking & Registrations (`/registrations`)

### Register Event Ticket
Create new ticket registration, triggers QR code ticket email.
- **URL**: `/registrations`
- **Method**: `POST`
- **Access**: Private (Student Only)
- **Request Body**:
  ```json
  {
    "eventId": 1
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Successfully registered for event",
    "ticketCode": "TKT-167850239023-4523"
  }
  ```

### Cancel Registration
- **URL**: `/registrations/:eventId`
- **Method**: `DELETE`
- **Access**: Private (Student Only)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Registration cancelled successfully"
  }
  ```

### Get My Booked Events
- **URL**: `/registrations/my`
- **Method**: `GET`
- **Access**: Private (Student Only)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "registrations": [
      {
        "registration_id": 12,
        "ticket_code": "TKT-167850239023-4523",
        "attended": false,
        "id": "1",
        "name": "TechFest 2025",
        "department": "Computer Science",
        "category": "Hackathon",
        "date": "2026-06-25",
        "venue": "Main Auditorium",
        "registrations": 42
      }
    ]
  }
  ```

### Mark Attendance (Roll Call Check-in)
Validate student check-in ticket.
- **URL**: `/registrations/:id/attendance`
- **Method**: `PUT`
- **Access**: Private (Admin Only)
- **Request Body**:
  ```json
  {
    "attended": true
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Attendance marked as Attended",
    "attended": true
  }
  ```

### Get Printable Certificate HTML
Renders participation certificate page.
- **URL**: `/registrations/:id/certificate`
- **Method**: `GET`
- **Access**: Public
- **Response (200 OK)**: HTML document formatted for instant printing.

---

## 📈 4. Admin Dashboard Metrics (`/admin`)

### Get Dashboard Summaries
- **URL**: `/admin/dashboard`
- **Method**: `GET`
- **Access**: Private (Admin Only)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "stats": {
      "totalEvents": 12,
      "totalStudents": 84,
      "totalRegistrations": 234,
      "activeDepts": 6
    }
  }
  ```

### Get Charts Analytics Data
- **URL**: `/admin/analytics`
- **Method**: `GET`
- **Access**: Private (Admin Only)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "analytics": {
      "registrationsByDepartment": {
        "Computer Science": 142,
        "Electronics": 34
      },
      "registrationsByCategory": {
        "Hackathon": 90,
        "Workshop": 54
      },
      "topEvents": {
        "TechFest 2025": 142,
        "Startup Pitch": 88
      },
      "monthlyRegistrations": {
        "2026-05": 30,
        "2026-06": 204
      }
    }
  }
  ```

---

## 🔔 5. Notifications Endpoints (`/notifications`)

### Get Alerts List
- **URL**: `/notifications`
- **Method**: `GET`
- **Access**: Private (Protected)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "notifications": [
      {
        "id": 1,
        "title": "Registration Confirmed",
        "message": "You have registered for TechFest 2025.",
        "isRead": false,
        "createdAt": "2026-06-19T12:00:00Z"
      }
    ]
  }
  ```

### Mark Alert as Read
- **URL**: `/notifications/:id/read`
- **Method**: `PUT`
- **Access**: Private (Protected)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Notification marked as read"
  }
  ```
