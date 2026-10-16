# 🌍 WanderPlan AI

**AI-Powered Trip Planning Platform**

**Live Website:** https://wanderplanai-1-10em.onrender.com/

WanderPlan AI is a full-stack travel planning web application that helps users discover destinations, generate personalized itineraries, and plan trips with the help of AI.

## Features

- User authentication with email and password
- Google Sign-In
- Secure JWT authentication using HTTP-only cookies
- Forgot password and reset password functionality
- AI-powered trip planning using Google Gemini API
- Destination discovery
- Google Places and Mapbox integrations
- Trip and itinerary management
- Budget-aware travel planning
- Responsive user interface

## Tech Stack

**Frontend:** React.js, Vite, JavaScript, React Router

**Backend:** Node.js, Express.js

**Database:** MongoDB Atlas, Mongoose

**Authentication:** JWT, Google Identity, bcrypt

**AI Integration:** Google Gemini API

**Maps & Places:** Google Places API, Mapbox

**Email Service:** Resend

**Security:** Helmet, CORS, Rate Limiting, Zod

**Deployment:** Render

**Version Control:** Git, GitHub

## System Architecture

```text
User
 |
 v
React.js + Vite Frontend
 |
 v
Express.js REST API
 |
 +---- Authentication & Middleware
 |
 +---- Google Gemini API
 |
 +---- Google Places API / Mapbox
 |
 +---- Resend Email API
 |
 v
MongoDB Atlas
```

## Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB Atlas account
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Krishna-BCE-24/WanderPlanAI.git
cd WanderPlanAI
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

Configure the required backend environment variables in a `.env` file, including your database connection string, JWT secret, and credentials for the integrations you use.

Start the backend:

```bash
npm run dev
```

### 3. Install Frontend Dependencies

Open a new terminal:

```bash
cd client
npm install
```

Configure the frontend environment variables in the client `.env` file.

For local development, the API URL is typically:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL provided by Vite.

## Environment Variables

Keep API keys, database credentials, JWT secrets, and other sensitive configuration in environment variables. Never commit your `.env` files to GitHub.

## Future Improvements

- Enhanced route optimization
- Improved itinerary editing
- Advanced budget feasibility checks
- Better interactive map experiences
- Automated testing and performance improvements

## Author

**Krishna Sahu**

B.Tech AIML Student | MERN Stack Developer | Java & DSA

GitHub: https://github.com/Krishna-BCE-24

---

*WanderPlan AI — Explore More. Plan Smarter.* 🌍
