# Render Deployment Preparation (S4)

This project is configured to deploy as a single Render Web Service on the free plan.
Express serves the production-built React app so there is a single URL with zero CORS issues.

### Environment variables required on Render:
- `MONGODB_URI`: Atlas connection string
- `GEMINI_API_KEY`: Google AI Studio API key
- `GEMINI_MODEL`: `gemini-1.5-flash`
- `JWT_SECRET`: Secret key for JWT auth
- `PORT`: Automatically set by Render (defaults to 10000 or 5000 locally)
- `NODE_ENV`: `production`

### Build & Start Commands
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
