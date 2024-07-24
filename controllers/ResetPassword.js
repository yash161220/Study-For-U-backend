const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");


// resetpassword-token (generate token for  unique link or also add this unique token and its expiry time in user schema so that user also identify easily  using token )
exports.resetPasswordToken = async(req, res) => {

    try{
            // fetch data and validate
        const email = req.body.email;
        const user = await User.findOne({email:email});
        if(!user){
            return res.json({
                success:false,
                message:`This Email: ${email} is not Registered With Us Enter a Valid Email `,
            });
        }

        //generate token using crypto
        // const token = crypto.randomUUID();
        const token = crypto.randomBytes(20).toString("hex");

        // update user by adding token and expiring time
        const updatedDetails = await User.findOneAndUpdate(
                                            {email:email},
                                            {
                                                token:token,
                                                resetPasswordExpires: Date.now() + 5*60*1000,
                                            },
                                            {new:true}   // new true se abi return updated version vrna old wala milta 
        );
        console.log("DETAILS", updatedDetails);

        // create url ( use frontend host addrss generally I am using 3000 )
        const url = `http://localhost:3000/update-password/${token}`;   // with the help of token always unique link bec... token is also a unique string

        // send the mail
        await mailSender(email, "Password Reset Link", `Your Link for email verification is ${url}. Please click this url to reset your password.`);

        // return response
        return res.json({
            success:true,
            message:'Email sent successfully, please check yout email',
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Somethong went wrong while reseting the password',
        });
    }
 
};





// reset-password ( reset the passwprd and update in user )
exports.resetPassword = async(req, res) => {

    try{

        // data fetch and validate
        // but how we can fetch token from the body bec... we never pass token in body     reason is we send this by FRONTEND in req
        const{password, confirmPassword, token} = req.body;
        if(password !== confirmPassword){
            return res.json({
                success:true,
                message:'Password not matching',
            });
        }

        // find the user details basis on token and validate
        const userDetails = await User.findOne({token: token});
        if(!userDetails){
            return res.json({
                success:true,
                message:'Token is invalid',
            });
        }
        // if(userDetails.resetPasswordExpires < Date.now() ){       // checking time 
        //     return res.json({
        //         success:true,
        //         message:'Link is expired , please regenerate again',
        //     });
        // }

        if (!(userDetails.resetPasswordExpires > Date.now())) {
			return res.status(403).json({
				success: false,
				message: `Token is Expired, Please Regenerate Your Token`,
			});
		}

        // hash password
        const hashedPassword = await bcrypt.hash(password,10);

        // update
        await User.findOneAndUpdate(
            {token : token},
            {password : hashedPassword},
            {new : true},
        );

        return res.status(200).json({
            success:true,
            message:'Password reset successfully',
        });

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Somethong went wrong while reseting the password',
        });
    }
}