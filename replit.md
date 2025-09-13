# FocusLock - Productivity with Enforcement

## Overview

FocusLock is a productivity application that goes beyond traditional task scheduling by enforcing focus sessions through device locking mechanisms. The app schedules tasks and locks the device to only allow specific applications until the user submits proof of completion. It targets serious students and professionals engaged in online courses, certifications, internships, and deep work sessions.

The system is built as a full-stack web application with separate frontend and backend codebases that can run independently. The architecture supports task management, user authentication, progress tracking, and enforcement mechanisms with proof verification.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript running on Vite (Port 5000)
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Context-based auth provider with session management

### Backend Architecture
- **Runtime**: Node.js with Express.js and TypeScript (Port 8000)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **Session Management**: Express-session with PostgreSQL session store
- **API Design**: RESTful endpoints with consistent error handling
- **File Structure**: Modular separation with dedicated files for routes, authentication, database, and storage

### Database Schema
The system uses PostgreSQL with the following core entities:
- **Users**: Stores user credentials, preferences, and enforcement settings
- **Tasks**: Task definitions with scheduling, target apps, and strict levels (SOFT/MEDIUM/HARD)
- **Enforcement Sessions**: Active enforcement states and device locking status
- **Proofs**: User-submitted evidence for task completion verification

### Authentication & Authorization
- Session-based authentication using Passport.js
- Password hashing with bcrypt (12 salt rounds)
- Protected routes with middleware-based authorization
- Session persistence across browser sessions
- Strict mode agreement requirement for new users

### Frontend-Backend Communication
- Axios-based HTTP client with credential support
- React Query for caching and synchronization
- Consistent error handling with user-friendly messages
- Protected API endpoints requiring authentication
- CORS configuration for cross-origin requests

### Task Management System
- **Task Scheduling**: Date-time based task scheduling with duration tracking
- **Strict Levels**: Three enforcement levels (SOFT, MEDIUM, HARD) affecting device restrictions
- **Target Apps**: User-specified applications allowed during enforcement
- **Proof Methods**: Multiple verification types (screenshot, check-in, quiz)
- **Status Tracking**: Task lifecycle management (PENDING, ACTIVE, COMPLETED, FAILED)

### User Interface Design
- **Bottom Navigation**: Five-tab structure (Home, Tasks, Progress, Calendar, Settings)
- **Responsive Design**: Mobile-first approach with desktop support
- **Component Architecture**: Reusable UI components with consistent styling
- **Modal System**: Overlay-based interactions for task creation and settings
- **Dark Mode**: Theme switching capability with CSS custom properties

### Development Workflow
- **Separate Codebases**: Independent frontend and backend folders with their own package.json files
- **Concurrent Development**: Uses concurrently to run both services simultaneously
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Development Server**: Hot reload for both frontend and backend during development

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Components**: Radix UI primitives for accessible component foundation
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for date manipulation and formatting

### Authentication Services
- **Passport.js**: Authentication middleware with local strategy
- **bcrypt**: Password hashing and verification
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TSX**: TypeScript execution for development
- **Vite**: Frontend build tool and development server
- **Tailwind CSS**: Utility-first CSS framework

### API & Communication
- **Axios**: HTTP client for API communication
- **CORS**: Cross-origin resource sharing middleware
- **Multer**: Multipart form data handling for file uploads
- **WebSocket**: Real-time communication support (ws library)

### Validation & Forms
- **Zod**: Runtime type validation for both frontend and backend
- **React Hook Form**: Form state management and validation
- **Hookform Resolvers**: Zod integration for form validation

The application is designed to scale with additional enforcement mechanisms and proof verification methods while maintaining the core architecture of separate, independently deployable frontend and backend services.