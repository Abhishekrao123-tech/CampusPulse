# 🗄️ MySQL Database Setup Guide — CampusPulse

Follow these steps to set up and configure your local MySQL database for **CampusPulse**.

## Prerequisites
- **MySQL Server** installed (version 8.0 or higher recommended).
- **MySQL Command Line Client** or GUI tools like **phpMyAdmin**, **MySQL Workbench**, or **DBeaver**.

---

## Step 1: Install MySQL Server (If not already installed)
- **Windows**: Download and install [MySQL Installer](https://dev.mysql.com/downloads/installer/). Configure it to run as a service, selecting a secure password for the `root` user.
- **Mac**: Install using Homebrew:
  ```bash
  brew install mysql
  brew services start mysql
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt update
  sudo apt install mysql-server
  sudo systemctl start mysql
  ```

---

## Step 2: Import the Database Schema
1. Open your terminal or MySQL command line client.
2. Login to MySQL as root (or your configured administrative user):
   ```bash
   mysql -u root -p
   ```
3. Enter your password.
4. Exit MySQL and run the schema import command directly from the project root directory:
   ```bash
   mysql -u root -p < schema.sql
   ```
   *Alternative: If you are inside a MySQL CLI session, execute:*
   ```sql
   SOURCE c:/Users/Abhishek Rao/OneDrive/Desktop/event/schema.sql;
   ```

This will automatically:
- Create the database `campuspulse` if it doesn't exist.
- Build the tables: `users`, `events`, `registrations`, `notifications`, `event_feedback`, `bookmarks`, and `event_comments`.
- Configure the correct primary key, foreign key constraints, and cascade delete indexes.
- Insert the default demo accounts.

---

## Step 3: Verify the Imported Tables
Connect to the database via MySQL client:
```sql
USE campuspulse;
SHOW TABLES;
```
You should see:
- `bookmarks`
- `event_comments`
- `event_feedback`
- `events`
- `notifications`
- `registrations`
- `users`

---

## Step 4: Configure Backend Environment Variables
Update the `backend/.env` file with your MySQL credentials:
```ini
# Database Configuration
DB_HOST=127.0.0.1
DB_USER=root            # Your MySQL username
DB_PASSWORD=yourpassword # Your MySQL root password
DB_NAME=campuspulse
DB_PORT=3306
```

---

## Step 5: Run Database Verification Test
To confirm that your credentials and tables are linked correctly, execute the test script from the `backend` folder:
```bash
cd backend
node test.js
```
Upon success, the terminal will log:
`🎉 ALL DATABASE INTEGRATION CHECKS COMPLETED SUCCESSFULLY!`

---

## 👥 Seed User Credentials

The database script automatically populates two roles for testing. You can use these to login to the app:

1. **Student Account**:
   - **Email**: `student@campus.edu`
   - **Password**: `password`
   - **Role**: student
2. **Admin Account**:
   - **Email**: `admin@campus.edu`
   - **Password**: `admin123`
   - **Role**: admin
