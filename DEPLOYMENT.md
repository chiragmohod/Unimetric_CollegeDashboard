# Deployment Guide

Complete guide for deploying Unimetric to various cloud platforms with different database backends.

## Table of Contents
- [Vercel (Frontend)](#vercel-frontend)
- [Render (Backend)](#render-backend)
- [AWS Deployment](#aws-deployment)
- [Google Cloud](#google-cloud)
- [Azure](#azure)
- [Docker Deployment](#docker-deployment)
- [Self-Hosted](#self-hosted)

---

## Vercel (Frontend)

### Prerequisites
- GitHub account with repository pushed
- Vercel account (free tier available)

### Steps

1. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select GitHub repository
   - Click "Import"

2. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Set Environment Variables**
   ```
   VITE_API_BASE_URL = https://your-backend-url.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Get your Vercel URL (e.g., `https://unimetric.vercel.app`)

### Environment Variables in Vercel
```
VITE_API_BASE_URL=https://your-api-endpoint.com
```

### Custom Domain
1. Go to Project Settings → Domains
2. Add custom domain
3. Update DNS records at your registrar

---

## Render (Backend)

### Prerequisites
- GitHub account with repository
- Render account (free tier with limitations)
- PostgreSQL database (use Render's PostgreSQL)

### Steps

1. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Choose name: `unimetric-db`
   - Region: Close to your users
   - Create database
   - Note the connection string

2. **Deploy Backend Service**
   - Dashboard → New → Web Service
   - Connect GitHub repo
   - Name: `unimetric-backend`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm run serve`

3. **Configure Environment Variables**
   ```
   DATABASE_TYPE=postgresql
   DATABASE_URL=<copy from PostgreSQL dashboard>
   GEMINI_API_KEY=your-api-key
   NODE_ENV=production
   PORT=4000
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Get your Render URL (e.g., `https://unimetric-backend.onrender.com`)

### Update Frontend
In Vercel settings:
```
VITE_API_BASE_URL=https://unimetric-backend.onrender.com
```

### Limitations
- Free tier has 15-minute inactivity sleep
- Use paid tier for production workloads
- Limited to 0.5GB RAM (free tier)

---

## AWS Deployment

### Option 1: EC2 + RDS

#### 1. Create RDS Instance
```bash
# AWS Console → RDS → Create Database
# Engine: PostgreSQL 15
# DB instance identifier: unimetric-db
# Master username: postgres
# Master password: SecurePassword123!
# Database name: unimetric
# Publicly accessible: No (internal access via VPC)
```

#### 2. Launch EC2 Instance
```bash
# AWS Console → EC2 → Launch Instance
# AMI: Ubuntu Server 22.04 LTS
# Instance type: t3.micro (free tier)
# Security Group: Allow SSH (22), HTTP (80), HTTPS (443), Custom TCP (4000)
# Key pair: Download for SSH access
```

#### 3. Connect and Deploy
```bash
# SSH into instance
ssh -i key-pair.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/yourusername/unimetric.git
cd unimetric

# Install dependencies
npm install

# Configure environment
nano .env
# Add:
# DATABASE_TYPE=postgresql
# DATABASE_URL=postgresql://postgres:password@rds-endpoint:5432/unimetric

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start npm --name "unimetric-backend" -- run serve
pm2 startup
pm2 save

# Install nginx
sudo apt-get install -y nginx

# Configure nginx as reverse proxy
sudo nano /etc/nginx/sites-available/default
```

**Nginx Configuration:**
```nginx
server {
    listen 80 default_server;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Restart nginx
sudo systemctl restart nginx

# Install SSL certificate (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: AWS Lambda + RDS

#### 1. Package Application
```bash
# Install Serverless Framework
npm install -g serverless

# Initialize Lambda project
serverless create --template aws-nodejs-typescript

# Deploy
serverless deploy
```

#### 2. Environment Variables
Set in Lambda console:
```
DATABASE_TYPE=postgresql
DATABASE_URL=...
GEMINI_API_KEY=...
```

### Option 3: AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p "Node.js 20" unimetric
eb create unimetric-env

# Configure environment variables
eb setenv \
  DATABASE_TYPE=postgresql \
  DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/unimetric \
  GEMINI_API_KEY=your-key

# Deploy
eb deploy
```

---

## Google Cloud

### Cloud Run (Recommended)

#### 1. Create CloudSQL Instance
```bash
gcloud sql instances create unimetric-db \
  --database-version=POSTGRES_15 \
  --region=us-central1 \
  --tier=db-f1-micro

gcloud sql databases create unimetric \
  --instance=unimetric-db

gcloud sql users set-password postgres \
  --instance=unimetric-db \
  --password=SecurePassword123!
```

#### 2. Create Dockerfile
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

#### 3. Deploy to Cloud Run
```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/unimetric-backend

# Deploy
gcloud run deploy unimetric-backend \
  --image gcr.io/PROJECT_ID/unimetric-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_TYPE=postgresql \
  --set-env-vars DATABASE_URL=postgresql://postgres:password@CLOUD_SQL_IP:5432/unimetric \
  --set-env-vars GEMINI_API_KEY=your-key

# Get Cloud Run URL
gcloud run services describe unimetric-backend --region us-central1
```

#### 4. Update Frontend
Use the Cloud Run URL in Vercel environment variables.

---

## Azure

### App Service + Azure Database for PostgreSQL

#### 1. Create PostgreSQL Database
```bash
az postgres server create \
  --resource-group unimetric-rg \
  --name unimetric-db \
  --location eastus \
  --admin-user postgres \
  --admin-password SecurePassword123! \
  --sku-name B_Gen5_1 \
  --storage-size 51200

az database create \
  --resource-group unimetric-rg \
  --server unimetric-db \
  --name unimetric
```

#### 2. Create App Service
```bash
az appservice plan create \
  --name unimetric-plan \
  --resource-group unimetric-rg \
  --sku F1

az webapp create \
  --resource-group unimetric-rg \
  --plan unimetric-plan \
  --name unimetric-backend \
  --runtime "NODE|20"
```

#### 3. Configure Deployment
```bash
# Connect GitHub
az webapp deployment github-actions add \
  --resource-group unimetric-rg \
  --name unimetric-backend \
  --repo yourusername/unimetric \
  --branch main
```

#### 4. Set Environment Variables (Azure Portal)
```
DATABASE_TYPE = postgresql
DATABASE_URL = postgresql://postgres:password@unimetric-db.postgres.database.azure.com:5432/unimetric
GEMINI_API_KEY = your-key
```

---

## Docker Deployment

### Local Docker

#### Build Image
```bash
docker build -t unimetric:latest .
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      DATABASE_TYPE: postgresql
      DATABASE_URL: postgresql://postgres:password@db:5432/unimetric
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: unimetric
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Run
```bash
docker-compose up -d
```

### Kubernetes Deployment

#### Create Deployment YAML
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unimetric-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: unimetric-backend
  template:
    metadata:
      labels:
        app: unimetric-backend
    spec:
      containers:
      - name: backend
        image: your-registry/unimetric:latest
        ports:
        - containerPort: 4000
        env:
        - name: DATABASE_TYPE
          value: "postgresql"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secret
              key: gemini-key
---
apiVersion: v1
kind: Service
metadata:
  name: unimetric-backend
spec:
  type: LoadBalancer
  selector:
    app: unimetric-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
```

#### Deploy to Kubernetes
```bash
kubectl create secret generic db-secret --from-literal=url=postgresql://...
kubectl create secret generic api-secret --from-literal=gemini-key=...
kubectl apply -f k8s-deployment.yaml
```

---

## Self-Hosted

### VPS Setup (DigitalOcean, Linode, etc.)

#### 1. Initial Setup
```bash
# SSH into VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE unimetric;
CREATE USER unimetric WITH PASSWORD 'securepassword';
GRANT ALL PRIVILEGES ON DATABASE unimetric TO unimetric;
\q
```

#### 2. Deploy Application
```bash
# Clone repo
git clone https://github.com/yourusername/unimetric.git /opt/unimetric
cd /opt/unimetric

npm install

# Create .env
cat > .env << EOF
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://unimetric:securepassword@localhost:5432/unimetric
GEMINI_API_KEY=your-key
NODE_ENV=production
PORT=4000
EOF

# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "unimetric" -- run serve
pm2 startup
pm2 save
```

#### 3. Setup Reverse Proxy (Nginx)
```bash
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/unimetric << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/unimetric /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 4. SSL Certificate (Free Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## Performance Optimization

### Database Optimization
- Enable query logging and analyze slow queries
- Create indexes on frequently queried columns
- Use connection pooling (e.g., PgBouncer for PostgreSQL)
- Regular backups and maintenance

### Caching Strategy
- Implement Redis for session/data caching
- Cache API responses where applicable
- Use CDN for static assets

### Monitoring
```bash
# PM2 monitoring
pm2 monit

# System monitoring
htop
iostat
```

---

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
lsof -i :4000
kill -9 PID
```

**Database Connection Failed**
- Verify connection string
- Check firewall rules
- Ensure database is running
- Verify credentials

**Out of Memory**
- Increase instance size
- Optimize Node.js heap: `--max-old-space-size=2048`
- Enable swapfile

### Debugging

Enable detailed logging:
```env
LOG_LEVEL=debug
NODE_DEBUG=*
```

Check logs:
```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log
```

---

## Backup & Recovery

### Database Backups
```bash
# PostgreSQL backup
pg_dump -U postgres unimetric > backup.sql

# Restore
psql -U postgres unimetric < backup.sql
```

### Automated Backups
Use cloud provider's backup services:
- AWS RDS automated backups
- Google Cloud SQL backup
- Azure Database automated backup

---

## Cost Estimation

| Platform | Service | Cost (Monthly) |
|----------|---------|---|
| Vercel | Frontend | Free - $20 |
| Render | Backend | Free - $12 |
| DigitalOcean | VPS | $6 - $12 |
| Vercel + Render | Basic | Free |
| AWS EC2 + RDS | Mid-tier | $50 - $100 |

