const expressAsyncHandler = require("express-async-handler");
const Post = require("../../model/post/Post");
const User = require("../../model/user/User");
const fs = require("fs");
const Filter = require("bad-words");
const validateMongodbId = require("../../utils/validateMongodbID");
const cloudinaryUploadImg = require("../../utils/cloudinary");
const Web3 = require('web3');

//const web3 = new Web3('https://eth-mainnet.g.alchemy.com/v2/9QrKCbTIHLCBj81pNpM38KBDxYb05F98');
const web3 = new Web3('https://sepolia.infura.io/v3/6d92e490ede84d3bbd487e2ef0784bac');

//-------------------------------
//Craete Post
//-------------------------------
const createPostCtrl = expressAsyncHandler(async (req, res) => {
  // Find the logged in User
  const id  = req.user.id;

  // Check for bad words
  const filter = new Filter();
  const isProfaneTitle = filter.isProfane(req.body.title);
  const isProfaneDescription = filter.isProfane(req.body.description);
  // Block user if bad words are used
  if (isProfaneTitle || isProfaneDescription) {
    await User.findByIdAndUpdate(id, {
      isBlocked: true,
    });
    throw new Error(
      "Creating Failed because it contains profane words and you have been blocked"
    );
  }

  // Set a default image URL
  let imageUrl = "https://res.cloudinary.com/doz76hqpz/image/upload/v1710157452/default_post_x9vfjd.jpg";

  if(req.file) {
    // If user has uploaded an image, proceed with uploading it
    const localPath = `public/images/posts/${req.file.filename}`;
    const imgUploaded = await cloudinaryUploadImg(localPath);
    imageUrl = imgUploaded?.url;
    // Remove image from temporary local storage
    fs.unlinkSync(localPath);
  }
   const isFeatured = req.body.isFeatured;

   if(isFeatured==='true') 
    {
      const transactionHash = req.body.transectionHash;
      const walletAddress = "0x635e577109b5AC6D616f017C4f84F98e5210a704";
      const receipt = await web3.eth.getTransactionReceipt(transactionHash);
      console.log(receipt);
      if(!receipt)
        {
          throw new Error("Transaction receipt not found or not confirmed yet.");
        }

      const flag = receipt.to.toLowerCase() !== walletAddress.toLowerCase();
      if(flag)
        {
          throw new Error("OOps! Transaction is not sent to valid account.");
        }
      const transaction = await web3.eth.getTransaction(transactionHash);
      const amountReceived = web3.utils.fromWei(transaction.value.toString(), 'ether');
      if(parseFloat(amountReceived) < 0.01)
        {
          throw new Error("OOps! Transaction amount is less than 0.01 Eth.");
        }
      if(!flag && receipt && parseFloat(amountReceived) === 0.01)
        {
         
          try {
            // Create the post with or without image URL
            const post = await Post.create({
              title: req.body.title,
              category: req.body.category,
              description: req.body.description,
              image: imageUrl,
              isFeatured: req.body.isFeatured,
              //transactionHash: req.body.transactionHash,
              user: id,
            });
            res.json(post);
          } catch (error) {
            res.json(error);
          }
        }
    }
    else
    {
  try {
    // Create the post with or without image URL
    const post = await Post.create({
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      image: imageUrl,
      user: id,
    });
    res.json(post);
  } catch (error) {
    console.log(error);
    res.json(error);
  }
}
});

const fetchPostsCtrl = expressAsyncHandler(async (req, res) => {
  const hasCategory = req.query.category;
  try {
    let posts;
    // check if it has a category
    if (hasCategory) {
      posts = await Post.find({ category: hasCategory }).populate("user").populate("comments");
    } else {
      posts = await Post.find().populate("user").populate("comments");
    }
    
    // Sort the posts based on isFeatured flag and most recent
    posts.sort((a, b) => {
      // Sort by isFeatured flag (true first)
      if (b.isFeatured - a.isFeatured !== 0) {
        return b.isFeatured - a.isFeatured;
      }
      // Sort by most recent (createdAt)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(posts);
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
    const post = await Post.findOneAndDelete({ _id: id });
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
