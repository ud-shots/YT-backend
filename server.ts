import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { db } from './src/config/db'
import os from 'os'
import dotenv from 'dotenv'
dotenv.config()
import authRoute from './src/app/auth/router'
import youtubeRoute from './src/app/youtube/router'
import dashboardRoute from './src/app/dashboard/router'
import facebookRoute from './src/app/facebook/router'
import bodyParser from 'body-parser'
import { Logs } from './src/models/logs'
import { globalErrorHandler } from './src/middleware/logging'

const app = express()
const port = process.env.SERVER_PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))

// Simple route for testing
app.get('/', (req, res) => {
    res.send('YT Backend Server is running!');
});

db.sync({
    alter: true, // Set to true to automatically create/update tables
    logging: process.env.SERVER_MODE === "LIVE" ? false : console.log
}).then((result: any) => {
    console.log('Database Connected Successfully!')
}).catch((err: any) => {
    console.log('Database connection error--->', err);
});

// Create an interval to run every 8 seconds and call the external API
// setInterval(async () => {
//   try {
//     const response = await fetch('https://yt-backend-rvma.onrender.com/');
//     if (!response.ok) {
//       throw new Error(`API request failed with status ${response.status}`);
//     }
//     const data = await response.text();
//     console.log('External API Response:', data);
//   } catch (error) {
//     console.error('Error calling external API:', error);
//   }
// }, 8000);

app.use('/api/auth', authRoute)
app.use('/api/youtube', youtubeRoute)
app.use('/api/dashboard', dashboardRoute)
app.use('/api/facebook', facebookRoute)

// Register global error handler
app.use(globalErrorHandler);

app.listen(port, () => {
    console.log(`YT Backend Server Running At http://localhost:${port}`);
});