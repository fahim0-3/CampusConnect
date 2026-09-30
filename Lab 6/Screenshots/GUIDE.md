# Lab 6 Screenshot Evidence Guide

This guide lists the exact screenshots required by **Section 17 (Required Architecture, Evidence and Submission)** of the Lab 6 assignment document.

You can save your screenshots directly in this folder (`Screenshots/`).

---

## Required Screenshot Checklist

| # | Screenshot Filename | What to Display / Command to Run | Expected Output / Visual |
|---|---|---|---|
| **1** | `01-working-app-before-decomposition.png` | Run monolithic backend (`node server.js`) from Lab 5/Lab 4 | Terminal showing `Student REST API running on port 5000` |
| **2** | `02-architecture-diagram.png` | Open [`architecture-diagram.svg`](file:///c:/Users/hp/Downloads/202512103_Lab%205/Lab%206/architecture-diagram.svg) in browser | The full visual architecture diagram showing 3 services, ports, database-per-service, and network |
| **3** | `03-project-structure.png` | VS Code / File Explorer tree view of `Lab 6` | Directories: `user-service/`, `product-service/`, `order-service/`, `compose.yaml`, `.env.example` |
| **4** | `04-dockerfiles-view.png` | Open Dockerfile in split editor or terminal `cat user-service/Dockerfile` | Dockerfile contents showing `FROM node:22`, `WORKDIR /app`, `COPY`, `RUN npm install`, `EXPOSE`, `CMD` |
| **5** | `05-docker-images-build.png` | Terminal: `docker images "*-service*"` | `user-service:v1`, `product-service:v1`, `order-service:v1` with tags and image IDs |
| **6** | `06-docker-compose-config.png` | Terminal: `docker compose config` | Parsed YAML showing all 4 services, ports, environment variables, network, and volumes |
| **7** | `07-docker-compose-up.png` | Terminal: `docker compose up -d` | Docker Compose creating `campus-network`, `campus-mongo-data`, and starting containers |
| **8** | `08-docker-compose-ps.png` | Terminal: `docker compose ps` | Status table showing all 4 containers (`campus-mongodb`, `user-service`, `product-service`, `order-service`) `Up` |
| **9** | `09-docker-network-inspect.png` | Terminal: `docker network inspect campus-network` | JSON output displaying all 4 containers attached to `campus-network` with internal IPs |
| **10** | `10-startup-logs.png` | Terminal: `docker compose logs` | Logs showing User, Product, and Order services connecting to their respective databases and listening on 3001, 3002, 3003 |
| **11** | `11-database-ownership-evidence.png` | Terminal: `docker exec -it campus-mongodb mongosh --eval "show dbs"` | Output displaying independent databases: `user_db`, `product_db`, and `order_db` |
| **12** | `12-postman-get-users.png` | Postman: `GET http://localhost:3001/users` | Status `200 OK` with JSON array containing User 101 |
| **13** | `13-postman-get-products.png` | Postman: `GET http://localhost:3002/products` | Status `200 OK` with JSON array containing Product 501 |
| **14** | `14-postman-post-order-success.png` | Postman: `POST http://localhost:3003/orders` with body `{"userId":101,"productId":501,"quantity":2}` | Status `201 Created` with `totalAmount: 99.98`, snapshots of user 101 and product 501 |
| **15** | `15-postman-invalid-id-404.png` | Postman: `POST http://localhost:3003/orders` with body `{"userId":9999,"productId":501,"quantity":1}` | Status `404 Not Found` with message `User Service resource with ID 9999 not found` |
| **16** | `16-postman-dependency-down-503.png` | Terminal: `docker stop user-service`<br>Postman: `POST http://localhost:3003/orders` with body `{"userId":101,"productId":501,"quantity":1}` | Status `503 Service Unavailable` with message indicating User Service is unreachable |
| **17** | `17-postman-recovery-success.png` | Terminal: `docker start user-service`<br>Postman: Re-send `POST http://localhost:3003/orders` | Status `201 Created` demonstrating system recovery and resilience |
