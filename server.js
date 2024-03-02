const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const dbConnect = require("./config/db/dbConnect");
const userRoutes = require("./route/users/usersRoute");
const postRoute = require("./route/posts/postRoute");
const commentRoutes = require("./route/comments/commentRoutes");
const emailMsgRoute = require("./route/emailMsg/emailMsgRoute");
const categoryRoute = require("./route/category/categoryRoute");
const {errorHandler, notFound} = require("./middlewares/error/errorHandler");

const app = express();
//DB
dbConnect();

//Middleware
app.use(express.json());
// use cors
app.use(cors());

//Users route
app.use("/api/users", userRoutes);
//Posts route
app.use("/api/posts", postRoute);
//Comments route
app.use("/api/comments", commentRoutes);
//Email Messaging routes
app.use("/api/email", emailMsgRoute);
//Categories routes
app.use("/api/category", categoryRoute);

//not Found error
app.use(notFound);

// error handlers
app.use(errorHandler);

//server
const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server is running on ${PORT}`));
