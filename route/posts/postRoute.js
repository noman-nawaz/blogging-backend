const express = require("express");
const { 
    createPostCtrl,
    fetchPostsCtrl,
    fetchPostCtrl,
    editPostCtrl,
    deletePostCtrl,
    toggleAddLikeToPostCtrl,
    toggleAddDislikeToPostCtrl,
} = require("../../controllers/posts/postCtrl");
const authMiddleware = require("../../middlewares/auth/authMiddleware");
const {
    photoUpload,
    postImgResize
  } = require("../../middlewares/uploads/photoUpload");
  

const postRoute = express.Router();

postRoute.post(
    "/",
    authMiddleware,
    photoUpload.single("image"),
    postImgResize,
    createPostCtrl
);
postRoute.get("/", fetchPostsCtrl);
postRoute.get("/:id", fetchPostCtrl);
postRoute.delete("/:id", authMiddleware, deletePostCtrl);
postRoute.put("/likes", authMiddleware, toggleAddLikeToPostCtrl);
postRoute.put("/dislikes", authMiddleware, toggleAddDislikeToPostCtrl);
postRoute.put("/:id", authMiddleware, editPostCtrl);


module.exports = postRoute;
