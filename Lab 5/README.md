# Lab 5: Docker & Containerization — Dockerizing the Student REST API

**Course:** Web Services and Service-Oriented Architecture (SOA)  
**Lab Assignment:** Lab 5 – Docker & Containerization  
**Deliverables:** Dockerfile, compose.yaml, .dockerignore, .env.example, Backend Source, Screenshots, README.md  

---

## 1. Project Overview & Relation to Lab 4

This lab packages and orchestrates the **Student Management REST API** originally developed with MongoDB persistence in **Lab 4**. 

In Lab 4, the Express.js API ran directly on the host machine connecting to an external MongoDB instance. In Lab 5, the entire multi-tier system is containerized using **Docker** and **Docker Compose**:
1. **API Tier (`student-api`):** Node.js Express service running inside an isolated Linux container (`student-api:v1`).
2. **Database Tier (`mongodb`):** Official MongoDB container running on the same private Docker network (`student-network`).
3. **Data Persistence:** Managed Docker Volume (`student-mongo-data`) mounted to `/data/db` ensuring data survives container restarts and destruction.
4. **Service Discovery:** Automatic DNS name resolution where the API connects to `mongodb:27017` instead of `localhost:27017`.
5. **Orchestration:** Multi-container provisioning and lifecycle management via `compose.yaml`.

---

## 2. Docker Installation & Verification

Docker Desktop was verified and executed on Windows 11 with the WSL 2 backend engine:

```bash
docker --version
docker compose version
docker info
docker run hello-world
```

- **Docker Version:** 29.6.2, build dfc4efb
- **Docker Compose Version:** v5.3.1
- **Server Engine:** Docker Desktop 4.84.0 (WSL 2, Linux Kernel 6.6.87.2)

📸 **Evidence:** [`Screenshots/22-docker-version.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/22-docker-version.png)

---

## 3. Pre-Dockerization API Verification

Before containerization, the Lab 4 Student REST API was verified running natively on the host:
```bash
node server.js
```
The service connected to the database and successfully returned all registered students on `GET http://localhost:5000/students`.

📸 **Evidence:** [`Screenshots/23-lab4-api-running-before-docker.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/23-lab4-api-running-before-docker.png)

---

## 4. Dockerfile Breakdown & Explanation

The [`Dockerfile`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Dockerfile) contains the instructions to build an optimized container image:

```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Directive Explanation:
- **`FROM node:20`**: Uses the official Node.js 20 LTS image.
- **`WORKDIR /app`**: Creates and sets the working directory inside the container to `/app`.
- **`COPY package*.json ./`**: Copies package manifests first to leverage Docker's build layer cache.
- **`RUN npm install`**: Installs production and runtime dependencies inside the container.
- **`COPY . .`**: Copies the application source code into the container filesystem (excluding paths in `.dockerignore`).
- **`EXPOSE 5000`**: Documents that the containerized process listens on TCP port 5000.
- **`CMD ["npm", "start"]`**: Defines the default executable command when the container launches.

📸 **Evidence:** [`Screenshots/24-dockerfile.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/24-dockerfile.png)

---

## 5. Docker Image Build

The image was built using:
```bash
docker build -t student-api:v1 .
```
And verified with:
```bash
docker images
```

📸 **Evidence:**
- Build output: [`Screenshots/25-student-api-v1-build.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/25-student-api-v1-build.png)
- Image list: [`Screenshots/26-docker-images.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/26-docker-images.png)

---

## 6. Running Containers & Port Mapping

The Student API container was launched and bound to the host:
```bash
docker run -d --name student-api --network student-network -p 5000:5000 -e PORT=5000 -e MONGO_URI=mongodb://mongodb:27017/campusconnect student-api:v1
```

### Port Mapping (`-p 5000:5000`):
- **First Port (`5000`):** Host machine port accessible by web browsers and Postman (`http://localhost:5000`).
- **Second Port (`5000`):** Internal container port where the Express server listens.

📸 **Evidence:** [`Screenshots/27-running-student-api-docker-ps.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/27-running-student-api-docker-ps.png)

---

## 7. MongoDB Container & Docker Network

To enable container-to-container communication, a custom bridge network was created:
```bash
docker network create student-network
docker run -d --name mongodb --network student-network -v student-mongo-data:/data/db mongo:latest
```

### `localhost` vs `mongodb` Service Name:
- Inside a Docker container, `localhost` refers exclusively to the **container itself (its own loopback interface `127.0.0.1`)**, NOT the host computer or another container.
- When containers are joined to the custom network `student-network`, Docker's embedded DNS server (`127.0.0.11`) automatically resolves container names as network hostnames.
- Therefore, the API connects to `mongodb://mongodb:27017/campusconnect`, directing traffic across the virtual bridge network to the MongoDB container.

📸 **Evidence:**
- MongoDB Running: [`Screenshots/29-mongodb-container-running.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/29-mongodb-container-running.png)
- Network Inspection: [`Screenshots/30-docker-network-inspect.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/30-docker-network-inspect.png)
- MONGO_URI Service Name Config: [`Screenshots/31-mongo-uri-service-config.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/31-mongo-uri-service-config.png)

---

## 8. Environment Variables Configuration

No connection strings or ports are hardcoded. Values are supplied through environment variables documented in [`.env.example`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/.env.example):

```env
PORT=5000
MONGO_URI=mongodb://mongodb:27017/campusconnect
MONGODB_DB_NAME=campusconnect
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

📸 **Evidence:** [`Screenshots/32-environment-variables-config.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/32-environment-variables-config.png)

---

## 9. Docker Volume & Data Persistence Test

Containers have ephemeral writable layers that are destroyed when a container is removed. To guarantee database persistence, a Docker volume was provisioned:

```bash
docker volume create student-mongo-data
```
The volume is mounted to MongoDB's database path `/data/db`.

### Persistence Exercise:
1. Created student `Aarav Patel` (ID 1) via `POST http://localhost:5000/students`.
2. Verified record retrieval via `GET http://localhost:5000/students`.
3. Stopped and removed the running MongoDB container:
   ```bash
   docker stop mongodb
   docker rm mongodb
   ```
4. Created a brand new MongoDB container reusing the same volume:
   ```bash
   docker run -d --name mongodb-recreated --network student-network --network-alias mongodb -v student-mongo-data:/data/db mongo:latest
   ```
5. Called `GET http://localhost:5000/students` $\rightarrow$ The student record `Aarav Patel` remained intact, proving data survived container deletion.

📸 **Evidence:**
- Volume Creation & Mount: [`Screenshots/33-mongodb-volume-creation-mounting.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/33-mongodb-volume-creation-mounting.png)
- Persistence Test Proof: [`Screenshots/34-persistence-test-verification.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/34-persistence-test-verification.png)

---

## 10. Multi-Container Orchestration with Docker Compose

The complete multi-tier application is defined in [`compose.yaml`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/compose.yaml):

```yaml
services:
  api:
    build: ./backend
    container_name: student-api
    ports:
      - "5000:5000"
    environment:
      PORT: 5000
      MONGO_URI: mongodb://mongodb:27017/campusconnect
      MONGODB_DB_NAME: campusconnect
    depends_on:
      - mongodb
    networks:
      - student-network

  mongodb:
    image: mongo:latest
    container_name: mongodb
    volumes:
      - student-mongo-data:/data/db
    networks:
      - student-network

networks:
  student-network:
    external: true

volumes:
  student-mongo-data:
    external: true
```

### Docker Compose Commands:
- **Start Services in Background:** `docker compose up -d`
- **Inspect Service Status:** `docker compose ps`
- **View Streaming Logs:** `docker compose logs -f`
- **Stop and Remove Containers:** `docker compose down`

📸 **Evidence:**
- Compose File: [`Screenshots/35-docker-compose-yaml.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/35-docker-compose-yaml.png)
- Compose Up: [`Screenshots/36-successful-docker-compose-up.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/36-successful-docker-compose-up.png)
- Compose PS: [`Screenshots/37-docker-compose-ps.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/37-docker-compose-ps.png)
- Postman Test against Compose: [`Screenshots/38-postman-testing-compose-application.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/38-postman-testing-compose-application.png)
- Compose Logs: [`Screenshots/39-docker-compose-logs.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/39-docker-compose-logs.png)

---

## 11. Troubleshooting & Resolutions

| Issue Encountered | Cause | Resolution |
| :--- | :--- | :--- |
| **Docker daemon unavailable** | Docker Desktop application was not running on the host system. | Started Docker Desktop and verified engine readiness via `docker version` and `docker info`. |
| **Host port conflict on 27017 & 3000** | Background services (`civicflow-mongodb` and `civicflow-backend`) occupied host ports 27017 and 3000. | Isolated MongoDB inside the private Docker network `student-network` (accessed directly via container hostname `mongodb:27017`), and mapped the Student API to port `5000:5000`. |
| **Docker network name collision in Compose** | `student-network` was previously created manually via `docker network create`. | Configured `external: true` in `compose.yaml` to instruct Compose to attach to the existing network. |
| **Connection string compatibility** | Code expected `MONGODB_URI` while lab assignment specified `MONGO_URI`. | Updated `config/db.js` to accept `process.env.MONGO_URI || process.env.MONGODB_URI`. |

---

## 12. Complete Screenshot Index (Items 22–39)

All 18 required screenshots have been captured and placed in the [`Screenshots/`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/) directory:

| Item # | Screenshot File | Description |
| :--- | :--- | :--- |
| **22** | [`22-docker-version.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/22-docker-version.png) | Docker version, client/server engine info, and WSL 2 backend |
| **23** | [`23-lab4-api-running-before-docker.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/23-lab4-api-running-before-docker.png) | Lab 4 Student REST API running natively before Dockerization |
| **24** | [`24-dockerfile.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/24-dockerfile.png) | Complete content of the Dockerfile |
| **25** | [`25-student-api-v1-build.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/25-student-api-v1-build.png) | Successful build execution of `student-api:v1` |
| **26** | [`26-docker-images.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/26-docker-images.png) | `docker images` output showing `student-api:v1` and `mongo:latest` |
| **27** | [`27-running-student-api-docker-ps.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/27-running-student-api-docker-ps.png) | Running `student-api` container mapped to port 5000 |
| **28** | [`28-postman-testing-containerized-api.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/28-postman-testing-containerized-api.png) | Postman testing `POST /students` against containerized API |
| **29** | [`29-mongodb-container-running.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/29-mongodb-container-running.png) | MongoDB container running on `student-network` |
| **30** | [`30-docker-network-inspect.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/30-docker-network-inspect.png) | `docker network inspect` showing API and MongoDB containers |
| **31** | [`31-mongo-uri-service-config.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/31-mongo-uri-service-config.png) | Configuration verifying `MONGO_URI` uses `mongodb:27017` |
| **32** | [`32-environment-variables-config.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/32-environment-variables-config.png) | Environment variables documented in `.env.example` |
| **33** | [`33-mongodb-volume-creation-mounting.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/33-mongodb-volume-creation-mounting.png) | Volume creation and container mount inspection |
| **34** | [`34-persistence-test-verification.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/34-persistence-test-verification.png) | Data persistence proof after MongoDB container recreation |
| **35** | [`35-docker-compose-yaml.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/35-docker-compose-yaml.png) | Complete `compose.yaml` specification |
| **36** | [`36-successful-docker-compose-up.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/36-successful-docker-compose-up.png) | Successful execution of `docker compose up -d` |
| **37** | [`37-docker-compose-ps.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/37-docker-compose-ps.png) | `docker compose ps` showing healthy running services |
| **38** | [`38-postman-testing-compose-application.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/38-postman-testing-compose-application.png) | Postman testing `GET /students` against Compose application |
| **39** | [`39-docker-compose-logs.png`](file:///c:/AFIF/DA%20NOTES/SOA/Lab%205/Screenshots/39-docker-compose-logs.png) | Live streaming logs from API and MongoDB Compose services |

---

## 13. Project Structure (CampusConnect / Lab 5)

```
Lab 5/
├── Lab_5_Assignment_Docker.pdf           # Lab assignment instructions
├── README.md                              # Complete lab report covering all requirements
├── Dockerfile                             # Student API Dockerfile
├── compose.yaml                           # Multi-container Compose orchestration
├── .dockerignore                          # Build ignore rules
├── .env.example                           # Sample environment configuration
├── Screenshots/                           # All 18 authentic screenshot evidence files
│   ├── 22-docker-version.png
│   ├── 23-lab4-api-running-before-docker.png
│   ├── 24-dockerfile.png
│   ├── 25-student-api-v1-build.png
│   ├── 26-docker-images.png
│   ├── 27-running-student-api-docker-ps.png
│   ├── 28-postman-testing-containerized-api.png
│   ├── 29-mongodb-container-running.png
│   ├── 30-docker-network-inspect.png
│   ├── 31-mongo-uri-service-config.png
│   ├── 32-environment-variables-config.png
│   ├── 33-mongodb-volume-creation-mounting.png
│   ├── 34-persistence-test-verification.png
│   ├── 35-docker-compose-yaml.png
│   ├── 36-successful-docker-compose-up.png
│   ├── 37-docker-compose-ps.png
│   ├── 38-postman-testing-compose-application.png
│   └── 39-docker-compose-logs.png
├── frontend/                              # CampusConnect React/Vite client (from Lab 4)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── backend/                               # Student REST API (from Lab 4)
    ├── config/
    │   └── db.js                          # Connects via MONGO_URI to mongodb container
    ├── middleware/
    │   └── validateStudent.js
    ├── models/
    │   ├── Counter.js
    │   └── Student.js
    ├── routes/
    │   └── studentRoutes.js
    ├── openapi.yaml
    ├── package.json
    ├── server.js
    └── Dockerfile
```

---

## 14. Submission Checklist

- [x] Existing CampusConnect / Lab 4 application (`frontend/` and `backend/`)
- [x] `Dockerfile` created and verified
- [x] `compose.yaml` multi-container configuration
- [x] `.dockerignore` configured
- [x] `.env.example` environment variable documentation
- [x] Comprehensive `README.md` (This document)
- [x] All 18 screenshot deliverables (22 through 39) captured and indexed
