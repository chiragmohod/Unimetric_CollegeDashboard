
# Unimetric - University Management System

A comprehensive, cloud-agnostic college management dashboard with dedicated portals for administrators, faculty members, and students. Built with modern web technologies and designed to run on any cloud platform with any database backend.

## 📋 Features

<img width="2432" height="1440" alt="vlcsnap-2026-04-20-20h01m10s170" src="https://github.com/user-attachments/assets/e9ae11e1-a5ee-440b-b887-f178f819f42a" />

### Admin Dashboard
- 👥 Faculty and student management
- 📚 Academic year and class configuration
- 💰 Finance tracking (revenues & expenses)
- 📜 System-wide notices and announcements
- 📊 Comprehensive admin logs and audit trails
- 🎓 Academic materials and resources


<img width="2432" height="1440" alt="vlcsnap-2026-04-20-20h01m31s841" src="https://github.com/user-attachments/assets/c68c1d63-fa3e-4b32-95de-77a9c149700c" />

### Faculty Portal
- 📅 Schedule and timetable view
- ✅ Student attendance tracking
- 📁 Upload and manage study materials
- 👨‍🎓 Manage assigned students and classes
- 🎯 Track student progress and results

<img width="2432" height="1440" alt="vlcsnap-2026-04-20-20h01m44s650" src="https://github.com/user-attachments/assets/0d3de8d7-0d0c-43ca-ba46-e94d862532ba" />

### Student Portal
- 📅 Personal timetable and schedule
- ✅ Attendance tracking and history
- 📖 View enrolled subjects and materials
- 🏆 Academic results and grades
- 💬 Submit doubts and feedback
- 📢 View college notices

### Core Features
- 🔐 Role-based access control (RBAC)
- 🤖 AI-powered doubt resolution with Gemini AI
- 📱 Responsive design with Tailwind CSS
- 📊 Attendance and results visualization
- 🎓 Result marking and grade calculation
- 📁 File upload support for materials

## 🛠 Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **React Router 7** - Client-side routing
- **Tailwind CSS 4** - Styling
- **Recharts** - Data visualization
- **Motion** - Animations and transitions

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Multer** - File uploads

### Databases (Multi-support)
- **Local (JSON)** - Development default
- **Supabase** - PostgreSQL with Auth & Storage
- **PostgreSQL** - Direct connection
- **MySQL** - Direct connection
- **MongoDB** - NoSQL option

### Storage Options
- **Local** - File system (development)
- **Supabase Storage** - Integrated with Supabase
- **AWS S3** - Cloud-native file storage
- **Google Cloud Storage** - GCP integration
- **Azure Blob Storage** - Azure integration

### AI Services
- **Google Gemini API** - AI-powered doubt resolution

## 📦 Prerequisites

- **Node.js** 20.18.0 or later (20.19.0+ recommended)
- **npm** 10.9.0 or later
- One of the supported databases (optional for development)
- AI API keys (for AI features)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/unimetric.git
cd unimetric
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Frontend URL
VITE_API_BASE_URL="http://localhost:4000"

# Database (default: local)
DATABASE_TYPE="local"

# Gemini API
GEMINI_API_KEY="your-api-key"
```

### 4. Run Development Server

In separate terminals:

```bash
# Terminal 1: Backend API (Express server)
npm run serve

# Terminal 2: Frontend (Vite dev server)
npm run dev
```

Visit `http://localhost:3000` in your browser.

**Default Credentials:**
- Username: `admin`
- Password: `12345678`

## 🔧 Configuration Guide

### Database Configuration

#### Local Development (Default)
```env
DATABASE_TYPE="local"
# Uses server/db.json for data persistence
```

#### Supabase (Recommended for Production)
```env
DATABASE_TYPE="supabase"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_STORAGE_BUCKET="classroombucket"
```

Run migrations:
```bash
npm run migrate:supabase
```

#### PostgreSQL (Direct Connection)
```env
DATABASE_TYPE="postgresql"
DATABASE_URL="postgresql://user:password@localhost:5432/unimetric"
# OR
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="unimetric"
DB_USER="postgres"
DB_PASSWORD="your-password"
```

#### MySQL
```env
DATABASE_TYPE="mysql"
DATABASE_URL="mysql://user:password@localhost:3306/unimetric"
# OR
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="unimetric"
DB_USER="root"
DB_PASSWORD="your-password"
```

#### MongoDB
```env
DATABASE_TYPE="mongodb"
DATABASE_URL="mongodb://user:password@localhost:27017/unimetric"
# Or MongoDB Atlas:
DATABASE_URL="mongodb+srv://user:password@cluster.mongodb.net/unimetric"
```

### Storage Configuration

#### Local File Storage (Development)
```env
STORAGE_TYPE="local"
UPLOAD_DIR="./uploads"
```

#### AWS S3
```env
STORAGE_TYPE="aws-s3"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"
```

#### Google Cloud Storage
```env
STORAGE_TYPE="gcp-storage"
GCP_PROJECT_ID="your-project-id"
GCP_KEY_FILE="path/to/service-account-key.json"
GCP_BUCKET="your-bucket-name"
```

#### Azure Blob Storage
```env
STORAGE_TYPE="azure-blob"
AZURE_STORAGE_ACCOUNT="your-account"
AZURE_STORAGE_KEY="your-key"
AZURE_STORAGE_CONTAINER="your-container"
```

## 🌐 Deployment

### Frontend on Vercel

1. Push code to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: Add `VITE_API_BASE_URL` with your API endpoint

### Backend on Render

1. Create new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: (leave empty or `npm install`)
   - **Start Command**: `npm run serve`
   - **Environment Variables**: Add all database and storage credentials

### Backend on AWS

#### Option 1: EC2
1. Launch Ubuntu EC2 instance
2. Install Node.js and npm
3. Clone repository and install dependencies
4. Configure `.env` with RDS/other database
5. Use PM2 for process management
6. Set up nginx as reverse proxy

#### Option 2: AWS Lambda + RDS
1. Package application for Lambda
2. Configure RDS PostgreSQL/MySQL
3. Set environment variables in Lambda console
4. Deploy using Serverless Framework or SAM

### Backend on Google Cloud Run

1. Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "serve"]
```

2. Deploy:
```bash
gcloud run deploy unimetric-backend --source . --platform managed
```

### Backend on Azure App Service

1. Create Web App in Azure Portal
2. Configure deployment center with GitHub
3. Set Node.js version: 20
4. Add environment variables in Application Settings
5. Configure startup command: `npm run serve`

## 📋 Available npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite frontend dev server (port 3000) |
| `npm run serve` | Start Express backend server (port 4000) |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `npm run migrate:supabase` | Migrate local data to Supabase |
| `npm run clean` | Remove dist directory |
| `npm run lint` | Run TypeScript type checking |

## 📁 Project Structure

```
unimetric/
├── src/                          # Frontend React application
│   ├── components/               # Reusable React components
│   │   ├── ui/                   # UI components
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── ScheduleCalendar.tsx
│   ├── lib/                      # Utility functions and hooks
│   │   ├── api.ts                # API client
│   │   ├── auth.ts               # Authentication utilities
│   │   ├── attendance.ts
│   │   ├── results.ts
│   │   └── utils.ts
│   ├── pages/                    # Page components
│   │   ├── Login.tsx
│   │   ├── admin/                # Admin pages
│   │   ├── faculty/              # Faculty pages
│   │   ├── student/              # Student pages
│   │   └── shared/               # Shared pages
│   ├── main.tsx
│   ├── App.tsx
│   └── index.css
├── server/                       # Backend Express application
│   ├── index.ts                  # Express server setup
│   ├── db.ts                     # Database types and functions
│   ├── supabase.ts               # Supabase integration
│   ├── db.json                   # Local development database
│   └── *.sql                     # Database schemas
├── .env.example                  # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json                   # Vercel configuration
└── README.md
```

## 🔐 Security Considerations

### Production Checklist
- [ ] Change default admin credentials
- [ ] Set strong JWT and session secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Use environment variables for all secrets
- [ ] Enable database encryption at rest and in transit

### Authentication & Authorization
- Default admin account should be changed immediately
- All passwords are hashed before storage
- JWT tokens for API authentication
- Role-based access control (RBAC)
- Session management with secure cookies

## 🐛 Troubleshooting

### API Connection Issues
```
Error: "Unable to reach the API at http://localhost:4000"
```
**Solution**: Ensure backend is running with `npm run serve` and `VITE_API_BASE_URL` is configured correctly.

### Database Connection
```
Error: "Database connection failed"
```
**Solution**: Check `DATABASE_TYPE` and connection credentials in `.env` file.

### Storage Upload Issues
```
Error: "File upload failed"
```
**Solution**: Verify `STORAGE_TYPE` is set correctly and has proper permissions.

### Port Already in Use
```
Error: "EADDRINUSE: address already in use :::4000"
```
**Solution**: Kill process on port 4000 or change port in `.env`:
```bash
# On Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# On macOS/Linux
lsof -i :4000
kill -9 <PID>
```

## 📚 API Documentation

### Authentication
- `POST /auth/login` - Login with credentials
- `POST /auth/logout` - Logout user

### Faculty Management
- `GET /faculty` - Get all faculty
- `POST /faculty` - Create new faculty
- `PUT /faculty/:id` - Update faculty
- `DELETE /faculty/:id` - Delete faculty

### Student Management
- `GET /students` - Get all students
- `POST /students` - Create new student
- `PUT /students/:id` - Update student
- `DELETE /students/:id` - Delete student

### Attendance
- `GET /attendance` - Get attendance records
- `POST /attendance/session` - Create attendance session
- `PUT /attendance/:id` - Update attendance record

### Results
- `GET /results` - Get all results
- `POST /results` - Create new result
- `PUT /results/:id` - Update result

### Notices
- `GET /notices` - Get all notices
- `POST /notices` - Create new notice
- `DELETE /notices/:id` - Delete notice

For complete API documentation, refer to server code comments.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards
- Use TypeScript for all new code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

For issues, questions, or suggestions:
- Open an issue on [GitHub Issues](https://github.com/yourusername/unimetric/issues)
- Check existing issues for solutions
- Provide detailed reproduction steps

## 🚀 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] SMS alerts
- [ ] API documentation (Swagger)
- [ ] Docker containerization
- [ ] Kubernetes deployment examples
- [ ] Two-factor authentication
- [ ] Student portal mobile app
- [ ] Advanced reporting

## 📞 Contact

- **Project Lead**: Chirag Mohod
- **Email**: chiragmohod28@gmail.com


---

**Built with ❤️ by the Unimetric team**
3. Render can use [render.yaml](/d:/Project%20Files/Unimetric/render.yaml) automatically, or use:
   `Build Command: npm install`
   `Start Command: npm run serve`
4. Add environment variables:
   `USE_SUPABASE=true`
   `SUPABASE_URL=...`
   `SUPABASE_ANON_KEY=...`
   `SUPABASE_SERVICE_ROLE_KEY=...`
   `SUPABASE_STORAGE_BUCKET=classroombucket`

Health check endpoint:
`/api/health`
