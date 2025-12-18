import dotenv from 'dotenv'
dotenv.config()
import { Sequelize } from "sequelize-typescript";
import { Users } from '../models/users';
import { Login_History } from '../models/login_history';
import { Videos } from '../models/videos';

let dbName = process.env.DB_NAME || 'ai-youtube'
let dbUser = process.env.DB_USER || 'user'
let dbPassword = process.env.DB_PASSWORD || 'password'
let dbHost = process.env.DB_HOST || 'localhost'
let dbPort = process.env.DB_PORT || '5432'

export const db: Sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: Number(dbPort),
  dialect: "postgres",
  models: [Users, Login_History, Videos]
});