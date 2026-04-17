# Quick Reference Guide

## 🚀 Quick Start Commands

### Local Development
```bash
# Install dependencies
npm install

# Start backend (Terminal 1)
npm run serve

# Start frontend (Terminal 2)
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

### Docker Development
```bash
# Start all services (PostgreSQL backend)
docker-compose up -d

# With MySQL
docker-compose --profile mysql up -d

# With MongoDB
docker-compose --profile mongodb up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Clean up volumes
docker-compose down -v
```

### Database Migrations
```bash
# Migrate to Supabase
npm run migrate:supabase
```

---

## 🔧 Environment Configuration Cheat Sheet

### Development (Local Database)
```env
DATABASE_TYPE=local
VITE_API_BASE_URL=http://localhost:4000
NODE_ENV=development
```

### Development (PostgreSQL)
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:password@localhost:5432/unimetric
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unimetric
DB_USER=postgres
DB_PASSWORD=password
```

### Development (MongoDB)
```env
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/unimetric
```

### Production (Supabase)
```env
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STORAGE_TYPE=supabase
SUPABASE_STORAGE_BUCKET=your-bucket
```

### Production (AWS)
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/unimetric
STORAGE_TYPE=aws-s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
```

### Production (Google Cloud)
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@cloudsql-ip:5432/unimetric
STORAGE_TYPE=gcp-storage
GCP_PROJECT_ID=your-project
GCP_BUCKET=your-bucket
```

### Production (Azure)
```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@server.postgres.database.azure.com:5432/unimetric
STORAGE_TYPE=azure-blob
AZURE_STORAGE_ACCOUNT=your-account
AZURE_STORAGE_KEY=your-key
AZURE_STORAGE_CONTAINER=your-container
```

---

## 🌐 API Endpoints Summary

### Authentication
```
POST   /auth/login          - Login user
POST   /auth/logout         - Logout user
```

### Faculty Management
```
GET    /faculty             - List all faculty
POST   /faculty             - Create faculty
GET    /faculty/:id         - Get faculty details
PUT    /faculty/:id         - Update faculty
DELETE /faculty/:id         - Delete faculty
```

### Students
```
GET    /students            - List all students
POST   /students            - Create student
GET    /students/:id        - Get student details
PUT    /students/:id        - Update student
DELETE /students/:id        - Delete student
```

### Attendance
```
GET    /attendance          - Get attendance records
POST   /attendance/session  - Create session
PUT    /attendance/:id      - Update record
```

### Results
```
GET    /results             - List results
POST   /results             - Create result
PUT    /results/:id         - Update result
```

### Financial
```
GET    /finance             - Get finance data
POST   /finance/revenue     - Add revenue
POST   /finance/expense     - Add expense
```

### Materials & Files
```
POST   /upload              - Upload file
GET    /download/:fileId    - Download file
DELETE /files/:fileId       - Delete file
```

---

## 🔑 Default Credentials

```
Username: admin
Password: 12345678
```

⚠️ **Change immediately in production!**

---

## 📁 Directory Structure Quick Reference

```
unimetric/
├── src/                    # Frontend (React)
│   ├── components/         # UI Components
│   ├── pages/              # Page components
│   ├── lib/                # Utilities
│   └── App.tsx
├── server/                 # Backend (Express)
│   ├── index.ts            # Express server
│   ├── db.ts               # Data types
│   └── supabase.ts         # Database
├── docs/                   # (Create) Additional docs
├── Dockerfile              # Container config
├── docker-compose.yml      # Multi-service
├── .env.example            # Config template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Frontend bundler
└── README.md               # Main documentation
```

---

## 🐛 Common Issues & Solutions

### API Connection Error
```
Error: "Unable to reach the API at http://localhost:4000"

Solution:
1. Ensure npm run serve is running
2. Check VITE_API_BASE_URL is correct
3. Check firewall isn't blocking port 4000
```

### Database Connection Failed
```
Error: "Database connection failed"

Solution:
1. Verify DATABASE_TYPE is correct
2. Check connection string format
3. Ensure database is running
4. Verify credentials
```

### Port Already in Use
```
Error: "EADDRINUSE: address already in use :::4000"

Solution (Windows):
netstat -ano | findstr :4000
taskkill /PID <PID> /F

Solution (Mac/Linux):
lsof -i :4000
kill -9 <PID>
```

### Docker Issues
```
Container won't start:
docker-compose logs backend

Reset everything:
docker-compose down -v
docker-compose up -d

Check Docker health:
docker-compose ps
```

---

## 📊 Performance Optimization Tips

### Frontend
- Use React DevTools Profiler
- Check bundle size: `npm run build`
- Lazy load routes with `React.lazy()`
- Memoize expensive components

### Backend
- Enable database query logging
- Create indexes on frequently queried columns
- Use connection pooling
- Implement caching for repeated queries

### Database
- Regular VACUUM and ANALYZE (PostgreSQL)
- Monitor slow query logs
- Archive old records
- Implement partitioning for large tables

---

## 🔐 Security Quick Checklist

### Development
- [ ] No secrets in `.env` committed
- [ ] Use `.env.example` for templates
- [ ] Change default admin password
- [ ] Never log sensitive data

### Production
- [ ] Enable HTTPS/TLS
- [ ] Use strong database passwords
- [ ] Rotate API keys regularly
- [ ] Enable database backups
- [ ] Set up monitoring & alerts
- [ ] Update dependencies regularly

---

## 📈 Performance Monitoring Commands

### Node.js
```bash
# Monitor process memory
node --max-old-space-size=2048 server/index.js

# Profiling
node --prof server/index.js
node --prof-process isolate-*.log > profile.txt
```

### Docker
```bash
# Memory usage
docker stats

# Container logs with follow
docker logs -f container_name

# Exec into container
docker exec -it container_name /bin/sh
```

### Database
```bash
# PostgreSQL query performance
EXPLAIN ANALYZE SELECT * FROM your_table;

# MySQL query log
SET GLOBAL slow_query_log = 'ON';

# MongoDB profiling
db.setProfilingLevel(1);
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass: `npm run lint`
- [ ] Build successful: `npm run build`
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Backups taken
- [ ] Team notified

### Post-Deployment
- [ ] Check application is running
- [ ] Verify database connectivity
- [ ] Test critical user flows
- [ ] Monitor for errors
- [ ] Keep logs for review

---

## 🔄 Git Workflow

### Creating a Feature
```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "feat: Add feature description"

# Push and create PR
git push origin feature/feature-name
```

### Commit Message Format
```
feat: Add new feature
fix: Fix bug description
docs: Update documentation
refactor: Refactor code section
test: Add test
chore: Update dependencies
```

---

## 📞 Getting Help

### Documentation
- 📚 [README.md](./README.md) - Complete guide
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical design
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- 🔐 [SECURITY.md](./SECURITY.md) - Security guidelines

### Issues & Support
- 🐛 [Report bugs](https://github.com/yourusername/unimetric/issues)
- 💬 [Discussions](https://github.com/yourusername/unimetric/discussions)
- 📧 [Email support](mailto:support@yourdomain.com)

---

## 📚 Useful Links

### Frontend
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)

### Backend
- [Express.js](https://expressjs.com)
- [Node.js](https://nodejs.org)
- [TypeScript](https://www.typescriptlang.org)

### Databases
- [PostgreSQL](https://www.postgresql.org)
- [Supabase](https://supabase.com)
- [MongoDB](https://www.mongodb.com)

### Deployment
- [Vercel](https://vercel.com)
- [Render](https://render.com)
- [AWS](https://aws.amazon.com)
- [Google Cloud](https://cloud.google.com)
- [Azure](https://azure.microsoft.com)

### Tools
- [Docker](https://www.docker.com)
- [GitHub Actions](https://github.com/features/actions)
- [npm](https://www.npmjs.com)

---

**Keep this reference handy!** 🚀
