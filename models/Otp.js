const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const emailTemplate = require("../mail/emailVerificationTemplate");

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expire: 5*60,
    },
    otp: {
        type: String,
        required: true,
    },

});

/* want to send otp before data entry in databse so using pre middleware before module and after schema */

/* first we create a fumction to send emails */
async function sendVerificationEmail(email, otp){
    try{
        const mailResponse = await mailSender(email, "Verification Email from StudyForU ", emailTemplate(otp));
        console.log("Email sent successfully", mailResponse);
    }
    catch(error){
        console.log("error occured while sending mails ", error);
        throw error;
    }
}

/* now use pre middleware */
/* doc not passsed in function because doc is data in database but now database is empty bec we using pre middleware */
otpSchema.pre("save", async function(next){
    console.log("New document saved to database");

    /* next() so after this middleware next middleware strt */
    // Only send an email when a new document is created
	if (this.isNew) {
		await sendVerificationEmail(this.email, this.otp);
	}
	next();
})

// both way you can export
// const OTP = mongoose.model("OTP", OTPSchema);   
// module.exports = OTP;

module.exports = mongoose.model("Otp",otpSchema);