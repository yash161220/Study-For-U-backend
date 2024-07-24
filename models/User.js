const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    firstName: {
        type:String,
        required:true,
        trim:true,
    },
    lastName: {
        type:String,
        required:true,
        trim:true,
    },
    email: {
        type:String,
        required:true,
        trim:true,
    },
    password: {
        type:String,
        required:true,
    },

    // 
    // confirmPassword: {
    //     type:String,
    //     required:true,
    // },

    //
    // 
    
    accountType: {
        type:String,
        enum:["Admin","Student","Instructor"],
        required:true,
    },

    active: {
		type: Boolean,
		default: true,
	},
	approved: {
		type: Boolean,
			default: true,
	},


    /*additional data like gender , DOB etc etc*/
    additionalDetails: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Profile",
    },

    /*user can select more than 1 course so we create array*/
    courses: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
        }
    ],

    image: {
        type: String,
        required: true,
        default: true,
    },

    // for forgot pass to identufy particular user using token (or we can say tha =t we can fetch data od that user using this toekn)
    token: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    },

    courseProgress: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CourseProgress",
        }
    ],

    // Add timestamps for when the document is created and last modified
	},
	{ timestamps: true }
);

module.exports = mongoose.model("User",userSchema);