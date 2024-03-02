const expressAsyncHandler = require("express-async-handler");
const Post = require("../../model/post/Post");
const User = require("../../model/user/User");
const fs = require("fs");
const Filter = require("bad-words");
const validateMongodbId = require("../../utils/validateMongodbID");
const cloudinaryUploadImg = require("../../utils/cloudinary");

const createPostCtrl = expressAsyncHandler(async (req, res) => {
  // Find the logged in User
  const id  = req.user.id;

  //check for bad words
  const filter = new Filter();
  const isProfane = filter.isProfane(req.body.title, req.body.description);
  //Block user if bad words are used
  if (isProfane) {
    await User.findByIdAndUpdate(id, {
      isBlocked: true,
    });
    throw new Error(
      "Creating Failed because it contains profane words and you have been blocked"
    );
  }

  //1. Get the path to img
  const localPath = `public/images/posts/${req.file.filename}`;
  //2.Upload to cloudinary
  const imgUploaded = await cloudinaryUploadImg(localPath);
  try {
     const post = await Post.create({
       ...req.body,
       image: imgUploaded?.url,
       user: id,
     });
    res.json(post);
    // remove image from temporary local storage
    fs.unlinkSync(localPath);
  } catch (error) {
    res.json(error);
  }
});

//-------------------------------
//Fetch all the Posts
//-------------------------------

const fetchPostsCtrl = expressAsyncHandler(async (req, res) => {
  const hasCategory = req.query.category;
  try {
    // check if it has a category
    if(hasCategory) {
      const posts = await Post.find({category: hasCategory}).populate("user").populate("comments");
    res.json(posts);
    } else {
      const posts = await Post.find().populate("user").populate("comments");
    res.json(posts);
    }
  } catch (error) {
    res.json(error);
  }
});

//------------------------------
//Fetch a single post
//------------------------------

const fetchPostCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const post = await Post.findById(id).populate("user").populate("likes").populate("disLikes").populate("comments");
    // update number of views
    await Post.findByIdAndUpdate(id, {
      $inc: {numViews: 1}
    },
      {new: true}
    );
    res.json(post);
  } catch (error) {
    res.json(error);
  }
});

//------------------------------
// Update post
//------------------------------

const editPostCtrl = expressAsyncHandler(async (req, res) => {
  console.log(req.user);
  const { id } = req.params;
  validateMongodbId(id);

  try {
    const post = await Post.findByIdAndUpdate(
      id,
      {
        ...req.body,
        //user: req.user?._id,
      },
      {
        new: true,
      }
    );
    res.json(post);
  } catch (error) {
    res.json(error);
  }
});

//------------------------------
// Delete post
//------------------------------

const deletePostCtrl = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);

  try {
    const post = await Post.findOneAndDelete(id);
    res.json(post);
  } catch (error) {
    res.json(error);
  }
});

// Likes
const toggleAddLikeToPostCtrl = expressAsyncHandler(async (req, res) => {
  const { postId } = req.body;
  const post = await Post.findById(postId);
  const loginUserId = req?.user?._id;
  const alreadyLiked = post?.likes?.includes(loginUserId);

  if (alreadyLiked) {
    // Remove like if already liked
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $pull: { likes: loginUserId },
        isLiked: false,
        isDisLiked: false,
      },
      { new: true }
    );
    res.json(updatedPost);
  } else {
    // Toggle like
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $push: { likes: loginUserId },
        $pull: { disLikes: loginUserId },
        isLiked: true,
        isDisLiked: false,
      },
      { new: true }
    );
    res.json(updatedPost);
  }
});

// Dislikes
const toggleAddDislikeToPostCtrl = expressAsyncHandler(async (req, res) => {
  const { postId } = req.body;
  const post = await Post.findById(postId);
  const loginUserId = req?.user?._id;
  const alreadyDisliked = post?.disLikes?.includes(loginUserId);

  if (alreadyDisliked) {
    // Remove dislike if already disliked
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $pull: { disLikes: loginUserId },
        isDisLiked: false,
        isLiked: false,
      },
      { new: true }
    );
    res.json(updatedPost);
  } else {
    // Toggle dislike
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $push: { disLikes: loginUserId },
        $pull: { likes: loginUserId },
        isDisLiked: true,
        isLiked: false,
      },
      { new: true }
    );
    res.json(updatedPost);
  }
});

module.exports = { 
  createPostCtrl,
  fetchPostsCtrl,
  fetchPostCtrl,
  editPostCtrl,
  deletePostCtrl,
  toggleAddLikeToPostCtrl,
  toggleAddDislikeToPostCtrl
};
