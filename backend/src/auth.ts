import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage.js";
import { User as DatabaseUser } from "./schema.js";
import { z } from "zod";
import { InputSanitizer } from "./sanitization.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

declare global {
  namespace Express {
    interface User extends DatabaseUser {}
  }
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express): void {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable must be set for security");
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // User not found - likely deleted account, clear session gracefully
        console.warn(`User ${id} not found during session deserialization - clearing session`);
        done(null, false);
        return;
      }
      done(null, user);
    } catch (error) {
      console.error('Error during session deserialization:', error);
      // On database errors, clear session to prevent repeated failures
      done(null, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Sanitize user input to prevent XSS
      const sanitizedEmail = InputSanitizer.sanitizeEmail(userData.email);
      const sanitizedName = InputSanitizer.sanitizeUserName(userData.name);
      
      // Validate sanitized data isn't empty
      if (!sanitizedEmail || !sanitizedName) {
        return res.status(400).json({ message: "Invalid email or name provided" });
      }
      
      const existingUser = await storage.getUserByEmail(sanitizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        email: sanitizedEmail,
        password: hashedPassword,
        name: sanitizedName,
        strictModeEnabled: true,
        uninstallProtectionEnabled: false,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        req.session.save(() => {
          res.status(201).json({
            id: user.id,
            email: user.email,
            name: user.name,
            strictModeEnabled: user.strictModeEnabled,
            uninstallProtectionEnabled: user.uninstallProtectionEnabled,
            createdAt: user.createdAt,
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      // Sanitize email input
      const sanitizedEmail = InputSanitizer.sanitizeEmail(loginData.email);
      if (!sanitizedEmail) {
        return res.status(400).json({ message: "Invalid email provided" });
      }
      
      // Replace the email in req.body with sanitized version for passport
      req.body.email = sanitizedEmail;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
    }

    passport.authenticate("local", (err: any, user: DatabaseUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        req.session.save(() => {
          res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            strictModeEnabled: user.strictModeEnabled,
            uninstallProtectionEnabled: user.uninstallProtectionEnabled,
            createdAt: user.createdAt,
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user!;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      strictModeEnabled: user.strictModeEnabled,
      uninstallProtectionEnabled: user.uninstallProtectionEnabled,
      createdAt: user.createdAt,
    });
  });
}
