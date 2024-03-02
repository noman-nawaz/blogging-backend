const expressAsyncHandler = require("express-async-handler");
const sgMail = require("@sendgrid/mail");
const Filter = require("bad-words");
const EmailMsg = require("../../model/EmailMessaging/EmailMessaging");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ADMIN_EMAIL, 
    pass: process.env.ADMIN_EMAIL_PASSWORD, 
  },
});

//------------------------------
//Email Messaging
//------------------------------

const sendEmailMsgCtrl = expressAsyncHandler(async (req, res) => {
  const { to, subject, message } = req.body;
  //get the message
  const emailMessage = subject + " " + message;
  //prevent profanity/bad words
  const filter = new Filter();

  const isProfane = filter.isProfane(emailMessage);
  if (isProfane)
    throw new Error("Email sent failed, because it contains profane words.");
  try {
    //build the email message
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: to,
      subject: subject,
      text: message,
    };
    // Send the email
    await transporter.sendMail(mailOptions);
    
    //save to our db
    await EmailMsg.create({
      sentBy: req?.user?._id,
      from: req?.user?.email,
      to,
      message,
      subject,
    });
    res.json("Mail sent");
  } catch (error) {
    res.json(error);
  }
});

module.exports = { sendEmailMsgCtrl };
