# 🔐 KubeGraf First-Time Setup Guide

**Version**: v1.3.0-rc1
**Date**: December 3, 2025
**Status**: ✅ Complete Login System Available

---

## ❓ How Do I Get Login Credentials for the First Time?

Great question! KubeGraf now has a **complete IAM (Identity and Access Management) system** that allows you to create your first admin user and then manage additional users. Here's how it works:

---

## 🚀 Quick Start (First-Time Login)

### Step 1: Access the Application

1. Open your browser and navigate to: **http://localhost:3001**
2. In the sidebar, click **"User Management"** (under the Cluster section)

### Step 2: Create Your First Admin Account

Since this is your first time, you won't have any login credentials yet. Here's how to create them:

1. On the User Management page, you'll see a **"Login"** button
2. Click the **"Login"** button
3. In the modal that appears, click **"Don't have an account? Create one →"**
4. Fill in the registration form:
   - **Username**: Choose a unique username (e.g., `admin`)
   - **Email**: Your email address (e.g., `admin@kubegraf.io`)
   - **Password**: Choose a strong password
   - **Role**: Select **"Admin (Full Access)"** for your first user
5. Click **"Create Account"**

### Step 3: Login with Your New Credentials

1. After successful registration, you'll be redirected back to the login form
2. Enter your username and password
3. Click **"Login"**
4. You're now logged in! 🎉

---

## 📊 User Management Interface

Once logged in, the **User Management** page shows:

### 1. IAM System Status Card
- Shows if you're logged in or not
- Displays your username and role
- **Login button** (when not logged in)
- **Logout button** (when logged in)

### 2. Current User Information
When logged in, you'll see:
- Your username
- Your email
- Your role (with color-coded badge)
- Your account status

### 3. Roles & Permissions Documentation
A complete guide explaining the three roles:

#### 🔴 Admin (Full Access)
- Complete control over all resources, users, and settings
- Can create/delete users
- Can modify any resource
- Can access all namespaces

#### 🔵 Developer (Read/Write Access)
- Can create, update, and delete pods, deployments, services, config maps
- Can view all resources
- Cannot manage users or cluster settings

#### 🟢 Viewer (Read-Only Access)
- Can view all resources, logs, and metrics
- Cannot create, update, or delete any resources
- Perfect for monitoring and auditing

---

## 🔒 Security Features

### Password Security
- Passwords are hashed using **bcrypt** (cost 10)
- Never stored in plain text
- Cannot be recovered (only reset)

### Session Management
- Sessions last **24 hours**
- Stored using **HttpOnly cookies** (prevents XSS attacks)
- Session tokens are **cryptographically secure** (32 bytes)

### Data Encryption
- All credentials stored in **SQLite database**
- Encrypted with **AES-256-GCM**
- Requires **KUBEGRAF_ENCRYPTION_KEY** environment variable

---

## 🛠️ Alternative: Create User via API

If you prefer to create your first admin user via command line:

### 1. Create Admin User
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "email": "admin@kubegraf.io",
    "role": "admin"
  }'
```

**Expected Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@kubegraf.io",
    "role": "admin"
  }
}
```

### 2. Login via API
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'
```

**Expected Response:**
```json
{
  "token": "abc123...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@kubegraf.io",
    "role": "admin"
  }
}
```

### 3. Use Session Token
```bash
# Make authenticated requests
curl http://localhost:3001/api/pods?namespace=default \
  -b cookies.txt
```

---

## 📝 Step-by-Step UI Walkthrough

### Before Login (First Time)

When you navigate to **User Management**, you'll see:

1. **Header Section**
   - Title: "User Management"
   - Subtitle: "Manage users, roles, and authentication"

2. **IAM Status Card**
   - Icon: 🔐 Local IAM System
   - **Login Button** (prominently displayed)

3. **Quick Setup Guide** (only shown when not logged in)
   - Step 1: Create Admin Account
   - Step 2: Login
   - Step 3: Create Additional Users
   - Helpful tip about creating your first admin account

4. **Roles & Permissions Card**
   - Complete documentation of Admin/Developer/Viewer roles

### After Login

Once logged in, you'll see:

1. **IAM Status Card**
   - Your username and role displayed
   - **Logout Button**

2. **Current User Info Card** (NEW)
   - Username
   - Email
   - Role (color-coded badge)
   - Status indicator (Active/Inactive)

3. **Roles & Permissions Card** (same as before)

---

## 🎯 Common Scenarios

### Scenario 1: "I'm setting up KubeGraf for the first time"

**Solution:**
1. Navigate to **User Management** in sidebar
2. Click **"Login"** button
3. Click **"Create one"** link
4. Fill form with your details, select **"Admin"** role
5. Create account and login

### Scenario 2: "I forgot my password"

**Solution:**
Currently, password reset is not implemented. You have two options:
1. Create a new admin user via API (if you have CLI access)
2. Reset the database (deletes all users):
   ```bash
   rm ~/.kubegraf/db.sqlite
   # Then create a new admin user
   ```

### Scenario 3: "I want to create users for my team"

**Solution:**
1. Login as admin
2. (Future feature) Click "Create User" button on User Management page
3. For now, use the API to create additional users:
   ```bash
   curl -X POST http://localhost:3001/api/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "developer1",
       "password": "secure-password",
       "email": "dev1@company.com",
       "role": "developer"
     }'
   ```

### Scenario 4: "I'm deploying to production"

**Solution:**
1. Set encryption key:
   ```bash
   export KUBEGRAF_ENCRYPTION_KEY="$(openssl rand -base64 32)"
   ```
2. Save this key securely (e.g., in secrets manager)
3. Start KubeGraf:
   ```bash
   ./kubegraf web --port=3001
   ```
4. Create admin user via UI or API
5. Create additional users for your team

---

## 🔧 Configuration

### Enable IAM System

IAM is enabled by default in v1.3.0-rc1. To configure it:

**~/.kubegraf/config.yaml**
```yaml
iam:
  enabled: true
  session_duration: 24h
  database_path: ~/.kubegraf/db.sqlite
```

### Set Encryption Key

**Required for production:**
```bash
# Generate secure key
export KUBEGRAF_ENCRYPTION_KEY="$(openssl rand -base64 32)"

# Add to your shell profile
echo 'export KUBEGRAF_ENCRYPTION_KEY="your-key-here"' >> ~/.bashrc

# Or use environment file
echo "KUBEGRAF_ENCRYPTION_KEY=your-key-here" > .env
source .env
```

---

## 📚 API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/register` | POST | Create new user | No |
| `/api/login` | POST | Login and get session token | No |
| `/api/logout` | POST | Logout and invalidate session | Yes |
| `/api/me` | GET | Get current user info | Yes |
| `/api/users` | GET | List all users (admin only) | Yes |

### Example Requests

**Register:**
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secure123",
    "email": "alice@example.com",
    "role": "developer"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "alice",
    "password": "secure123"
  }'
```

**Get Current User:**
```bash
curl http://localhost:3001/api/me \
  -b cookies.txt
```

**Logout:**
```bash
curl -X POST http://localhost:3001/api/logout \
  -b cookies.txt
```

---

## 🐛 Troubleshooting

### Problem: "Cannot create user"

**Causes:**
- Encryption key not set
- Database file permissions issue
- Username already exists

**Solutions:**
```bash
# Set encryption key
export KUBEGRAF_ENCRYPTION_KEY="$(openssl rand -base64 32)"

# Check database permissions
ls -la ~/.kubegraf/db.sqlite
chmod 600 ~/.kubegraf/db.sqlite

# Try different username
```

### Problem: "Login failed"

**Causes:**
- Wrong username or password
- Session expired
- Database corrupted

**Solutions:**
```bash
# Verify credentials
# If forgotten, create new admin user via API

# Check if database exists
ls -la ~/.kubegraf/db.sqlite

# If corrupted, reset database (WARNING: deletes all users)
rm ~/.kubegraf/db.sqlite
```

### Problem: "No login button visible"

**Causes:**
- Old frontend cached in browser
- Build didn't complete

**Solutions:**
```bash
# Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

# Rebuild frontend
cd ui/solid
npm run build
cp -r dist/* ../../web/
cd ../..

# Restart application
pkill kubegraf
./kubegraf web --port=3001
```

---

## 🎉 Summary

### ✅ What You Need to Know

1. **First-time setup is easy:**
   - Navigate to User Management page
   - Click Login → Create Account
   - Fill form and select Admin role
   - Done!

2. **Three ways to create users:**
   - Via UI (Login Modal)
   - Via API (curl commands)
   - Via admin dashboard (future feature)

3. **Security is built-in:**
   - Encrypted database
   - Hashed passwords
   - Secure sessions
   - RBAC with 3 roles

4. **No external dependencies:**
   - Everything runs locally
   - SQLite database
   - No cloud services required

### 📍 Where to Find Things

- **User Management Page**: Sidebar → Cluster → User Management
- **Login Modal**: Click "Login" button on User Management page
- **Create Account**: Click "Create one" link in Login Modal
- **Logout**: Click "Logout" button when logged in

### 🔗 Related Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Production Upgrade Status](PRODUCTION_UPGRADE_STATUS.md)
- [Complete Deployment Summary](COMPLETE_DEPLOYMENT_SUMMARY.md)
- [Release Notes v1.3.0-rc1](RELEASE_NOTES_v1.3.0-rc1.md)

---

**Need Help?**

- **Documentation**: https://kubegraf.io/docs
- **Discord**: https://discord.gg/kubegraf
- **Issues**: https://github.com/kubegraf/kubegraf/issues
- **Email**: support@kubegraf.io

---

**Generated with Claude Code** 🤖
**Version**: v1.3.0-rc1
**Last Updated**: December 3, 2025
