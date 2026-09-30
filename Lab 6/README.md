# Lab 6: Docker & Microservices – Decomposing and Running the Backend as Independent Services

**Course:** Web Services and Service-Oriented Architecture (SOA)  
**Lab Assignment:** Lab 6 – Docker & Microservices  
**Student ID:** 202512103  
**Deliverables:** Microservice Source Code (`user-service`, `product-service`, `order-service`), Dockerfiles, `compose.yaml`, Postman Collection, Architecture Diagrams, Test Automation Script, README.md

---

## 1. Project Overview & Relation to Previous Work

In **Lab 4**, a monolithic RESTful backend was developed with database persistence in MongoDB Atlas.  
In **Lab 5**, that monolithic backend was containerized alongside a local MongoDB container using Docker and Docker Compose.  

In **Lab 6**, we evolve the system into a **true microservices architecture** by decomposing the single backend into three loosely coupled, independently deployable, and independently runnable microservices:
1. **User Service:** Manages user identity, profiles, and departmental assignments.
2. **Product Service:** Manages course materials, books, and merchandise catalog.
3. **Order Service:** Coordinates purchasing workflows, performing synchronous REST communication to validate users and products before recording an order.

### Core Principles Demonstrated
- **Single Responsibility Principle (SRP):** Each microservice has one bounded context and one business responsibility.
- **Database-per-Service Pattern:** Direct cross-service database access is strictly prohibited. Each service connects only to its owned database. Cross-boundary data validation is performed exclusively via REST APIs.
- **Docker Service Discovery:** Container-to-container communication is routed through Docker's embedded DNS server on the shared network (`campus-network`) using service names (`http://user-service:3001`, `http://product-service:3002`), never `localhost`.
- **Inter-Service Resilience & Error Handling:** If a dependent service is unreachable or down, the calling service traps the network fault and returns a controlled `503 Service Unavailable` status rather than crashing or hanging.

---

## 2. Microservice Responsibilities & Service Boundaries

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT LAYER                                       |
|                    Postman / Browser / CampusConnect Frontend                         |
+---------------------------------------------------------------------------------------+
                                           |
               (Optional Concept: API Gateway / Direct Client Access)
        +----------------------------------+-----------------------------------+
        |                                  |                                   |
        v :3001                            v :3002                             v :3003
+-------------------+              +-------------------+               +-------------------+
|   User Service    |              |  Product Service  |               |   Order Service   |
| (Manages Users)   |<--[REST GET]-| (Manages Catalog) |<---[REST GET]-| (Orchestrates)    |
+-------------------+              +-------------------+               +-------------------+
        |                                  |                                   |
        v                                  v                                   v
+-------------------+              +-------------------+               +-------------------+
|  user_db (Mongo)  |              | product_db (Mongo)|               |  order_db (Mongo) |
+-------------------+              +-------------------+               +-------------------+
```

| Service | Bounded Context & Responsibility | Internal Port | Host Port | Owned Database |
| :--- | :--- | :--- | :--- | :--- |
| **`user-service`** | Create, retrieve, update, and delete campus users and authentication entities. | `3001` | `3001` | `user_db` |
| **`product-service`** | Manage product inventory, books, merchandise, pricing, and availability. | `3002` | `3002` | `product_db` |
| **`order-service`** | Create, retrieve, and track orders; validate referenced user & product via REST. | `3003` | `3003` | `order_db` |

---

## 3. Service Ports & Endpoint Mapping

### User Service (`http://localhost:3001`)
| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Service metadata and endpoint directory | `200 OK` |
| `GET` | `/health` | Health check & MongoDB connection status | `200 OK`, `503 Degraded` |
| `GET` | `/users` | List all registered users (supports `?role=` filter) | `200 OK` |
| `GET` | `/users/:id` | Retrieve user by integer ID (e.g. `101`) or ObjectId | `200 OK`, `404 Not Found` |
| `POST` | `/users` | Create new user profile | `201 Created`, `400 Bad Request`, `409 Conflict` |
| `PUT` | `/users/:id` | Update existing user details | `200 OK`, `404 Not Found` |
| `DELETE` | `/users/:id` | Delete a user | `200 OK`, `404 Not Found` |

### Product Service (`http://localhost:3002`)
| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Service metadata and catalog directory | `200 OK` |
| `GET` | `/health` | Health check & MongoDB connection status | `200 OK`, `503 Degraded` |
| `GET` | `/products` | List all available catalog products | `200 OK` |
| `GET` | `/products/:id`| Retrieve product by integer ID (e.g. `501`) or ObjectId | `200 OK`, `404 Not Found` |
| `POST` | `/products` | Create new product in catalog | `201 Created`, `400 Bad Request` |
| `PUT` | `/products/:id`| Update product pricing, stock, or details | `200 OK`, `404 Not Found` |
| `DELETE` | `/products/:id`| Remove product from catalog | `200 OK`, `404 Not Found` |

### Order Service (`http://localhost:3003`)
| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Service metadata & dependency target URLs | `200 OK` |
| `GET` | `/health` | Health check & DB/network connectivity state | `200 OK`, `503 Degraded` |
| `GET` | `/orders` | List all confirmed orders | `200 OK` |
| `GET` | `/orders/:id` | Retrieve order details by ID | `200 OK`, `404 Not Found` |
| `POST` | `/orders` | Create order (calls User & Product APIs via REST) | `201 Created`, `400 Bad Request`, `404 Not Found`, `503 Service Unavailable` |

---

## 4. Section 16 Exercise: Completed Design & Communication Tables

### A. Service Decomposition Design Table
| Item | User Service | Product Service | Order Service |
| :--- | :--- | :--- | :--- |
| **Responsibility** | Create, retrieve, update, and delete User resources. | Manage Product catalog resources and stock used by application. | Create and retrieve Orders; validate referenced User and Product data through APIs. |
| **Port** | `:3001` | `:3002` | `:3003` |
| **Main Resources** | Users (`id`, `name`, `email`, `role`, `department`) | Products (`id`, `name`, `category`, `price`, `stock`) | Orders (`id`, `userId`, `productId`, `quantity`, `totalAmount`, snapshots) |
| **Key Endpoints** | `GET/POST/PUT/DELETE /users`, `GET /users/:id` | `GET/POST/PUT/DELETE /products`, `GET /products/:id` | `POST /orders`, `GET /orders`, `GET /orders/:id` |
| **Data / Database** | `user_db` (User-owned strictly) | `product_db` (Product-owned strictly) | `order_db` (Order-owned strictly) |

### B. Service-to-Service Call Specification Table
| Field | Design Specification |
| :--- | :--- |
| **Calling Service** | `Order Service` |
| **Target Service** | `User Service` (User validation) / `Product Service` (Product validation) |
| **HTTP Method** | `GET` |
| **Endpoint** | `/users/{id}` (for user check) and `/products/{id}` (for product check) |
| **Request Data** | Referenced `userId` (e.g. `101`) and `productId` (e.g. `501`) in path params |
| **Expected Response** | `200 OK` with JSON resource payload (embedded snapshot into order) |
| **Failure Response** | `404 Not Found` if user or product does not exist; `503 Service Unavailable` when dependency is unreachable/down |

---

## 5. Database-per-Service & Data Ownership Approach

A foundational rule of microservices is that **no service may directly query the database owned by another service**.

```
[Order Service]  --X Direct DB Query Prohibited X-->  [user_db / product_db]
       |
       +---[REST API Call: GET /users/101]--------->  [User Service] ---> [user_db]
       +---[REST API Call: GET /products/501]------>  [Product Service] -> [product_db]
```

### Advantages Realized
1. **Schema Autonomy:** User Service can alter its document fields without risking breaking changes to Order queries.
2. **Encapsulation:** Business logic (such as whether a user is active or banned) remains enforced inside User Service.
3. **Historical Integrity via Snapshots:** When an order is created, the Order Service stores a `userSnapshot` and `productSnapshot`. Even if the product price later changes or a user deletes their account, the confirmed order accurately preserves the exact transaction state.

---

## 6. Dockerfile Explanation

Each service includes its own production-ready `Dockerfile`:

```dockerfile
FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Key Directives
- `FROM node:22`: Standard, modern LTS Node.js runtime base image.
- `WORKDIR /app`: Defines an isolated working directory for the container filesystem.
- `COPY package*.json ./` followed by `RUN npm install`: Leverages Docker layer caching so dependencies are only reinstalled if `package.json` changes.
- `COPY . .`: Copies the microservice source code, respecting `.dockerignore`.
- `EXPOSE <port>`: Documents the container port (`3001` for user, `3002` for product, `3003` for order).
- `CMD ["node", "server.js"]`: Specifies the default non-daemon container process.

---

## 7. Docker Image Build Commands & Manual Network Setup

Each service can be built independently into container images:

```bash
# 1. Build images
docker build -t user-service:v1 ./user-service
docker build -t product-service:v1 ./product-service
docker build -t order-service:v1 ./order-service

# 2. Verify images created
docker images

# 3. Create shared Docker network
docker network create campus-network
```

---

## 8. Docker Network & Service-to-Service Communication Flow

### DNS Resolution via Docker
Inside Docker, containers attached to `campus-network` reach each other through Docker's internal DNS using service names:
- User Service is reached at `http://user-service:3001`
- Product Service is reached at `http://product-service:3002`
- MongoDB is reached at `mongodb://mongodb:27017`

### Order Creation Sequence Diagram
```
Client/Postman             Order Service             User Service          Product Service
      |                          |                         |                      |
      |--- POST /orders -------->|                         |                      |
      |    {userId:101,          |                         |                      |
      |     productId:501}       |--- GET /users/101 ----->|                      |
      |                          |<-- 200 OK (User Data)---|                      |
      |                          |                                                |
      |                          |--- GET /products/501 ------------------------->|
      |                          |<-- 200 OK (Product Data)-----------------------|
      |                          |
      |                          | [Calculates total: price * qty]
      |                          | [Saves to order_db with snapshots]
      |<-- 201 Created ----------|
```

---

## 9. Inter-Service Error Handling & Fault Tolerance

In a microservices topology, remote calls can fail due to network partitions, high load, or container outages. The Order Service implements defensive error handling:

### 1. HTTP 404 for Missing Resources
If `GET /users/9999` returns `404 Not Found`, Order Service catches this and returns:
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "User Service resource with ID 9999 not found",
  "targetService": "User Service",
  "targetUrl": "http://user-service:3001/users/9999"
}
```

### 2. HTTP 503 for Offline Dependencies
If `user-service` is stopped (`docker stop user-service`), any network timeout or `ECONNREFUSED` is trapped and formatted into a controlled `503 Service Unavailable`:
```json
{
  "status": 503,
  "error": "Service Unavailable",
  "message": "User Service is unavailable or unreachable at http://user-service:3001/users/101 (fetch failed)",
  "targetService": "User Service",
  "targetUrl": "http://user-service:3001/users/101"
}
```
When `user-service` is restarted (`docker start user-service`), order creation immediately recovers and returns `201 Created`.

---

## 10. Docker Compose Configuration & Operations

The `compose.yaml` orchestrates all four containers:

```bash
# Validate compose configuration
docker compose config

# Build and start all services in detached mode
docker compose up -d --build

# View running container status
docker compose ps

# View unified or individual logs
docker compose logs -f
docker compose logs user-service
docker compose logs product-service
docker compose logs order-service

# Stop all services
docker compose down
```

---

## 11. Hands-on Workflow & Postman Verification

### Automated Execution Script
An automated PowerShell test script is provided to execute the full end-to-end verification in seconds:
```powershell
.\test-microservices.ps1
```

### Expected Postman Test Results
| Test Scenario | Request Details | Expected HTTP Code | Validation Criteria |
| :--- | :--- | :--- | :--- |
| **1. GET /users** | `GET http://localhost:3001/users` | `200 OK` | Array containing seeded user (ID `101`, Alice Johnson) |
| **2. GET /products** | `GET http://localhost:3002/products` | `200 OK` | Array containing seeded product (ID `501`, SOA Textbook) |
| **3. POST /orders** | `POST http://localhost:3003/orders` `{"userId":101,"productId":501,"quantity":2}` | `201 Created` | Total amount calculated (`99.98`), user & product snapshots embedded |
| **4. Order -> User/Product** | Check response body of POST `/orders` | `201 Created` | Verification that User and Product data were dynamically pulled |
| **5. Invalid User ID** | `POST http://localhost:3003/orders` `{"userId":9999,"productId":501,"quantity":1}` | `404 Not Found` | Controlled 404 indicating user does not exist in User Service |
| **6. Stop User -> Create Order** | Run `docker stop user-service`, then POST `/orders` | `503 Service Unavailable` | Controlled 503 indicating User Service is unreachable |
| **7. Restart User -> Create Order** | Run `docker start user-service`, then POST `/orders` | `201 Created` | Successful self-healing and recovery |

---

## 12. Troubleshooting Guide

| Issue Encountered | Root Cause | Resolution |
| :--- | :--- | :--- |
| **Port Conflict on 3001/3002/3003** | Another process is bound to host ports. | Update `USER_SERVICE_PORT`, `PRODUCT_SERVICE_PORT`, or `ORDER_SERVICE_PORT` in `.env`. |
| **Order Service returns 503 immediately** | Target service is still initializing or container crashed. | Check `docker compose logs user-service` and verify health via `GET http://localhost:3001/health`. |
| **Host MongoDB Port Conflict on 27017** | Host mongod is already running on 27017. | `compose.yaml` does not expose port 27017 to the host; MongoDB communicates purely over `campus-network`. |
| **Network not found error** | Missing shared network if using standalone commands. | Run `docker network create campus-network` or let Docker Compose create it automatically. |

---

## 13. Project Structure

```
Lab 6/
├── user-service/                          # User Microservice (Port 3001)
│   ├── config/
│   │   └── db.js                          # MongoDB connection utility
│   ├── models/
│   │   ├── Counter.js                     # Atomic integer sequence generator
│   │   └── User.js                        # User Mongoose schema & methods
│   ├── routes/
│   │   └── userRoutes.js                  # User CRUD REST endpoints
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                         # Container build instructions
│   ├── package.json
│   └── server.js                          # Express application entrypoint
├── product-service/                       # Product Microservice (Port 3002)
│   ├── config/
│   │   └── db.js                          # MongoDB connection utility
│   ├── models/
│   │   ├── Counter.js                     # Atomic integer sequence generator
│   │   └── Product.js                     # Product Mongoose schema & methods
│   ├── routes/
│   │   └── productRoutes.js               # Product CRUD REST endpoints
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                         # Container build instructions
│   ├── package.json
│   └── server.js                          # Express application entrypoint
├── order-service/                         # Order Microservice (Port 3003)
│   ├── config/
│   │   └── db.js                          # MongoDB connection utility
│   ├── models/
│   │   ├── Counter.js                     # Atomic integer sequence generator
│   │   └── Order.js                       # Order Mongoose schema & snapshots
│   ├── routes/
│   │   └── orderRoutes.js                 # Order orchestration & inter-service calls
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                         # Container build instructions
│   ├── package.json
│   └── server.js                          # Express application entrypoint
├── postman/
│   └── Microservices – Lab 6.postman_collection.json  # Pre-built Postman tests
├── architecture-diagram.svg               # Vector architecture diagram
├── compose.yaml                           # Docker Compose orchestration
├── .dockerignore
├── .env.example
├── test-microservices.ps1                 # Automated end-to-end test script
└── README.md                              # Complete lab report and documentation
```
