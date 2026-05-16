# NebulaOS Database ERD

## Tables

### users
| Column        | Type         | Constraints              |
|---------------|--------------|--------------------------|
| id            | VARCHAR(36)  | PK, UUID                 |
| username      | VARCHAR(64)  | UNIQUE, NOT NULL         |
| email         | VARCHAR(255) | UNIQUE, NOT NULL         |
| password_hash | TEXT         | NOT NULL                 |
| role          | VARCHAR(20)  | DEFAULT 'viewer'         |
| totp_secret   | TEXT         |                          |
| totp_enabled  | BOOLEAN      | DEFAULT false            |
| last_login_at | TIMESTAMP    |                          |
| is_active     | BOOLEAN      | DEFAULT true             |
| created_at    | TIMESTAMP    | NOT NULL                 |
| updated_at    | TIMESTAMP    | NOT NULL                 |
| deleted_at    | TIMESTAMP    | INDEX (soft delete)      |

### sessions
| Column        | Type         | Constraints              |
|---------------|--------------|--------------------------|
| id            | VARCHAR(36)  | PK, UUID                 |
| user_id       | VARCHAR(36)  | FK → users.id, INDEX     |
| refresh_token | TEXT         | UNIQUE, NOT NULL         |
| user_agent    | TEXT         |                          |
| ip_address    | VARCHAR(45)  |                          |
| expires_at    | TIMESTAMP    | NOT NULL                 |
| revoked_at    | TIMESTAMP    |                          |
| created_at    | TIMESTAMP    |                          |

### audit_logs
| Column     | Type        | Constraints          |
|------------|-------------|----------------------|
| id         | VARCHAR(36) | PK                   |
| user_id    | VARCHAR(36) | INDEX                |
| action     | VARCHAR(64) | NOT NULL             |
| resource   | VARCHAR(128)|                      |
| details    | TEXT        |                      |
| ip_address | VARCHAR(45) |                      |
| status     | VARCHAR(16) | success/failure      |
| created_at | TIMESTAMP   |                      |

### app_templates
| Column       | Type        | Constraints          |
|--------------|-------------|----------------------|
| id           | VARCHAR(36) | PK                   |
| name         | VARCHAR(64) | UNIQUE, NOT NULL     |
| display_name | VARCHAR(128)|                      |
| description  | TEXT        |                      |
| icon         | TEXT        |                      |
| category     | VARCHAR(32) | INDEX                |
| compose_yaml | TEXT        |                      |
| version      | VARCHAR(32) |                      |
| author       | VARCHAR(64) |                      |
| repo_url     | TEXT        |                      |
| tags         | TEXT        | comma-separated      |
| downloads    | BIGINT      | DEFAULT 0            |
| created_at   | TIMESTAMP   |                      |
| updated_at   | TIMESTAMP   |                      |

### installed_apps
| Column       | Type        | Constraints          |
|--------------|-------------|----------------------|
| id           | VARCHAR(36) | PK                   |
| template_id  | VARCHAR(36) | INDEX                |
| name         | VARCHAR(64) | UNIQUE, NOT NULL     |
| status       | VARCHAR(16) | DEFAULT 'running'    |
| compose_yaml | TEXT        |                      |
| installed_by | VARCHAR(36) |                      |
| port         | INTEGER     |                      |
| created_at   | TIMESTAMP   |                      |
| updated_at   | TIMESTAMP   |                      |

### notifications
| Column     | Type        | Constraints          |
|------------|-------------|----------------------|
| id         | VARCHAR(36) | PK                   |
| user_id    | VARCHAR(36) | INDEX                |
| title      | VARCHAR(128)|                      |
| message    | TEXT        |                      |
| type       | VARCHAR(16) | info/warning/error   |
| read       | BOOLEAN     | DEFAULT false        |
| created_at | TIMESTAMP   |                      |

### proxy_rules
| Column      | Type        | Constraints          |
|-------------|-------------|----------------------|
| id          | VARCHAR(36) | PK                   |
| domain      | VARCHAR(255)| UNIQUE, NOT NULL     |
| target      | VARCHAR(255)| NOT NULL             |
| ssl_enabled | BOOLEAN     | DEFAULT true         |
| force_https | BOOLEAN     | DEFAULT true         |
| created_by  | VARCHAR(36) |                      |
| created_at  | TIMESTAMP   |                      |
| updated_at  | TIMESTAMP   |                      |

### backup_jobs
| Column      | Type        | Constraints          |
|-------------|-------------|----------------------|
| id          | VARCHAR(36) | PK                   |
| name        | VARCHAR(64) |                      |
| schedule    | VARCHAR(64) | cron expression      |
| target      | TEXT        |                      |
| destination | TEXT        |                      |
| last_run_at | TIMESTAMP   |                      |
| status      | VARCHAR(16) |                      |
| enabled     | BOOLEAN     | DEFAULT true         |
| created_at  | TIMESTAMP   |                      |
| updated_at  | TIMESTAMP   |                      |

## Relationships

```
users ──< sessions      (1:N, user_id FK)
users ──< audit_logs    (1:N, user_id FK)
users ──< notifications (1:N, user_id FK)
app_templates ──< installed_apps (1:N, template_id FK)
```

## Indexes

- users: username, email (unique)
- sessions: refresh_token (unique), user_id, expires_at
- audit_logs: user_id, created_at
- app_templates: category, name
- notifications: user_id, read
- proxy_rules: domain (unique)
