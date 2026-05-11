import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

// Load environment variables
dotenv.config({ override: true });

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// Password reset deep-link redirect
// Supabase redirects here after verifying the reset token, appending
// #access_token=...&refresh_token=...&type=recovery as hash params.
// This page passes those hash params on to the app via the custom scheme.
app.get('/auth/reset-redirect', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset Password</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #EEF1F5; }
    .card { background: #fff; border-radius: 24px; padding: 32px 24px; max-width: 340px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h2 { color: #1F2A44; margin: 0 0 8px; font-size: 22px; }
    p { color: #60728F; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
    a.btn { display: block; background: #6368E8; color: #fff; text-decoration: none; border-radius: 14px; padding: 16px; font-size: 16px; font-weight: 700; }
    .error { color: #DC2626; }
  </style>
</head>
<body>
<div class="card">
  <h2>Reset Your Password</h2>
  <p id="msg">Tap the button below to open UniMarketplace and set a new password.</p>
  <a class="btn" id="openBtn" href="#">Open UniMarketplace</a>
</div>
<script>
  var hash = window.location.hash;
  var params = new URLSearchParams(hash.slice(1));
  var btn = document.getElementById('openBtn');
  var msg = document.getElementById('msg');
  if (params.get('error')) {
    msg.innerHTML = '<span class="error">This link has expired or is invalid. Please request a new password reset.</span>';
    btn.style.display = 'none';
  } else {
    btn.href = 'unimarketplace://reset-password' + hash;
  }
</script>
</body>
</html>`);
});

// API routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(` Server is running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health check: http://localhost:${PORT}/health`);
});

export default app;
