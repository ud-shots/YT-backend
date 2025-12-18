# YT Backend

A simplified backend for login and signup functionality with video downloading capabilities from YouTube, Instagram, and Facebook.

## Features
- User registration
- User login
- JWT authentication
- Video downloading from YouTube, Instagram, and Facebook

## Technologies Used
- Node.js
- Express
- PostgreSQL
- Sequelize ORM
- TypeScript
- ytdl-core (for YouTube video downloading)
- instagram-web-api (for Instagram video downloading)
- facebook-scraper (for Facebook video downloading)
- node-fetch (for HTTP requests)

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. For Instagram downloads, you need to provide Instagram credentials in the code (in `src/app/youtube/download_video.ts`)

3. Set up your environment variables in `.env` file

4. Run the development server:
```bash
npm run dev
```

The server will start on port 4061.