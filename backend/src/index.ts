import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5000",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
registerRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Start server
const port = parseInt(process.env.BACKEND_PORT || '8000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
