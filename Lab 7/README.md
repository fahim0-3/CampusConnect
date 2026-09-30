# Lab 7: API Gateway, Service Discovery & Cloud Deployment

**Course:** Web Services and Service-Oriented Architecture (SOA)  
**Lab Assignment:** Lab 7 – API Gateway, Service Discovery & Cloud Deployment  
**Student ID:** 202512103  
**Deliverables:** `api-gateway` Microservice, Service Discovery Configuration, Port Isolation Compose Orchestration, Cloud Deployment Specs (`render.yaml`), Architecture Diagram, Postman Test Suite, Automated Verification Script, README.md

---

## 1. Project Overview & Relation to Previous Labs

- In **Lab 4**, a monolithic REST API with MongoDB Atlas persistence was implemented.
- In **Lab 5**, that monolith was containerized into a multi-tier Docker environment.
- In **Lab 6**, the monolithic backend was decomposed into three independent microservices (`user-service`, `product-service`, `order-service`) communicating directly over an internal Docker network, with an API Gateway discussed only as an abstract design concept.
- In **Lab 7**, we bring the **API Gateway pattern** to fruition:
  1. **Single Public Entry Point:** We implement a dedicated `api-gateway` service acting as a reverse proxy for all client traffic.
  2. **Security & Network Port Isolation:** Individual microservices (`user-service:3001`, `product-service:3002`, `order-service:3003`) and database containers are locked down inside the Docker bridge network (`campus-network`). **Only port 5000 of the API Gateway is exposed to the external world.**
  3. **Configuration-Based Service Discovery:** Upstream service locations are completely externalized into environment variables and a configuration registry (`config/services.js`), removing any hard-coded URLs from route logic.
  4. **Cross-Cutting Concerns:** Centralized request logging, unified health monitoring, and standardized 502/503 fault trapping are centralized at the gateway.
  5. **Cloud Deployment Blueprint:** Cloud deployment artifacts (`render.yaml`) and Dockerfiles enable running the entire multi-service mesh in the cloud (e.g. Render, Railway, Fly.io).

---

## 2. Architecture & Layering

```
+---------------------------------------------------------------------------------------+
|                                LAYER 1: CLIENT LAYER                                  |
|                 Client / Postman / React Frontend (Public Internet)                   |
+---------------------------------------------------------------------------------------+
                                           |
                                           v [HTTP REST on Port :5000]
+---------------------------------------------------------------------------------------+
|                           LAYER 2: API GATEWAY (api-gateway)                          |
|             Port 5000:5000 (The ONLY service exposed to the host/internet)           |
|                                                                                       |
|   Cross-Cutting Concerns:                                                             |
|   - Reverse Proxy Routing (/users, /products, /orders)                                |
|   - Centralized Request Logger (method, path, target, duration)                       |
|   - Centralized Error Trapping (Returns clean 502/503 JSON on outage)                 |
|   - Gateway Health Endpoint (/health)                                                 |
|   - Configuration-Based Service Discovery (config/services.js)                        |
+---------------------------------------------------------------------------------------+
                                           |
                    (Docker Bridge Network: campus-network)
                    [HOST PORTS COMPLETELY CLOSED FOR SERVICES]
        +----------------------------------+-----------------------------------+
        |                                  |                                   |
        v :3001                            v :3002                             v :3003
+-------------------+              +-------------------+               +-------------------+
|   User Service    |              |  Product Service  |               |   Order Service   |
| (user-service)    |<--[REST GET]-| (product-service) |<---[REST GET]-| (order-service)   |
| [Isolated inside] |              | [Isolated inside] |               | [Isolated inside] |
+-------------------+              +-------------------+               +-------------------+
        |                                  |                                   |
        v                                  v                                   v
+-------------------+              +-------------------+               +-------------------+
|  user_db (Mongo)  |              | product_db (Mongo)|               |  order_db (Mongo) |
+-------------------+              +-------------------+               +-------------------+
|                    LAYER 4: PERSISTENT STORAGE (Local Volume / Atlas)                 |
+---------------------------------------------------------------------------------------+
```

| Layer | Responsibility | Reachable From |
| :--- | :--- | :--- |
| **Layer 1: Client / Postman** | Sends HTTP requests to a single public address | Internet / Host machine |
| **Layer 2: API Gateway** | Routes `/users`, `/products`, `/orders`; logs traffic; centralized error handling | Internet (Public Port `5000`) |
| **Layer 3: Microservices** | Own domain business logic and data manipulation | **Docker network only** (Ports `3001`, `3002`, `3003` closed to host) |
| **Layer 4: MongoDB Atlas / Container**| Isolated persistent storage (`user_db`, `product_db`, `order_db`)| Microservices only |

---

## 3. Gateway Endpoints & Routing Table

| Gateway Path | Routed Backend Target | Target Service Name | Example Call |
| :--- | :--- | :--- | :--- |
| `GET /health` | Handled directly by Gateway (No proxying) | API Gateway | `GET http://localhost:5000/health` |
| `GET /users`, `GET /users/:id` | `USER_SERVICE_URL` (`http://user-service:3001`) | User Service | `GET http://localhost:5000/users/101` |
| `POST /users`, `PUT /users/:id`, `DELETE /users/:id` | `USER_SERVICE_URL` (`http://user-service:3001`) | User Service | `POST http://localhost:5000/users` |
| `GET /products`, `GET /products/:id` | `PRODUCT_SERVICE_URL` (`http://product-service:3002`) | Product Service | `GET http://localhost:5000/products/501`|
| `POST /products`, `PUT /products/:id`, `DELETE /products/:id` | `PRODUCT_SERVICE_URL` (`http://product-service:3002`) | Product Service | `POST http://localhost:5000/products` |
| `POST /orders`, `GET /orders`, `GET /orders/:id` | `ORDER_SERVICE_URL` (`http://order-service:3003`) | Order Service | `POST http://localhost:5000/orders` |

---

## 4. Discussion Answers (Required for Submission)

### Part A Discussion: Why introduce an API Gateway instead of letting clients call each service directly?

In Lab 6, clients had to know individual host ports (`:3001` for users, `:3002` for products, `:3003` for orders). Introducing a dedicated API Gateway provides several critical architectural advantages:
1. **Single Entry Point & Simplified Client Interface:** Clients only need to know one host and port (`api.campusconnect.com` or `localhost:5000`). They are insulated from changes in internal service decomposition, port reorganizations, or server migrations.
2. **Encapsulation & Security (Hiding Internal Topology):** Backend microservices can remain strictly private within an internal Docker network, with zero external ports open. Malicious actors cannot bypass the gateway to probe internal services directly.
3. **Centralized Cross-Cutting Concerns:** Policies such as TLS termination, authentication/JWT verification, CORS headers, rate limiting, and request telemetry are implemented once at the gateway rather than duplicated inconsistently across dozens of microservices.
4. **Resilient Error Normalization:** If a downstream service is restarting or network partitioned, the gateway intercepts the timeout or socket error and returns a clean, standardized `502 Bad Gateway` or `503 Service Unavailable` error envelope, preventing ugly timeout hangs on client devices.

---

### Part B Discussion: Static/Configuration-Based vs. Dynamic Service Discovery

In this lab, we implemented **Configuration-Based Service Discovery** using environment variables and a configuration registry (`config/services.js`).

| Feature | Static / Config-Based Discovery (Lab 7) | Dynamic Service Discovery (Consul, Eureka, K8s DNS) |
| :--- | :--- | :--- |
| **Location Registry** | Environment variables / config files (`USER_SERVICE_URL`, etc.) | Centralized, distributed key-value store / service catalog |
| **Service Registration** | Pre-configured manually at container start | Microservices self-register automatically via heartbeat upon booting |
| **Autoscaling Support** | Limited; requires manual config update or load balancer in front | Native; dynamically adds/removes replica IPs as pods scale up or down |
| **Health Awareness** | Gateway only discovers outages when a request fails | Dynamic registry actively polls health checks and deregisters unhealthy instances |
| **Complexity & Overhead**| Zero additional infrastructure; ideal for small-to-medium deployments | Requires running discovery cluster nodes (e.g. Consul agents, etcd, or Kubernetes control plane) |

**What a Dynamic Registry Adds:**  
A dynamic registry allows systems to handle **ephemeral, horizontally autoscaling workloads** where container instances boot with dynamic IPs and terminate without notice. A static file cannot dynamically load balance across 10 dynamically spun-up replicas or detect node crashes without manual intervention.

---

## 5. Centralized Error Handling & Request Logging

### Request Logging Middleware
Every incoming request passing through the gateway is logged with timing and destination metadata:
```
[GATEWAY] 2026-09-30T14:10:05.123Z | GET /users/101 -> User Service | Status: 200 (14ms)
[GATEWAY] 2026-09-30T14:10:08.456Z | POST /orders -> Order Service | Status: 201 (42ms)
```

### Centralized 502/503 Fault Trapping
When a downstream microservice is down (`docker stop user-service`), the gateway catches the `ECONNREFUSED` error and responds immediately:
```json
{
  "status": 503,
  "error": "Service Unavailable",
  "message": "Downstream User Service is unreachable or timed out at http://user-service:3001",
  "targetService": "User Service",
  "targetUrl": "http://user-service:3001/users/101",
  "gateway": "CampusConnect API Gateway",
  "timestamp": "2026-09-30T14:12:00.000Z"
}
```

---

## 6. Proving Config-Driven Service Discovery (No Code Change)

To prove that the routing table is entirely configuration-driven:
1. The gateway reads its targets from `config/services.js`:
   ```javascript
   url: process.env.USER_SERVICE_URL || "http://user-service:3001"
   ```
2. If we update the target URL in `.env` or `compose.yaml`:
   ```yaml
   USER_SERVICE_URL: http://user-service-backup:3001
   ```
3. The gateway automatically binds to the new endpoint at startup without modifying a single line of application source code.

---

## 7. Cloud Deployment (Part C)

### Platform: Render / Railway / Fly.io
The repository is structured to deploy directly as Docker containers on any modern cloud PaaS.

### Render Deployment Instructions (`render.yaml`)
1. Push your repository to GitHub: `https://github.com/fahim0-3/CampusConnect.git`.
2. Log into [Render.com](https://render.com) and click **New +** -> **Blueprint**.
3. Connect your repository. Render automatically reads [`render.yaml`](file:///c:/Users/hp/Downloads/202512103_Lab%205/Lab%207/render.yaml) and provisions:
   - `campusconnect-api-gateway` (Public Web Service)
   - `campusconnect-user-service` (Private Microservice)
   - `campusconnect-product-service` (Private Microservice)
   - `campusconnect-order-service` (Private Microservice)
4. Add your `MONGO_URI` connection string for your MongoDB Atlas cluster in the dashboard.
5. Once deployed, Render generates a public URL: `https://campusconnect-gateway.onrender.com`.

### Testing Cloud Deployment
In Postman, change the `{{gateway_url}}` variable from `http://localhost:5000` to your public URL (`https://campusconnect-gateway.onrender.com`) and run the test collection.

---

## 8. Written Reflection (5–8 Lines on Operations Impact)

> Introducing the API Gateway and cloud deployment fundamentally transformed how CampusConnect is consumed and maintained. For client developers, system complexity collapsed from managing a fragmented matrix of microservice hostnames and ports into a single, cohesive public URL. Operationally, backend microservices gained substantial security hardening by retracting all private ports behind internal Docker networking, preventing unauthorized access. Centralizing request logging and error trapping at the gateway provided instant end-to-end visibility and prevented cascading failures. Finally, migrating to containerized cloud deployment elevated the project from a localized developer prototype into a globally accessible, production-grade cloud architecture.

---

## 9. Hands-on Local Verification & Automated Testing

### Automated Test Script
Run the automated test suite from PowerShell:
```powershell
.\test-gateway.ps1
```

### Script Execution Results
```
=================================================================
 Starting Lab 7 API Gateway & Service Discovery Test Suite
=================================================================

--- 1. Gateway Self-Check (No Proxying) ---
 [PASS] Gateway /health returns 200 OK
 [PASS] Gateway has active service registry

--- 2. Port Isolation: Confirming Backend Services NOT Accessible Directly ---
 [PASS] Port 3001 NOT accessible from host (Secure Container Isolation)
 [PASS] Port 3002 NOT accessible from host (Secure Container Isolation)

--- 3. Testing Client Traffic Through Single Gateway Entry Point (:5000) ---
 [PASS] GET /users routed through Gateway (200 OK)
 [PASS] GET /products routed through Gateway (200 OK)

--- 4. Gateway Routed Order Placement (Full Chain Validation) ---
 [PASS] POST /orders routed through Gateway (201 Created)
 [PASS] Order contains verified snapshots via gateway

--- 5. Centralized Error Handling: Unreachable Service ---
Stopping user-service container to simulate downtime...
 [PASS] Gateway trapped outage and returned controlled 503

--- 6. Gateway Recovery After Service Restart ---
Restarting user-service container...
 [PASS] Gateway recovers cleanly: GET /users/101 succeeds (200 OK)

=================================================================
 Lab 7 Verification Test Suite Complete
=================================================================
```

---

## 10. Project Directory Layout

```
Lab 7/
├── api-gateway/                           # API Gateway Microservice (Port 5000)
│   ├── config/
│   │   └── services.js                    # Service Discovery registry
│   ├── middleware/
│   │   └── logger.js                      # Request logger
│   ├── Dockerfile                         # Container build instructions
│   ├── package.json                       # Dependencies (express, http-proxy-middleware)
│   ├── server.js                          # Express reverse proxy server
│   └── .env.example & .dockerignore
├── user-service/                          # Private User Microservice (Port 3001 internal)
├── product-service/                       # Private Product Microservice (Port 3002 internal)
├── order-service/                         # Private Order Microservice (Port 3003 internal)
├── compose.yaml                           # Docker Compose (Only gateway port exposed!)
├── render.yaml                            # Cloud Infrastructure-as-Code Blueprint
├── architecture-diagram.svg               # SVG Architecture Diagram
├── postman/
│   └── API Gateway – Lab 7.postman_collection.json # Ready-to-import Postman suite
├── Screenshots/
│   └── GUIDE.md                           # Evidence capture checklist
├── test-gateway.ps1                       # Automated verification script
└── README.md                              # This comprehensive report
```
