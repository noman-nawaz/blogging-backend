const express = require("express");
const { 
    userRegisterCtrl,
    userLoginCtrl,
    fetchUsersCtrl,
    deleteUserCtrl,
    fetchUserDetailsCtrl,
    userProfileCtrl,
    updateUserCtrl,
    updateUserPasswordCtrl,
    followingUserCtrl,
    unfollowUserCtrl,
    blockUserCtrl,
    unBlockUserCtrl,
    profilePhotoUploadCtrl,
    generateVerificationTokenCtrl,
    accountVerificationCtrl,
    forgetPasswordTokenCtrl,
    passwordResetCtrl,
    fetchUserLikesCtrl
} = require("../../controllers/users/usersCtrl");

const authMiddleware = require("../../middlewares/auth/authMiddleware");
const { photoUpload, profilePhotoResize } = require("../../middlewares/uploads/photoUpload");

const userRoutes = express.Router();

userRoutes.post("/register", userRegisterCtrl);
userRoutes.post("/login", userLoginCtrl);
userRoutes.get("/",authMiddleware, fetchUsersCtrl);
userRoutes.delete("/:id", deleteUserCtrl);
userRoutes.get("/:id", fetchUserDetailsCtrl);
userRoutes.get("/profile/:id", authMiddleware, userProfileCtrl);
userRoutes.put("/", authMiddleware, updateUserCtrl);
userRoutes.put("/password", authMiddleware, updateUserPasswordCtrl);
userRoutes.put("/follow", authMiddleware, followingUserCtrl);
userRoutes.put("/unfollow", authMiddleware, unfollowUserCtrl);
userRoutes.put("/block-user/:id", authMiddleware, blockUserCtrl);
userRoutes.put("/unblock-user/:id", authMiddleware, unBlockUserCtrl);
userRoutes.put("/profilephoto-upload", authMiddleware, photoUpload.single("image"), profilePhotoResize, profilePhotoUploadCtrl);
userRoutes.post('/generate-verify-email-token', authMiddleware, generateVerificationTokenCtrl);
userRoutes.put('/verify-account', authMiddleware, accountVerificationCtrl);
userRoutes.post('/forget-password-token', forgetPasswordTokenCtrl);
userRoutes.put('/reset-password', passwordResetCtrl); 

userRoutes.get("/likes/:id", authMiddleware, fetchUserLikesCtrl);

module.exports = userRoutes;
