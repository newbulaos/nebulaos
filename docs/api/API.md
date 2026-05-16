# NebulaOS API Reference

Base URL: `http://<host>:8080/api/v1`

All protected endpoints require: `Authorization: Bearer <access_token>`

---

## Authentication

### POST /auth/login
```json
{ "username": "admin", "password": "secret", "totp_code": "123456" }
```
Response: `{ "access_token": "...", "refresh_token": "...", "expires_at": "..." }`

If 2FA enabled and code not provided:
`{ "error": "totp_required", "totp_required": true }`

### POST /auth/refresh
```json
{ "refresh_token": "..." }
```

### POST /auth/logout
```json
{ "refresh_token": "..." }
```

### GET /auth/me
Returns current user object.

### POST /auth/totp/setup
Returns `{ "secret": "...", "url": "otpauth://..." }`

### POST /auth/totp/verify
```json
{ "code": "123456" }
```

### PUT /auth/password
```json
{ "old_password": "...", "new_password": "..." }
```

---

## Users (admin only)

| Method | Path         | Description    |
|--------|--------------|----------------|
| GET    | /users       | List users     |
| POST   | /users       | Create user    |
| PUT    | /users/:id   | Update user    |
| DELETE | /users/:id   | Delete user    |

---

## System

| Method | Path            | Description       |
|--------|-----------------|-------------------|
| GET    | /system/info    | System info       |
| GET    | /system/metrics | Current metrics   |
| POST   | /system/reboot  | Reboot (admin)    |
| POST   | /system/update  | OS update (admin) |

---

## Docker

| Method | Path                              | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /docker/containers                | List all containers      |
| GET    | /docker/containers/:id            | Inspect container        |
| POST   | /docker/containers/:id/start      | Start container          |
| POST   | /docker/containers/:id/stop       | Stop container           |
| POST   | /docker/containers/:id/restart    | Restart container        |
| DELETE | /docker/containers/:id            | Remove container         |
| GET    | /docker/containers/:id/logs       | Get logs (tail=N)        |
| GET    | /docker/containers/:id/stats      | Container stats          |
| GET    | /docker/images                    | List images              |
| POST   | /docker/images/pull               | Pull image               |
| DELETE | /docker/images/:id                | Remove image             |
| GET    | /docker/volumes                   | List volumes             |
| GET    | /docker/networks                  | List networks            |
| POST   | /docker/compose/deploy            | Deploy compose stack     |

### WebSocket Endpoints

| Path                              | Description              |
|-----------------------------------|--------------------------|
| /ws/metrics                       | Realtime system metrics  |
| /ws/containers/:id/logs           | Realtime container logs  |
| /ws/containers/:id/exec           | Browser terminal (PTY)   |

Auth via query param: `?token=<access_token>`

---

## Monitoring

| Method | Path                    | Description       |
|--------|-------------------------|-------------------|
| GET    | /monitoring/metrics     | Latest metrics    |
| GET    | /monitoring/history     | Historical data   |
| GET    | /monitoring/alerts      | Active alerts     |
| POST   | /monitoring/alerts      | Create alert rule |

---

## RBAC Roles

| Role     | Permissions                                    |
|----------|------------------------------------------------|
| admin    | Full access                                    |
| operator | Read + start/stop/restart containers, deploy   |
| viewer   | Read-only                                      |

---

## Error Format

```json
{
  "error": "message",
  "request_id": "uuid"
}
```

HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 500
