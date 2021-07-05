const path = require('path')
const express = require('express')
const dotenv = require('dotenv')
const morgan = require('morgan')
const colors = require('colors')
const fileupload = require('express-fileupload')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')
const cors = require('cors')
const connectDB = require('./config/db')

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Connect to DB
connectDB()

// Route files
const camps = require('./routes/camps')
const auth = require('./routes/auth')
const users = require('./routes/users')

// Init app
const app = express();

//File uploading
app.use(fileupload())

//Sanitize data
app.use(mongoSanitize())

//Set security headers
app.use(helmet())

//Prevent XSS attacks
app.use(xss())

//Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
})

app.use(limiter)

//Prevent http param pollution
app.use(hpp())

//Enable CORS
app.use(cors())

//Set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Mount Routers
app.use('/api/v1/camps', camps)
app.use('/api/v1/auth', auth)
app.use('/api/v1/auth/users', users)

// Init Server
const PORT = process.env.PORT || 5000;

app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

//Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red)
  server.close(() => process.exit(1))
})