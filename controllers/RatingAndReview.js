const Course = require("../models/Course");
const RatingAndReview = require("../models/Rate");
const { mongo, default: mongoose } = require("mongoose");




// create rating
exports.createRating = async (req, res) => {

    try{

        // fetch userid  user already login then he/she can provide the rating ( auth middleware token detach then get payload and link with req object)
        const userId = req.user.id;

        // fetch rest details like rating , reviews, courseid
        const {rating, review, courseId} = req.body;

        // check studnet enrolled or not
        const courseDetails = await Course.findOne(
                                    {_id:courseId,          // get the course detail
                                     studentEnrolled: {$elemMatch: {$er: userId}},      // check this id exist in enrolled Students
                                    }

        );

        if(!courseDetails){
            return res.status(404).json({
                success:false,
                message:'Student is not enrolled in the course',
            }); 
        }

        // check if user already reviewed the course
        const alreadyReviewed = await RatingAndReview.findOne({
            user:userId,
            course:courseId,
        });

        if(alreadyReviewed){
            return res.status(403).json({
                success:false,
                message:'Course is already reviewed by the user',
            }); 
        }

        // create rating review using save or create
        const ratingReview = await RatingAndReview.create({
            rating, review,
            course:courseId,
            user:userId,
        });

        //update course with the rating review
        const updatedCourseDetails = await Course.findByIdAndUpdate({_id:courseId},
            {
                $push: {
                    ratingAndReview: ratingReview._id,
                }
            },
            {new:true}
        );
        console.log(updatedCourseDetails);

        return res.status(200).json({
            success:true,
            message:'Rating and Review created successfully',
            ratingReview,
        });

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:' Rating and Review are not created',
        });
    }
};






// getaverage rating
exports.getAverageRating = async(req,res) => {
    try{

        // fetch course id
        const courseId = req.body.courseId;
        
        const result = await RatingAndReview.aggregate([    //aggregate reteurn an array
            {
                $match:{    // match operator used to find something
                    course: new mongoose.Types.ObjectId(courseId),    // courseId initally in string and then convert into objedt id
                },
            },
            {
                $group:{    // use when perform cal...
                    _id:null,     // if u dont know on what basis we create group then we pass the id as null
                    averageRating: {$avg: "rating"},    //find the avrg usign avg operator
                } 
            }
        ]);

        // return rating
        if(result.length > 0){ // rating cal 
            return res.status(200).json({
                success:true,
                averageRating: result[0].averageRating,    // stroed in array
            });
        }

        // if no rating review present then default is 0
        return res.status(200).json({
            success:true,
            message:'Average rating is 0, no rating given till now',
            averageRating: 0,
        });


    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:' Average rating not created',
        });
    }
};






// get all rating in which provide all rating (saare courses ke rating not for any specific course)
exports.getAllRating = async (req, res) => {
    try{

        const allReviews = await RatingAndReview.find({}).sort({rating:"desc"}).populate({
                                                                                    path:"user",
                                                                                    select:"firstName lastName email image",  // means only these fields we want 
                                                                                })
                                                                                .populate({
                                                                                    path:"course",
                                                                                    select:"couseName",
                                                                                })
                                                                                .exec();

        return res.status(200).json({
            success:true,
            message:'All reviews fetched successfully',
            data : allReviews,
        });
                                                                            
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:' Rating not fetched',
        });
    }
}