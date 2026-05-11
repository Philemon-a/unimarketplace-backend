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
<head><meta charset="utf-8"><title>Redirecting…</title></head>
<body>
<script>
  var hash = window.location.hash;
  var appUrl = 'unimarketplace://reset-password' + hash;
  // Try iframe trick first (works on iOS Safari for custom schemes)
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = appUrl;
  document.body.appendChild(iframe);
  // Also try direct replace after short delay
  setTimeout(function() { window.location.replace(appUrl); }, 100);
</script>
<p>Opening UniMarketplace…</p>
<p style="margin-top:16px;font-size:14px;color:#666;">
  If the app doesn't open, make sure UniMarketplace is installed on this device.
</p>
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
