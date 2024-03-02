const express = require("express");
const { 
    createCommentCtrl,
    fetchAllCommentsCtrl,
    fetchCommentCtrl,
    editCommentCtrl,
    deleteCommentCtrl
 } = require("../../controllers/comments/commentCtrl");
const authMiddleware = require("../../middlewares/auth/authMiddleware");

const CommentRoutes = express.Router();

CommentRoutes.post("/", authMiddleware, createCommentCtrl);
CommentRoutes.get("/", fetchAllCommentsCtrl);
CommentRoutes.get("/:id", authMiddleware, fetchCommentCtrl);
CommentRoutes.put("/:id", authMiddleware, editCommentCtrl);
CommentRoutes.delete("/:id", authMiddleware, deleteCommentCtrl);

module.exports = CommentRoutes;
