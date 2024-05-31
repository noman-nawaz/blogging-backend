const User = require("../../model/user/User");
const Post = require("../../model/post/Post");
const expressAsyncHandler = require("express-async-handler"); // used for error handling
const generateToken = require("../../config/token/generateToken");  // used to generate token
const validateMongodbId = require("../../utils/validateMongodbID"); // used to check if user id is valid
const cloudinaryUploadImg = require("../../utils/cloudinary");
const blockUser = require("../../utils/blockUser");
const fs = require("fs");
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const crypto = require('crypto');
const { setTransaction, sendEther } = require("../blockchaincontroller");



var transporter = nodemailer.createTransport(smtpTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  auth: {
    user: process.env.ADMIN_EMAIL, 
    pass: process.env.ADMIN_EMAIL_PASSWORD, 
  },
}));

//-------------------------------------
//Register
//-------------------------------------

const userRegisterCtrl = expressAsyncHandler(async (req, res) => {
  //Check if user Exist
  const userExists = await User.findOne({ email: req?.body?.email });

  if (userExists) throw new Error("User already exists");
  try {
    //Register user
    const user = await User.create({
      firstName: req?.body?.firstName,
      lastName: req?.body?.lastName,
      email: req?.body?.email,
      password: req?.body?.password,
      walletAddress: req?.body?.walletAddress
    });

    //build your message
    const message = `
        <p>Welcome ${req?.body?.firstName}! 🎉 We are thrilled to have you join the BlogBliss community. Your decision to register with us means a lot, and we're excited to embark on this blogging journey together.</p>
        <p>At BlogBliss, we believe in the power of words to inspire, inform, and connect. Whether you're here to share your thoughts, learn something new, or engage with fellow bloggers, you're in the right place.</p>
    `;
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: req?.body?.email,
      subject: 'Welcome to BlogBliss',
      html: message,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.json(user);
  } catch (error) {
    res.json(error);
  }
});

//-------------------------------
//Login user
//-------------------------------

const userLoginCtrl = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //check if user exists
  const userFound = await User.findOne({ email });
  //check if blocked
  if (userFound?.isBlocked)
    throw new Error("Access Denied You have been blocked");
  //Check if password is match
  if (userFound && (await userFound.isPasswordMatched(password))) {
  
    res.json({
      id: userFound?._id, 
      firstName: userFound?.firstName,
      lastName: userFound?.lastName,
      email: userFound?.email,
      profilePhoto: userFound?.profilePhoto,
      isAdmin: userFound?.isAdmin,
      token: generateToken(userFound?._id),
      isVerified: userFound?.isAccountVerified
    });
  } else {
    res.status(401);
    throw new Error("Invalid Login Credentials");
  }
});


//-------------------------------
//Fetch all the users
//-------------------------------

const fetchUsersCtrl = expressAsyncHandler(async (req, res) => {
  console.log(req.headers);
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.json(error);
  }
});


//-------------------------------
//Delete a user
//-------------------------------

const deleteUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  //check if user id is valid
  validateMongodbId(id);
  try {
    const deletedUser = await User.findByIdAndDelete(id);
    res.json(deletedUser);
  } catch (error) {
    res.json(error);
  }
});

//-------------------------------
//Fetch user details
//-------------------------------

const fetchUserDetailsCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  //check if user id is valid
  
  validateMongodbId(id);
  try {
    const user = await User.findById(id);
    res.json(user);
  } catch (error) {
    res.json(error);
  }
});

//------------------------------
//User profile
//------------------------------
const userProfileCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  
  // Get the login user's ID
  const loginUserId = req.user._id.toString();
  
  try {
    const myProfile = await User.findById(id)
      .populate("posts")
      .populate("viewedBy");
      
    // Check if the profile belongs to the logged-in user
    if (myProfile._id.toString() === loginUserId) {
      // If the profile belongs to the logged-in user, return the profile without updating viewedBy
      return res.json(myProfile);
    }
    
    // Update the viewedBy array with the user's ID
    await User.findByIdAndUpdate(id, {
      $addToSet: { viewedBy: loginUserId }, // Use $addToSet to ensure no duplicate entries
    }, { new: true }); // { new: true } option returns the updated document
    
    // Return the updated profile
    const updatedProfile = await User.findById(id)
      .populate("posts")
      .populate("viewedBy");
    res.json(updatedProfile);
  } catch (error) {
    res.json(error);
  }
});



//------------------------------
//Update profile
//------------------------------
const updateUserCtrl = expressAsyncHandler(async (req, res) => {
  const { _id } = req?.user;
  validateMongodbId(_id);

  const user = await User.findByIdAndUpdate(
    _id,
    {
      firstName: req?.body?.firstName,
      lastName: req?.body?.lastName,
      email: req?.body?.email,
      bio: req?.body?.bio,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.json(user);
});

//------------------------------
//Update password
//------------------------------

const updateUserPasswordCtrl = expressAsyncHandler(async (req, res) => {
  //destructure the login user
  const { _id } = req.user;
  const { password } = req.body;
  validateMongodbId(_id);
  //Find the user by _id
  const user = await User.findById(_id);

  if (password) {
    user.password = password;
    const updatedUser = await user.save();
    res.json(updatedUser);
  } else {
    res.json(user);
  }
});

//------------------------------
//following
//------------------------------

const followingUserCtrl = expressAsyncHandler(async (req, res) => {
  //1.Find the user you want to follow and update it's followers field
  //2. Update the login user following field
  const { followId } = req.body;
  const loginUserId = req.user.id;

  //find the target user and check if the login id exist
  const targetUser = await User.findById(followId);

  const alreadyFollowing = targetUser?.followers?.find(
    user => user?.toString() === loginUserId.toString()
  );

  if (alreadyFollowing) throw new Error("You have already followed this user");

  //1. Find the user you want to follow and update it's followers field
  await User.findByIdAndUpdate(
    followId,
    {
      $push: { followers: loginUserId },
      isFollowing: true,
    },
    { new: true }
  );

  //2. Update the login user following field
  await User.findByIdAndUpdate(
    loginUserId,
    {
      $push: { following: followId },
    },
    { new: true }
  );
  res.json("You have successfully followed this user");
});

//------------------------------
//unfollow
//------------------------------

const unfollowUserCtrl = expressAsyncHandler(async (req, res) => {
  const { unFollowId } = req.body;
  const loginUserId = req.user.id;

  await User.findByIdAndUpdate(
    unFollowId,
    {
      $pull: { followers: loginUserId },
      isFollowing: false,
    },
    { new: true }
  );

  await User.findByIdAndUpdate(
    loginUserId,
    {
      $pull: { following: unFollowId },
    },
    { new: true }
  );

  res.json("You have successfully unfollowed this user");
});

//------------------------------
//Block user
//------------------------------

const blockUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);

  const user = await User.findByIdAndUpdate(
    id,
    {
      isBlocked: true,
    },
    { new: true }
  );
  res.json(user);
});

//------------------------------
//Unblock user
//------------------------------

const unBlockUserCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);

  const user = await User.findByIdAndUpdate(
    id,
    {
      isBlocked: false,
    },
    { new: true }
  );
  res.json(user);
});

//------------------------------
//Profile photo upload
//------------------------------

const profilePhotoUploadCtrl = expressAsyncHandler(async (req, res) => {
  //Find the login user
  const { _id } = req.user;
  //1. Get the path to img
  const localPath = `public/images/profile/${req.file.filename}`;
  //2.Upload to cloudinary
  const imgUploaded = await cloudinaryUploadImg(localPath);

  const foundUser = await User.findByIdAndUpdate(_id,
  {
    profilePhoto: imgUploaded?.url,
  },
  { new: true}
  );
  // remove image from temporary local storage
  fs.unlinkSync(localPath);
  console.log(imgUploaded);
  res.json(foundUser);
});

//------------------------------
//Generate Account Verification Token
//------------------------------

const generateVerificationTokenCtrl = expressAsyncHandler(async (req, res) => {
  const loginUserId = req.user.id;

  const user = await User.findById(loginUserId);
  try {
    //Generate token
    const verificationToken = await user.createAccountVerificationToken();
    // save the user
    await user.save();
    const email = user?.email;
    console.log(email);
    // Build your message
    
    const resetURL = `If you were requested to verify your account, verify now within 10 minutes, otherwise ignore this message <a href="https://blogbliss.vercel.app/verify-account/${verificationToken}">Click to Verify</a>`;
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: 'Verify Your Account',
      html: resetURL,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.json(resetURL);
  } catch (error) {
    res.json(error);
  }
});

//------------------------------
//Account verification
//------------------------------

const accountVerificationCtrl = expressAsyncHandler(async (req, res) => {
  const { token } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  //find this user by token

  const userFound = await User.findOne({
    accountVerificationToken: hashedToken,
    accountVerificationTokenExpires: { $gt: new Date() },
  });
  if (!userFound) throw new Error("Token expired, try again later");
  //update the proprt to true
  userFound.isAccountVerified = true;
  userFound.accountVerificationToken = undefined;
  userFound.accountVerificationTokenExpires = undefined;
  await userFound.save();
  res.json(userFound);
});

//------------------------------
//Forget password token generator
//------------------------------

const forgetPasswordTokenCtrl = expressAsyncHandler(async (req, res) => {
  //find the user by email
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new Error("User Not Found");

  try {
    //Create token
    const token = await user.createPasswordResetToken();
    console.log(token);
    await user.save();

    //build your message
    const resetURL = `If you were requested to reset your password, reset now within 10 minutes, otherwise ignore this message <a href="https://blogbliss.vercel.app/reset-password/${token}">Click to Reset</a>`;
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: email,
      subject: 'Reset Password',
      html: resetURL,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    res.json("Email sent");
  } catch (error) {
    res.json(error);
  }
});

//------------------------------
//Password reset
//------------------------------

const passwordResetCtrl = expressAsyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  //find this user by token
  const user = await User.findOne({
    passwordRessetToken: hashedToken,
    passwordResetExpires: { $gt: new Date()},
  });
  if (!user) throw new Error("Token Expired, try again later");

  //change the password
  user.password = password;
  user.passwordRessetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json(user);
});

//------------------------------
//Calculate Likes Controller
//------------------------------

const fetchUserLikesCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    // Fetch all posts of the given user, including only the 'likes' field
    const userPosts = await Post.find({ user: id }, { likes: 1 }).lean();

    // Calculate total likes across all posts
    let newTotalLikes = 0;
    userPosts.forEach(post => {
      newTotalLikes += post.likes.length;
    });

    // Retrieve the user document
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch the number of followers for the given user
    const followersCount = user.followers.length;
    const rewardCount = (newTotalLikes*1) + (followersCount * 5);

    const followers = followersCount- user.prevFollowersCount;
    const likes = newTotalLikes - user.prevTotalLikes; 
    const reward = rewardCount - user.prevReward;
    const blockId = Math.floor(Math.random() * 900000) + 100000;
  
    sendEther({receiverAddress: user.walletAddress, amountInEthers: reward});
  
    //setTransaction({_id: blockId, _userid: user.id, _followers: followers, _likes: likes, _reward: reward});
    // Update totalLikes and prevTotalLikes
    user.newTotalLikes = likes;
    user.newFollowersCount = followers;
    user.newReward = reward;
    user.prevTotalLikes += user.newTotalLikes;
    user.prevFollowersCount += user.newFollowersCount;
    user.prevReward += user.newReward;
    user.rewardBlockId = blockId;
    // Save the updated user document
    await user.save();
    
    // Send the total likes count as JSON response
    res.json(user);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error fetching user posts and updating total likes:", error);

    // Send an internal server error response
    res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = { 
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
};

