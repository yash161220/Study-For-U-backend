const {instance} = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const {courseEnrollmentEmail} = require("../mail/courseEnrollmentEmail");

const { paymentSuccessEmail } = require("../mail/paymentSuccessEmail");
const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const CourseProgress = require("../models/CourseProgress");




// create cpature payment and initiate the razorpay order
exports.capturePayment = async (req, res) => {
    try{

        // fetch the user id and course id (when autenticatiion is done then we pass the payload in the request )
        const {courses} = req.body;    // course_id
        const userId = req.user.id;

        if (courses.length === 0){
            return res.json({
                success:false,
                message:'Please provide valid course ID',
            });
        }

    let totalAmount = 0;

    for(const course_id of courses){
        let course;
        // console.log("courseid=",course_id);
        try{
            course = await Course.findById(course_id);
            if(!course) {
                return res.status(200).json({
                    success:false,
                    message:'Could not find the course',
                });
            }
    
            //user already pay for the same course
            const uid = new mongoose.Types.ObjectId(userId);
            if(course.studentsEnrolled.includes(uid)) {
                return res.status(200).json({
                    success:false,
                    message:'Student is already enrolled',
                });
            }
            totalAmount += course.price;
        }
        catch(error) {
            console.error(error);
            return res.status(500).json({
                success:false,
                message:error.message,
            });
        }
        // totalAmount += course.price;
    }

        //create order ( so we need to create options)
        // const amount = course.price;
        // const currency = "INR";

        const options = {
            // only amount and currency are mandatory rest optional
            amount: totalAmount * 100,
            currency: "INR",

            receipt: Math.random(Date.now()).toString(),
            notes: {   // additonal info   use in 121 line
                courseId: courses,
                userId,
            }
        };

        try{
            const paymentResponse = await instance.orders.create(options);
            console.log(paymentResponse);

            // res.json({
            //     success: true,
            //     data: paymentResponse,
            //   })
            // }

            return res.status(200).json({
                success:true,
                // courseName : course.courseName,
                // courseDescription : course.courseDescription,
                // thumbnail : course.thumbnail,
                // orderId : paymentResponse.id,
                // currency : paymentResponse.currency,
                // amount : paymentResponse.amount,

                orderId: paymentResponse.id,
                currency:paymentResponse.currency,
                amount:paymentResponse.amount,
            });
        }
        catch(error){
            console.error(error);
            return res.status(500).json({
                success:false,
                message: 'Could not initiate order',
            });
        }
    }
    catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message: message.error,
        });
    }
};




// for authenication payment (verification)
exports.verifySignature = async (req,res) => {

    try{
        // in this we perform authentication ( we send a secret key in webhook to razorpay and razorpay also send the key in resp so what we can do we compare both the keys if same measn correct resp )
        const webhookSecret = "12345678";
        const signature = req.headers["x-razorpay-signature"];   // fetch from the body resp like tha 

        // shashum is hmac object (bec we get sig in hashed form so we cant recover original key from hashed vl so we hashed the webhookKey and then compare)
        const shasum = crypto.createHmac("sha256", webhookSecret);   // get hmac object (Hashed Based Message Authentication Code )
        shasum.update(JSON.stringify(req.body));                     //change into string object
        const digest = shasum.digest("hex");                           // hashing algo o/p known as digest and it is in the form of hexadecimal

        if(signature === digest){
            console.log("Payment is Authorised")

                // find the user and course id from the given path ( in this case we cant directly find from the body bec its not a frontend req its a RAZORPAY req razorpay nothing know about user )
            const {courseId, userId} = req.body.payload.payment.entity.notes;       // so get from the notes (while creating order we pass teh ids as additional info in notes)

            try{

                // fulfil the action find the course and enroll the student in it ( UPDATE)
                const enrolledCourse = await Course.findOneAndUpdate(
                    {_id:courseId},
                    {$push:{studentsEnrolled:userId}},
                    {new:true},
                );
                if(!enrolledCourse){
                    return res.status(500).json({
                        success:false,
                        message: 'Course not found',
                    });
                }
                console.log(enrolledCourse);

                // find the student and add the course to their list enrolled courses me
                const enrolledStudent = await User.findOneAndUpdate(
                    {_id:userId},
                    {$push:{courses:courseId}},
                    {new:true},
                );
                if(!enrolledStudent){
                    return res.status(500).json({
                        success:false,
                        message: 'Student not found',
                    });
                }
                console.log(enrolledStudent);


                // send the confirmation mail (ki badhai hoo)
                const emailResponse = await mailSender(
                    enrolledStudent.email,
                    "Congratulations",    // subject
                    "Congratulations, you are onboarded into new course",  // body
                );
                console.log(emailResponse);
                return res.status(200).json({
                    success:true,
                    message: 'Signature verified and course added',
                });
            }
            catch(error){
                return res.status(500).json({
                    success:false,
                    message: message.error,
                });
            }
        }
        else{
            return res.status(400).json({
                success:false,
                message:'Invalid request ',
            });
        }

        
    }
    catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message: message.error,
        });
    }
};







// verify the payment
exports.verifyPayment = async (req, res) => {
    const razorpay_order_id = req.body?.razorpay_order_id
    const razorpay_payment_id = req.body?.razorpay_payment_id
    const razorpay_signature = req.body?.razorpay_signature
    const courses = req.body?.courses
  
    const userId = req.user.id
  
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courses ||
      !userId
    ) {
      return res.status(200).json({ success: false, message: "Payment Failed" })
    }
  
    let body = razorpay_order_id + "|" + razorpay_payment_id
  
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex")
  
    if (expectedSignature === razorpay_signature) {
      await enrollStudents(courses, userId, res)
      return res.status(200).json({ success: true, message: "Payment Verified" })
    }
  
    return res.status(200).json({ success: false, message: "Payment Failed" })
  }
  
  
  
  // Send Payment Success Email
exports.sendPaymentSuccessEmail = async (req, res) => {
    const { orderId, paymentId, amount } = req.body
  
    const userId = req.user.id
  
    if (!orderId || !paymentId || !amount || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide all the details" })
    }
  
    try {
      const enrolledStudent = await User.findById(userId)
  
      await mailSender(
        enrolledStudent.email,
        `Payment Received`,
        paymentSuccessEmail(
          `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
          amount / 100,
          orderId,
          paymentId
        )
      )
    } catch (error) {
      console.log("error in sending mail", error)
      return res
        .status(400)
        .json({ success: false, message: "Could not send email" })
    }
  }
  
  
  
  // enroll the student in the courses
const enrollStudents = async (courses, userId, res) => {
    if (!courses || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Please Provide Course ID and User ID" })
    }
  
    for (const courseId of courses) {
      try {
        // Find the course and enroll the student in it
        const enrolledCourse = await Course.findOneAndUpdate(
          { _id: courseId },
          { $push: { studentsEnroled: userId } },
          { new: true }
        )
  
        if (!enrolledCourse) {
          return res
            .status(500)
            .json({ success: false, error: "Course not found" })
        }
        console.log("Updated course: ", enrolledCourse)
  
        const courseProgress = await CourseProgress.create({
          courseID: courseId,
          userId: userId,
          completedVideos: [],
        })
        // Find the student and add the course to their list of enrolled courses
        const enrolledStudent = await User.findByIdAndUpdate(
          userId,
          {
            $push: {
              courses: courseId,
              courseProgress: courseProgress._id,
            },
          },
          { new: true }
        )
  
        console.log("Enrolled student: ", enrolledStudent)
        // Send an email notification to the enrolled student
        const emailResponse = await mailSender(
          enrolledStudent.email,
          `Successfully Enrolled into ${enrolledCourse.courseName}`,
          courseEnrollmentEmail(
            enrolledCourse.courseName,
            `${enrolledStudent.firstName} ${enrolledStudent.lastName}`
          )
        )
  
        console.log("Email sent successfully: ", emailResponse.response)
      } catch (error) {
        console.log(error)
        return res.status(400).json({ success: false, error: error.message })
      }
    }
  }