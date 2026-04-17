# Security Policy & Guidelines

Security policies and best practices for Unimetric.

## Table of Contents
- [Security Overview](#security-overview)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [File Upload Security](#file-upload-security)
- [Incident Reporting](#incident-reporting)
- [Security Checklist](#security-checklist)

---

## Security Overview

### Security Principles

1. **Principle of Least Privilege** - Users have minimum permissions needed
2. **Defense in Depth** - Multiple layers of security controls
3. **Fail Secure** - Errors default to secure state
4. **Security by Default** - Secure settings out of the box

### Threat Model

**Assets to Protect:**
- Student personal and academic data
- Faculty schedules and materials
- Financial records
- System access and authentication

**Potential Threats:**
- Unauthorized access to data
- Data breaches
- Account takeover
- Privilege escalation
- SQL injection
- Cross-site scripting
- File upload exploits

---

## Authentication

### Password Policy

```
Minimum length: 8 characters
Recommended: 12+ characters
Should include: uppercase, lowercase, numbers, symbols
```

### Password Storage

**DO:**
```typescript
import bcrypt from 'bcrypt';

// Hash passwords before storing
const hashedPassword = await bcrypt.hash(plainPassword, 10);
// Store hashedPassword in database
```

**DON'T:**
```typescript
// ❌ Never store plaintext passwords
db.users.password = plainPassword;

// ❌ Never use weak hashing
const weak = crypto.md5(password);
```

### Multi-Factor Authentication (Future)

```typescript
// MFA Implementation Plan
interface User {
  id: string;
  password: string;
  mfaEnabled: boolean;
  mfaSecret?: string;  // TOTP secret
  backupCodes?: string[];
}
```

### Session Management

```typescript
// Secure session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only
    httpOnly: true,  // No JavaScript access
    sameSite: 'strict',  // CSRF protection
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
};
```

### JWT Token Security

```typescript
// Generate secure JWT
const generateToken = (user: User): string => {
  return jwt.sign(
    {
      sub: user.id,  // Subject
      role: user.role,
      iat: Math.floor(Date.now() / 1000),  // Issued at
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '24h',  // Short expiration
      algorithm: 'HS256'
    }
  );
};

// Token validation
const validateToken = (token: string): Payload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.warn('Invalid token attempt');
    return null;
  }
};
```

---

## Authorization

### Role-Based Access Control (RBAC)

```typescript
type Role = 'admin' | 'faculty' | 'student';

interface AuthContext {
  userId: string;
  role: Role;
  permissions: string[];
  classes?: string[];      // For faculty
  subjects?: string[];     // For faculty/student
}

// Permission mapping
const permissions: Record<Role, string[]> = {
  admin: [
    'manage:faculty',
    'manage:students',
    'manage:finances',
    'view:logs',
    'manage:system'
  ],
  faculty: [
    'manage:attendance',
    'manage:materials',
    'view:results',
    'manage:classes'
  ],
  student: [
    'view:attendance',
    'view:results',
    'view:materials',
    'submit:doubts'
  ]
};
```

### Authorization Middleware

```typescript
// Middleware for route protection
const authorize = (requiredRole: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user || !requiredRole.includes(user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
    
    next();
  };
};

// Usage
app.delete('/faculty/:id', 
  authenticate, 
  authorize(['admin']), 
  deleteFaculty
);
```

### Resource Ownership Checks

```typescript
// Verify user owns the resource
const verifyOwnership = async (
  resourceId: string,
  userId: string,
  resourceType: string
): Promise<boolean> => {
  const resource = await getResource(resourceType, resourceId);
  return resource?.ownerId === userId;
};

// Usage
app.put('/materials/:id', async (req, res) => {
  if (!await verifyOwnership(req.params.id, req.user.id, 'material')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Update material
});
```

---

## Data Protection

### Data at Rest

**Database Encryption:**
```
- Enable transparent data encryption (TDE)
- Use PostgreSQL/MySQL built-in encryption
- Encrypt sensitive fields: passwords, SSN, etc.
```

**File Storage Encryption:**
```
- AWS S3: Enable default encryption
- Google Cloud Storage: Enable default encryption
- Azure Blob: Enable encryption at rest
- Local: Use file-level encryption
```

### Data in Transit

**HTTPS/TLS:**
```
- Always use HTTPS in production
- Minimum TLS 1.2 (prefer 1.3)
- Use strong cipher suites
- Enforce HSTS headers
```

**Implementation:**
```typescript
// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### Sensitive Data Handling

**PII (Personally Identifiable Information):**
```typescript
// Sensitive fields
interface Student {
  id: string;
  name: string;  // PII
  rollNo: string;  // PII
  dob?: string;  // PII
  password: string;  // Sensitive
}

// Never log sensitive data
logger.info('User login', {
  userId: user.id,
  // ❌ DON'T: password, userName
});

// Don't expose in API responses
const sanitizeStudent = (student: Student) => {
  const { password, ...safe } = student;
  return safe;
};
```

---

## API Security

### Input Validation

```typescript
// Validate all input
const validateLoginInput = (data: unknown) => {
  if (typeof data !== 'object' || !data) {
    throw new Error('Invalid input');
  }
  
  const { username, password } = data as Record<string, unknown>;
  
  if (typeof username !== 'string' || username.length < 3) {
    throw new Error('Invalid username');
  }
  
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Invalid password');
  }
  
  return { username, password };
};

// Use express-validator for convenience
import { body, validationResult } from 'express-validator';

app.post('/login',
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 8 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process login
  }
);
```

### SQL Injection Prevention

```typescript
// ✅ DO: Use parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE username = $1',
  [username]
);

// ❌ DON'T: String concatenation
const user = await db.query(
  `SELECT * FROM users WHERE username = '${username}'`
);
```

### CORS Configuration

```typescript
// Restrictive CORS policy
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://app.yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // max 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Strict login attempt limit
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 attempts
  skipSuccessfulRequests: true
});

app.use('/api/', limiter);
app.post('/auth/login', loginLimiter, handleLogin);
```

---

## File Upload Security

### File Type Validation

```typescript
// Whitelist allowed file types
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png'
];

// Validate file type
const validateFileType = (file: Express.Multer.File): boolean => {
  return ALLOWED_MIMETYPES.includes(file.mimetype);
};
```

### File Size Limits

```typescript
// Multer configuration
const upload = multer({
  fileFilter: (req, file, cb) => {
    if (!validateFileType(file)) {
      cb(new Error('Invalid file type'));
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024  // 15MB max
  }
});
```

### Secure File Storage

```typescript
// Generate safe filename
const generateSafeFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const extension = path.extname(originalName);
  return `${timestamp}-${random}${extension}`;
};

// Store with safe path
const storagePath = path.join(UPLOAD_DIR, generateSafeFilename(file.originalname));

// Verify file exists and is accessible only by owner
app.get('/download/:fileId', authenticate, async (req, res) => {
  const file = await getFile(req.params.fileId);
  
  // Check ownership
  if (file.uploadedBy !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.download(file.path);
});
```

---

## Incident Response

### Security Incident Definition

A security incident includes:
- Unauthorized data access
- Data breach
- Account compromise
- System intrusion
- Malware detection

### Incident Response Steps

1. **Detect & Alert**
   - Monitor logs and alerts
   - User reports
   - Third-party notification

2. **Contain**
   - Isolate affected systems
   - Disable compromised accounts
   - Revoke compromised tokens

3. **Investigate**
   - Analyze logs
   - Identify scope of breach
   - Preserve evidence

4. **Communicate**
   - Notify affected users
   - Provide guidance
   - Keep stakeholders informed

5. **Recover**
   - Patch vulnerabilities
   - Reset credentials
   - Restore from backups

6. **Improve**
   - Document lessons learned
   - Update policies
   - Implement preventive measures

---

## Incident Reporting

### Report Security Issues

**Do NOT:**
- Post security issues publicly on GitHub
- Share vulnerability details in issues/PRs
- Test on production systems

**Do:**
- Email security@yourdomain.com with details
- Include reproduction steps and impact
- Give maintainers time to respond (72 hours)
- Follow responsible disclosure principles

### Security Contact

For security concerns, email: `security@yourdomain.com`

---

## Security Checklist

### Development
- [ ] All database queries use parameterized statements
- [ ] Input validation on all endpoints
- [ ] No hardcoded secrets or credentials
- [ ] Passwords hashed with bcrypt/similar
- [ ] JWT tokens signed and validated
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] Rate limiting implemented

### Authentication
- [ ] Change default admin credentials
- [ ] Implement password requirements
- [ ] Session timeouts configured
- [ ] JWT expiration set (24h or less)
- [ ] HTTPS for all auth endpoints
- [ ] Secure password reset mechanism
- [ ] Account lockout after failed attempts

### Data Protection
- [ ] Database encryption at rest
- [ ] File storage encryption enabled
- [ ] TLS/SSL for data in transit
- [ ] PII data masked in logs
- [ ] Regular database backups
- [ ] Backup encryption enabled
- [ ] Data retention policies enforced

### Authorization
- [ ] RBAC implemented correctly
- [ ] Resource ownership verified
- [ ] Sensitive operations require auth
- [ ] Admin operations logged
- [ ] No privilege escalation vulnerabilities

### File Operations
- [ ] File type validation
- [ ] File size limits enforced
- [ ] Safe filename generation
- [ ] Filesystem permissions correct
- [ ] Virus scanning (if applicable)

### Infrastructure
- [ ] Firewall configured
- [ ] WAF enabled (if applicable)
- [ ] Security headers set
- [ ] Logging and monitoring active
- [ ] Alerts configured for suspicious activity
- [ ] Regular security updates
- [ ] Dependencies up to date

### Deployment
- [ ] All secrets in environment variables
- [ ] .env file not committed to Git
- [ ] HTTPS certificate valid
- [ ] Database access restricted
- [ ] Database backups tested
- [ ] Disaster recovery plan in place

### Operations
- [ ] Regular security audits
- [ ] Penetration testing conducted
- [ ] Incident response plan documented
- [ ] Staff security training completed
- [ ] Access logs reviewed regularly
- [ ] Authorized personnel only

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Node.js Vulnerability Database](https://nodejs.org/en/blog/vulnerability/)
- [React Security Guidelines](https://react.dev/learn/security)

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-XX | 1.0.0 | Initial security policy |

---

**Last Updated:** 2024-01-XX

**Important:** This is a living document. Security practices should be reviewed and updated regularly as threats evolve.
