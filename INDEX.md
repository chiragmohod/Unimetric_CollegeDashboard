# Unimetric

> A comprehensive, cloud-agnostic college management system built for flexibility and scalability

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-20%2B-brightgreen)
![Status](https://img.shields.io/badge/status-Active-success)

## Quick Links

- 📚 [Full Documentation](./README.md)
- 🏗️ [Architecture Guide](./ARCHITECTURE.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- 🔐 [Security Policy](./SECURITY.md)
- 🤝 [Contributing Guidelines](./CONTRIBUTING.md)
- 📝 [Changelog](./CHANGELOG.md)

## Overview

Unimetric is a modern, full-stack college management system designed to streamline administrative, academic, and financial operations. It features dedicated portals for administrators, faculty, and students with support for multiple databases and cloud platforms.

### Key Features

✅ **Multi-Role Dashboard**
- Admin portal for system configuration and oversight
- Faculty portal for attendance and material management
- Student portal for personal academic information

✅ **Cloud Agnostic**
- Deploy on Vercel, Render, AWS, Google Cloud, or Azure
- Support for PostgreSQL, MySQL, MongoDB, and Supabase

✅ **Scalable Architecture**
- Microservices-ready backend
- Container-ready with Docker support
- Horizontal scaling capabilities

✅ **Modern Tech Stack**
- React 19 + TypeScript frontend
- Express.js backend
- Tailwind CSS for responsive design
- Google Gemini AI integration

## Getting Started

### Prerequisites
- Node.js 20+ and npm 10+
- One of the supported databases (optional for development)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/unimetric.git
cd unimetric

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development servers
npm run serve      # Terminal 1: Backend
npm run dev        # Terminal 2: Frontend
```

Visit `http://localhost:3000` with credentials:
- Username: `admin`
- Password: `12345678`

## Deployment

### Quick Deploy Options

#### Frontend on Vercel (Free)
```bash
# Push to GitHub, then:
# Connect repository to Vercel
# Set VITE_API_BASE_URL environment variable
# Done! Auto-deploys on push
```

#### Backend on Render (Free tier available)
```bash
# 1. Create PostgreSQL database on Render
# 2. Create new Web Service, connect repo
# 3. Set environment variables
# 4. Deploy!
```

[See full deployment guide →](./DEPLOYMENT.md)

## Database Configuration

### Local Development (Default)
```env
DATABASE_TYPE="local"
# Uses server/db.json
```

### Production (PostgreSQL)
```env
DATABASE_TYPE="postgresql"
DATABASE_URL="postgresql://user:pass@host:5432/unimetric"
```

### Other Options
- MySQL: `DATABASE_TYPE="mysql"`
- MongoDB: `DATABASE_TYPE="mongodb"`
- Supabase: `DATABASE_TYPE="supabase"`

[Full configuration guide →](./README.md#configuration-guide)

## Docker Setup

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# Start with specific database
docker-compose --profile mysql up -d
docker-compose --profile mongodb up -d

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down
```

## Project Structure

```
unimetric/
├── src/                        # Frontend (React)
│   ├── components/            # Reusable components
│   ├── pages/                 # Page components
│   ├── lib/                   # Utilities & API
│   └── App.tsx
├── server/                    # Backend (Express)
│   ├── index.ts              # Server setup
│   ├── db.ts                 # Data models
│   └── migrations/           # Database migrations
├── Dockerfile                # Container config
├── docker-compose.yml        # Multi-service setup
├── README.md                 # Full documentation
├── ARCHITECTURE.md           # Design patterns
├── DEPLOYMENT.md             # Deployment guide
├── SECURITY.md              # Security guidelines
├── CONTRIBUTING.md          # Contribution guide
└── package.json
```

## Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Complete project documentation |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design and technical decisions |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Step-by-step deployment guides |
| [SECURITY.md](./SECURITY.md) | Security practices and policies |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and roadmap |

## Development

### Available Scripts

```bash
npm run dev              # Start Vite frontend dev server
npm run serve            # Start Express backend
npm run build            # Build for production
npm run lint             # TypeScript check
npm run migrate:supabase # Migrate data to Supabase
```

### Tech Stack Details

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router
- **Backend**: Express.js, TypeScript, Multer, Node.js
- **Databases**: Local/PostgreSQL/MySQL/MongoDB/Supabase
- **Storage**: Local filesystem/AWS S3/GCS/Azure/Supabase
- **AI**: Google Gemini API
- **DevOps**: Docker, GitHub Actions CI/CD

## Security

Unimetric implements industry-standard security practices:

- ✅ Role-based access control (RBAC)
- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Input validation & sanitization
- ✅ HTTPS/TLS enforcement
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Security headers

[Full security guide →](./SECURITY.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Pull request process
- Commit message format
- Testing requirements

### How to Contribute

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Roadmap

### Upcoming Features
- 📱 Mobile app (React Native)
- 🔔 Email & SMS notifications
- 📊 Advanced analytics dashboard
- 🔐 Two-factor authentication
- 📡 Real-time WebSocket updates
- 🐳 Kubernetes deployment examples

[Full roadmap →](./CHANGELOG.md#future-roadmap)

## Support

- 📚 [Documentation](./README.md)
- 🐛 [Report issues](https://github.com/yourusername/unimetric/issues)
- 💬 [Discussions](https://github.com/yourusername/unimetric/discussions)
- 🔒 [Security policy](./SECURITY.md#incident-reporting)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React Team](https://react.dev) - UI framework
- [Express.js](https://expressjs.com) - Backend framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Supabase](https://supabase.com) - Database & storage
- [Google Gemini](https://ai.google.dev) - AI capabilities

## Authors

- **Project Lead**: [Your Name]
- **Contributors**: See [CONTRIBUTORS.md](./CONTRIBUTORS.md)

---

<div align="center">

### Built with ❤️ for the education community

[⭐ Star us on GitHub](https://github.com/yourusername/unimetric) • [🐛 Report Bug](https://github.com/yourusername/unimetric/issues) • [💡 Request Feature](https://github.com/yourusername/unimetric/issues)

**[Back to top ⬆️](#unimetric)**

</div>
