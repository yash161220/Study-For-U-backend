const User = require("../models/User");
const Otp = require("../models/Otp");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/passwordUpdate");  //"../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");

require("dotenv").config();

exports.sendOtp = async(req, res) => {
    try{

        // fetch the email and verify already exist or not
        const {email} = req.body;
        const checkUserPresent = await User.findOne({email});

        if(checkUserPresent){
            return res.status(401).json({
                success:false,
                message:'User already registered',
            });
        }

        // generate otp and check it uniqueness
        var otp = otpGenerator.generate(6, {
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        });
        console.log("Otp is :",otp);

        const result = await Otp.findOne({otp: otp});     // chaeck otp in its data base

        while(result){
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            });
            result = await Otp.findOne({otp: otp});
        }

        // create payload data and enter in dB
        const otpPayload = {email , otp};       // createdAt default val use

        const otpBody = await Otp.create(otpPayload);
        console.log("otpBody or Payload is :",otpBody);

        res.status(200).json({
            success:true,
            message:'Otp Sent Successfully',
            otp,
        })

    }
    catch(error){
        console.log(error);
        res.status(500).json({
            success:false,
            message:error.message,
        });
    }
};





// for sign up page
exports.signUp = async (req, res) => {
    try{

        // fetch the data and validate it from req body
        const {
            firstName,
            lastName,
            email,
            password,
            confirmPassword,
            accountType,
            contactNumber, 
            otp
        } = req.body;

        // mark these fields mandatory
        if(!firstName || !lastName || !email || !password || !confirmPassword || !accountType || !otp ){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            });
        }

        // validation
        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:"Please Check Your Password",
            });
        }

        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"User is already registered",
            });
        }

        // find most recent otp stored for the user related to that email id
        const recentOtp = await Otp.find({email}).sort({createdAt:-1}).limit(1);
        console.log(recentOtp);

        if(recentOtp.length == 0){
            return res.status(400).json({
                success:false,
                message:"Otp Not Found",
            });
        }
        else if(otp !== recentOtp[0].otp){
            return res.status(400).json({
                success:false,
                message:"Invalid Otp",
            });
        }

        // hash pass
        const hashedPassword = await bcrypt.hash(password, 10);

        // create entry in data base
        const profileDetails = await Profile.create({
            gender:null,
            dateOfBirth:null,
            about:null,
            contactNumber:null,
        })

        // Create the user
		let approved = "";
		approved === "Instructor" ? (approved = false) : (approved = true);

        // yeh rha data
        const user = await User.create({
            firstName,
            lastName,
            email,
            contactNumber,
            password : hashedPassword,
            accountType: accountType, 
            approved: approved,

            // this is for additonal info contan as its profile id
            additionalDetails : profileDetails._id,

            image : `https://api.dicebear.com/8.x/lorelei/svg?seed=${firstName} ${lastName}`,
        })
        return res.status(200).json({
            success:true,
            message:'User is registered Successfully',
            user,
        });

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'User cannot be registered. Please try again',
        })
    }
};





// for login 
exports.logIn = async (req, res) => {
    try{

        // fetch the data and validate it from req body
        const {
            email,
            password,
        } = req.body;

        // mark these fields mandatory
        if(!email || !password ){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            });
        }

        // validation
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered",
            });
        }

        // match password
        if(await bcrypt.compare(password, user.password)) {

            // const payload ={
                
            //     // line 182 pe data 
            //     email: user.email ,
            //     id: user._id,
            //     accountType: user.accountType,
            // };

            // let token = jwt.sign(payload, process.env.JWT_SECRET,{exipersIn:"24h",} );
            // user = user.toObject();
            
            // // insert token in user
            // user.token = token;

            // // pass marked undefined for security
            // user.password = undefined;

            const token = jwt.sign(
				{ email: user.email, id: user._id, accountType: user.accountType },
				process.env.JWT_SECRET,
				{
					expiresIn: "24h",
				}
			);
            user.token = token;
			user.password = undefined;

            //generate a cookie and pass in resonse
            const options ={
                expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),    // valid for 3 days
                httpOnly:true,     // so cannot access on client side
            }
            res.cookie("token", token, options).status(200).json({
                success:true,
                token,
                user,
                message:'Logged in successfully',
            })
        }
        else{
            return res.status(401).json({
                success:false,
                message:'Password is incorrect',
            });
        }

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Login failure. Please try again',
        });
    }
};




// Controller for Changing Password
exports.changePassword = async (req, res) => {
    try {
      // Get user data from req.user
      const userDetails = await User.findById(req.user.id)
  
      // Get old password, new password, and confirm new password from req.body
      const { oldPassword, newPassword } = req.body
  
      // Validate old password
      const isPasswordMatch = await bcrypt.compare(
        oldPassword,
        userDetails.password
      )
      if (!isPasswordMatch) {
        // If old password does not match, return a 401 (Unauthorized) error
        return res
          .status(401)
          .json({ success: false, message: "The password is incorrect" })
      }
  
      // Update password
      const encryptedPassword = await bcrypt.hash(newPassword, 10)
      const updatedUserDetails = await User.findByIdAndUpdate(
        req.user.id,
        { password: encryptedPassword },
        { new: true }
      )
  
      // Send notification email
      try {
        const emailResponse = await mailSender(
          updatedUserDetails.email,
          "Password for your account has been updated",
          passwordUpdated(
            updatedUserDetails.email,
            `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
          )
        )
        console.log("Email sent successfully:", emailResponse.response)
      } catch (error) {
        // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
        console.error("Error occurred while sending email:", error)
        return res.status(500).json({
          success: false,
          message: "Error occurred while sending email",
          error: error.message,
        })
      }
  
      // Return success response
      return res
        .status(200)
        .json({ success: true, message: "Password updated successfully" })
    } catch (error) {
      // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while updating password:", error)
      return res.status(500).json({
        success: false,
        message: "Error occurred while updating password",
        error: error.message,
      })
    }
  }