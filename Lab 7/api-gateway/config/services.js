require("dotenv").config();

/**
 * Service Registry Configuration (Lightweight Configuration-Based Service Discovery)
 *
 * Externalizes backend microservice locations into environment variables.
 * Route-handling code binds dynamically to these configured targets rather than
 * literal hard-coded hostnames or ports.
 */
function getServiceRegistry() {
  return {
    users: {
      name: "User Service",
      prefix: "/users",
      url: process.env.USER_SERVICE_URL || "http://user-service:3001",
      description: "Handles User CRUD and authentication"
    },
    products: {
      name: "Product Service",
      prefix: "/products",
      url: process.env.PRODUCT_SERVICE_URL || "http://product-service:3002",
      description: "Handles Product catalog and inventory"
    },
    orders: {
      name: "Order Service",
      prefix: "/orders",
      url: process.env.ORDER_SERVICE_URL || "http://order-service:3003",
      description: "Handles Order orchestration and inter-service validation"
    }
  };
}

module.exports = { getServiceRegistry };
