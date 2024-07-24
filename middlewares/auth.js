// Importing required modules
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// require("dotenv").config();
const dotenv = require("dotenv");
dotenv.config();


// for authentication (auth)
exports.auth = async(req, res, next) => {

    // in this we frtch the token and verify the token using secret key from env file
    try{

        // 3 ways for fetching token (most secure -> through header bec... headers are not visble in browser histrory so reducing the risk of exposing)  (least -> from body)
        const token = req.cookies.token || req.body.token || req.header("Authorization").replace("Bearer", "");

        if(!token){
            return res.status(401).json({
                success:false,
                message:'Token is missing',
            });
        }

        // verify
        try{
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log(decode);

            // store in user  in decode we have payload or from payload we get the role (accountType)
            req.user = decode;
        }
        catch(error){
            console.log(error);
            return res.status(401).json({
                success:false,
                message:'Token is incorrect',
            });
        }
        next();
    }
    catch(error){
        console.log(error);
        return res.status(401).json({
            success:false,
            message:'Something wrong while validating the token',
        })
    }
};




// student only
exports.isStudent = async(req, res, next) => {

    try{
        const userDetails = await User.findOne({ email: req.user.email });

        if(userDetails.accountType !== "Student"){
            return res.status(401).json({
                success:false,
                message:'Protected for STUDENTS Only ',
            })
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'User role cannot be verified, please try again ',
        });
    }
};





// admin only
exports.isAdmin = async(req, res, next) => {

    try{
        // const userDetails = await User.findOne({ email: req.user.email });

        if(req.user.accountType !== "Admin"){    // use userDetails.accountType if you use top line
            return res.status(401).json({
                success:false,
                message:'Protected for ADMIN Only ',
            })
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'User role cannot be verified, please try again ',
        });
    }
};





// instructor only
exports.isInstructor = async(req, res, next) => {

    try{
        const userDetails = await User.findOne({ email: req.user.email });
		console.log(userDetails);

		console.log(userDetails.accountType);

        if(userDetails.accountType !== "Instructor"){
            return res.status(401).json({
                success:false,
                message:'Protected for INSTRUCTOR Only ',
            })
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'User role cannot be verified, please try again ',
        });
    }
};