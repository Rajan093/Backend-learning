import express from "express"         // Importing Express framework
import cors from "cors"               // Middleware to enable Cross-Origin Resource Sharing
import cookieParser from "cookie-parser" // Middleware to parse cookies from the request headers

const app = express()

// Enable CORS for a specific frontend origin and allow credentials (cookies, auth headers, etc.)
// - origin: restricts who can call the backend (set in .env as CORS_ORIGIN)
// - credentials: allows sending cookies or auth headers in cross-origin requests
app.use(cors({
    origin: process.env.CORS_ORIGIN,  
    credentials: true                 
}))

// Middleware to parse incoming JSON and form data with a size limit of 16kb
app.use(express.json({ limit: "16kb" }))             // Parses JSON payloads
app.use(express.urlencoded({ extended: true, limit: "16kb" })) // Parses URL-encoded data (e.g. form submissions)

// Serve static files from the 'public' folder (e.g., images, favicon, etc.)
app.use(express.static("public"))

// Parse cookies from the request headers and populate req.cookies
app.use(cookieParser())


// import routes
import userRouter from "./routes/user.routes.js"

// routes declaration
app.use("/api/v1/users" , userRouter)

export { app } // Exporting the app instance to be used in the main server file
