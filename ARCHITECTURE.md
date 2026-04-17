# Architecture & Design

Comprehensive overview of Unimetric's system architecture, design patterns, and technology decisions.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Admin      │  │   Faculty    │  │   Student    │       │
│  │   Dashboard  │  │   Portal     │  │   Portal     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │                                  │
│                    React + TypeScript                        │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS REST API
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                                │
│              Express.js + TypeScript                         │
│  ┌──────────────────────────────────────────────────┐       │
│  │          Authentication & Authorization          │       │
│  │  • JWT-based auth • Role-based access control   │       │
│  └──────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │             API Endpoints                        │       │
│  │  • Faculty • Students • Attendance              │       │
│  │  • Attendance • Results • Finance               │       │
│  │  • Notices • Materials • Doubts                 │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼────────────────┐
        │                   │                │
        ▼                   ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  DATABASE    │  │  FILE        │  │  AI SERVICES │
│  LAYER       │  │  STORAGE     │  │              │
│              │  │  LAYER       │  │              │
│ - Local JSON │  │              │  │ - Gemini API │
│ - PostgreSQL │  │ - Local FS   │  │              │
│ - MySQL      │  │ - S3         │  │              │
│ - MongoDB    │  │ - GCS        │  │              │
│ - Supabase   │  │ - Azure Blob │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Technology Decisions

### Frontend: React 19 + TypeScript + Vite

**Why React?**
- Declarative UI with component reusability
- Large ecosystem and community support
- Strong tooling and debugging capabilities
- Performance optimization with memo and hooks

**Why Vite?**
- Fast development server (sub-second HMR)
- Optimized production builds
- ES module support
- Simple configuration

**Why TypeScript?**
- Type safety catches bugs at compile time
- Better IDE support and autocompletion
- Self-documenting code
- Easier refactoring and maintenance

### Backend: Express.js + Node.js

**Why Express?**
- Lightweight and flexible
- Minimal learning curve
- Large ecosystem of middleware
- Perfect for REST APIs and microservices

**Why TypeScript?**
- Type-safe API endpoints
- Compile-time error detection
- Better maintainability at scale

### Multi-Database Support

Architecture allows flexible database backends:

```typescript
// Database Abstraction Interface
interface IDatabase {
  faculty: Faculty[];
  students: Student[];
  academicYear: AcademicYear;
  // ... other data
}

// Implementation for each database type
class LocalDatabase implements IDatabase { }
class PostgresDatabase implements IDatabase { }
class MongoDatabase implements IDatabase { }
```

**Supported Databases:**
- **Local (JSON)**: Development and small deployments
- **PostgreSQL**: Recommended for production (relational)
- **MySQL**: Alternative relational database
- **MongoDB**: NoSQL alternative
- **Supabase**: PostgreSQL + Auth + Storage

## Application Architecture

### Frontend Architecture (React)

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── Layout.tsx       # Main layout wrapper
│   └── ProtectedRoute   # Auth guard
├── pages/
│   ├── Login.tsx        # Authentication
│   ├── admin/           # Admin pages
│   ├── faculty/         # Faculty pages
│   ├── student/         # Student pages
│   └── shared/          # Shared pages
├── lib/
│   ├── api.ts           # API client
│   ├── auth.ts          # Auth utilities
│   └── utils.ts         # Helper functions
├── App.tsx              # Root component
└── main.tsx             # Entry point
```

**Key Patterns:**

1. **Component Organization**
   - Smart components (connected to state)
   - Dumb components (presentational)
   - UI component library for consistency

2. **State Management**
   - React Context for auth state
   - Component state with hooks
   - No Redux/Zustand (keep simple)

3. **Routing**
   - Protected routes for authenticated pages
   - Role-based route guards
   - Client-side SPA routing

### Backend Architecture (Express)

```
server/
├── index.ts             # Express server setup
├── db.ts                # Data models and types
├── supabase.ts          # Database/storage implementations
├── db.json              # Local development data
└── migrations/          # Database migrations
```

**API Layer Pattern:**

```typescript
// Route definition
app.post('/auth/login', async (req, res) => {
  // 1. Validate input
  // 2. Authenticate user
  // 3. Generate JWT
  // 4. Return response
});

app.get('/faculty/:id', authenticate, (req, res) => {
  // Protected route with auth middleware
});
```

**Data Flow:**
```
Request → Router → Controller → Service → Database → Response
```

## Data Models

### Core Entities

```typescript
// Users
Faculty: { id, name, username, password, subjects, classes }
Student: { id, name, username, password, class, rollNo, subjects }

// Academic
AcademicYear: { id, year, isActive, classes }
AcademicClass: { id, name, divisions, subjects }

// Attendance
AttendanceSession: { id, className, subject, datetime, records }
AttendanceRecord: { studentId, status }

// Results
ResultMark: { studentId, subjectId, marks }

// Finance
FinanceRevenue: { id, title, category, amount, date }
FinanceExpense: { id, title, category, amount, date }

// Communication
Notice: { id, title, content, postedBy, date }
Doubt: { id, question, answer, studentId, facultyId }
StudyMaterial: { id, title, file, subject, uploadedBy }
```

## Authentication & Authorization

### Authentication Flow

```
1. User inputs credentials
   ↓
2. Backend validates username/password
   ↓
3. Backend generates JWT token
   ↓
4. Frontend stores JWT in memory/sessionStorage
   ↓
5. All API requests include JWT in Authorization header
   ↓
6. Backend validates JWT on protected routes
```

### Authorization (RBAC)

```typescript
interface AuthUser {
  id: string;
  role: 'admin' | 'faculty' | 'student';
  classes: string[];      // Assigned classes
  subjects: string[];     // Assigned subjects
}

// Middleware for role checking
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}
```

## API Design

### RESTful Principles

- **GET** - Retrieve resources
- **POST** - Create new resources
- **PUT** - Update existing resources
- **DELETE** - Delete resources

### Standard Response Format

**Success (200-299):**
```json
{
  "user": { /* data */ },
  "message": "Operation successful"
}
```

**Error (4xx-5xx):**
```json
{
  "error": "Error message",
  "details": "Additional context"
}
```

### Endpoint Categories

**Authentication**
```
POST   /auth/login
POST   /auth/logout
```

**Faculty Management**
```
GET    /faculty           # List all
POST   /faculty           # Create
GET    /faculty/:id       # Get one
PUT    /faculty/:id       # Update
DELETE /faculty/:id       # Delete
```

**Students**
```
GET    /students
POST   /students
GET    /students/:id
PUT    /students/:id
DELETE /students/:id
```

**Attendance**
```
POST   /attendance/session
GET    /attendance
PUT    /attendance/:id
```

**Results**
```
GET    /results
POST   /results
PUT    /results/:id
```

**File Operations**
```
POST   /upload            # Upload file
GET    /download/:fileId  # Download file
DELETE /files/:fileId     # Delete file
```

## Security Architecture

### Input Validation
```typescript
// Validate and sanitize user input
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

### Password Security
```typescript
// Hash passwords (implemented in real code)
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### JWT Tokens
```typescript
const token = jwt.sign(
  { userId: user.id, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

### CORS Configuration
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## Database Abstraction

### Adapter Pattern

```typescript
// Interface definition
interface IStorageAdapter {
  upload(file: File): Promise<string>;
  download(fileId: string): Promise<Buffer>;
}

// Implementations
class LocalStorageAdapter implements IStorageAdapter { }
class S3Adapter implements IStorageAdapter { }
class GCSAdapter implements IStorageAdapter { }

// Usage selects adapter based on config
const storage = getStorageAdapter(STORAGE_TYPE);
```

## Performance Optimization

### Frontend
- Code splitting with React.lazy
- Memoization of expensive components
- Virtual scrolling for large lists
- Lazy loading images
- Service workers for offline support (future)

### Backend
- Connection pooling for databases
- Query optimization with indexes
- Caching frequently accessed data
- Request/response compression
- Load balancing for scalability

## Error Handling

### Frontend
```typescript
try {
  const response = await apiFetch<User>('/api/user');
} catch (error) {
  // Display user-friendly error message
  showErrorNotification(error.message);
}
```

### Backend
```typescript
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

## Logging Strategy

### Levels
- **ERROR**: Critical errors requiring attention
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debug information

### Implementation
```typescript
const logger = {
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  debug: (msg) => process.env.LOG_LEVEL === 'debug' && console.log(`[DEBUG] ${msg}`)
};
```

## Scalability Considerations

### Horizontal Scaling
- Stateless backend design
- Separate frontend/backend deployment
- Database replication
- Load balancing

### Vertical Scaling
- Optimize database queries
- Cache frequently accessed data
- Connection pooling
- Memory management

### Database Sharding
For very large deployments:
- Shard by department/college
- Shard by academic year
- Shard by location

## Testing Strategy

### Unit Tests
- API route handlers
- Utility functions
- Data validation

### Integration Tests
- Authentication flow
- Database operations
- File uploads

### E2E Tests
- User workflows
- Cross-browser compatibility
- Performance baselines

## Future Architecture Improvements

1. **Microservices**: Split into specialized services
2. **Message Queue**: Async job processing with Redis/RabbitMQ
3. **GraphQL**: Replace REST with GraphQL API
4. **Search Engine**: Elasticsearch for advanced search
5. **Real-time**: WebSocket support for notifications
6. **CDN**: Content delivery network for static assets
7. **API Versioning**: Support multiple API versions

## Deployment Architecture

```
GitHub → CI/CD Pipeline → Test → Build → Deploy
                                          ↓
                        ┌────────────────┬───────────────┐
                        ↓                ↓               ↓
                    Vercel         Render/Docker   Cloud Provider
                  (Frontend)      (Backend+DB)    (Infrastructure)
```

---

## References

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [REST API Best Practices](https://restfulapi.net)
- [OWASP Security Guidelines](https://owasp.org)
