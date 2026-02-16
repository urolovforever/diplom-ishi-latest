# API Documentation

Base URL: `http://localhost/api`

## Authentication

### POST /accounts/login/
Login with email and password. Returns JWT tokens.

**Request:**
```json
{"email": "user@example.com", "password": "SecurePass123!@#"}
```

**Response:**
```json
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user": {"id": "uuid", "email": "...", "role": {...}},
  "requires_2fa": true
}
```

### POST /accounts/verify-2fa/
Verify TOTP 2FA code.

**Request:**
```json
{"user_id": "uuid", "code": "123456"}
```

### POST /accounts/token/refresh/
Refresh access token.

**Request:**
```json
{"refresh": "eyJ..."}
```

### POST /accounts/change-password/
Change password (requires authentication).

**Request:**
```json
{"old_password": "...", "new_password": "..."}
```

---

## Confessions

### GET /confessions/
List confessions. Paginated.

### POST /confessions/
Create a new confession.

**Request:**
```json
{
  "title": "...",
  "content": "...",
  "organization": "uuid",
  "is_anonymous": false
}
```

### GET /confessions/{id}/
Get confession details.

### POST /confessions/{id}/transition/
Change confession status.

**Request:**
```json
{"status": "submitted"}
```

### GET /confessions/organizations/
List organizations.

### POST /confessions/organizations/
Create organization (admin only).

---

## Documents

### GET /documents/
List documents (filtered by role/security level).

Query params: `security_level`, `category`, `confession`

### POST /documents/
Upload a document (multipart/form-data).

Fields: `title`, `description`, `file`, `security_level`, `category`

Allowed file types: PDF, DOCX, XLSX, JPG, PNG (max 50MB).

### GET /documents/{id}/
View document details.

### GET /documents/{id}/download/?confirmed=true
Download document. Confidential/secret documents require `confirmed=true`.

### GET /documents/{doc_id}/versions/
List document versions.

### POST /documents/{doc_id}/versions/
Upload new version.

### GET /documents/{doc_id}/versions/diff/?v1=1&v2=2
Compare two text file versions (unified diff).

### GET /documents/access-logs/
List document access logs (admin/auditor only).

### GET/POST /documents/honeypot/
List/create honeypot files (admin/IT only).

### GET /documents/honeypot/{id}/access/
Trigger honeypot access (creates alert).

---

## AI Security

### GET /ai-security/dashboard/
AI anomaly dashboard stats.

### GET /ai-security/anomaly-reports/
List anomaly reports.

### GET /ai-security/anomaly-reports/{id}/
Get anomaly report detail.

### POST /ai-security/anomaly-reports/{id}/review/
Review anomaly report.

**Request:**
```json
{"is_false_positive": false, "resolve": true}
```

### GET /ai-security/activity-logs/
List activity logs.

### GET /ai-security/model-status/
Get AI model status (admin/IT only).

### POST /ai-security/scan/
Trigger manual anomaly scan.

---

## Notifications

### GET /notifications/
List user notifications.

### DELETE /notifications/{id}/
Delete notification.

### POST /notifications/mark-read/
Mark notifications as read.

**Request:**
```json
{"ids": ["uuid1", "uuid2"]}
```
or
```json
{"all": true}
```

### GET /notifications/unread-count/
Get unread notification count.

### GET/POST /notifications/alert-configs/
List/create alert configs.

### GET/POST /notifications/alert-rules/
List/create alert rules (admin/IT only).

### GET/PUT /notifications/telegram-config/
Get/update Telegram config.

---

## Audit

### GET /audit/logs/
List audit logs (admin/auditor only).

Query params: `action`, `model_name`

### POST /audit/reports/
Generate a report.

**Request:**
```json
{"report_type": "activity"}
```

Types: `activity`, `security`, `confession`

### GET /audit/reports/
List generated reports.

### GET /audit/reports/{id}/download/
Download report as PDF.

---

## User Management

### GET /accounts/users/
List users (admin only).

### POST /accounts/users/
Create user (admin only).

### GET /accounts/profile/
Get current user profile.

### PUT /accounts/profile/
Update profile.

---

## Authentication Headers

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```
