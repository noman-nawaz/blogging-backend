const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, //'doz76hqpz',
  api_key: process.env.CLOUUDINARY_API_KEY, //'864154232334642',
  api_secret: process.env.CLOUUDINARY_SECRET_KEY //'CBzM0TI2UVNg06IEQ6mpoz32e_g'
});

const cloudinaryUploadImg = async fileToUpload => {
  try {
    // upload to cloudinary
    const data = await cloudinary.uploader.upload(fileToUpload, {
      resource_type: "auto",
    });
    return {
      // return secure url of uploaded image
      url: data?.secure_url,
    };
  } catch (error) {
    return error;
  }
};

module.exports = cloudinaryUploadImg;
