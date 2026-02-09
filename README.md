# University Marketplace Backend

A RESTful API backend for a university marketplace platform built with Node.js, Express, and TypeScript. This platform enables university students to buy and sell items within their campus community.

## Features

- **TypeScript** for type-safe code
- **Express.js** for robust API routing
- **Security** with Helmet middleware
- **CORS** enabled for cross-origin requests
- **Logging** with Morgan
- **Environment configuration** with dotenv
- **Development mode** with hot reload using nodemon

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- TypeScript knowledge

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd unimarketplace-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

5. Set up Supabase:
```bash
# Follow the detailed guide in SUPABASE_SETUP.md
# 1. Create Supabase project
# 2. Run database migrations
# 3. Configure Google OAuth
```

## Running the Application

### Development mode (with hot reload):
```bash
npm run dev
```

### Production mode:
```bash
# Build the project
npm run build

# Start the server
npm start
```

## API Endpoints

### Health Check
```
GET /health
```
Returns the server status and health information.

### API Root
```
GET /api
```
Returns API information and available endpoints.

### Items
```
GET /api/items
```
Returns all marketplace items (example endpoint).

### Authentication

#### OAuth Callback
```
POST /api/auth/callback
```
Handles OAuth callback and validates .edu email.

#### Get Current User
```
GET /api/auth/session
```
Returns current authenticated user (requires Bearer token).

#### Sign Out
```
POST /api/auth/signout
```
Signs out the current user.

## Project Structure

```
unimarketplace-backend/
├── src/
│   ├── index.ts              # Application entry point
│   ├── config/
│   │   └── supabase.ts       # Supabase client configuration
│   ├── controllers/
│   │   └── authController.ts # Authentication logic
│   ├── middleware/
│   │   ├── authMiddleware.ts # Auth & validation middleware
│   │   └── errorHandler.ts   # Error handling middleware
│   ├── routes/
│   │   ├── authRoutes.ts     # Authentication routes
│   │   └── index.ts          # Main API routes
│   └── utils/
│       └── emailValidator.ts # Email validation utilities
├── supabase/
│   └── migrations/
│       └── 001_create_profiles_table.sql
├── dist/                     # Compiled JavaScript (generated)
├── .env                      # Environment variables
├── .env.example              # Example environment file
├── .gitignore               # Git ignore rules
├── nodemon.json             # Nodemon configuration
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
├── SUPABASE_SETUP.md        # Supabase setup guide
└── README.md                # Project documentation
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Lint TypeScript files
- `npm run format` - Format code with Prettier

## Security

This project uses several security best practices:
- **Helmet** for setting security headers
- **CORS** configuration for controlled access
- Environment variables for sensitive configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## About

This is a backend API for a university marketplace where students can:
- List items for sale
- Browse available items
- Connect with other students
- Facilitate campus-wide trading

Built with care for university communities.