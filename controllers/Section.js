const Section = require("../models/Section");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");

// create section
exports.createSection = async (req, res) => {
    try{
        // data fetch
        const {sectionName, courseId} = req.body;
        if(!sectionName || !courseId){
            return res.status(400).json({
                success:false,
                message:'All fields are mandatory',
            });
        }
        const newSection = await Section.create({sectionName});

        // updatedDetails ( Course with section id and course is another schema so uodate it using push )
        const updatedCourseDetails = await Course.findByIdAndUpdate(
                                            courseId,  // before the section, we created the  course so we know the course id and can pass it  ourselves 
                                            {
                                                $push:{
                                                    courseContent:newSection._id,   // course ke content me id
                                                }
                                            },
                                            {new:true},
                                            ).populate({
                                                path: "courseContent",
                                                populate: {
                                                    path: "subSection",
                                                },
                                            })
                                            .exec();

        return res.status(200).json({
            success:true,
            message:'Section created successfully',
            updatedCourseDetails,
        });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to create Section , please try again',
            error:error.message,
        });
    }
};



// update section
exports.updateSection = async (req, res) => {
    try{
        // data fetch
        const {sectionName, sectionId, courseId} = req.body;
        if(!sectionName || !sectionId){
            return res.status(400).json({
                success:false,
                message:'All fields are mandatory',
            });
        }
        const section = await Section.findByIdAndUpdate(sectionId, {sectionName}, {new:true});

        const course = await Course.findById(courseId)
                                            .populate({
                                                path:"courseContent",
                                                populate:{
                                                    path:"subSection",
                                                },
                                            })
                                            .exec();

        return res.status(200).json({
            success:true,
            // message:'Section updated successfully',
            message: section,
			data:course,
        });
    }
    catch(error){
        console.error("Error updating section:", error);
        return res.status(500).json({
            success:false,
            message:'Unable to update Section , please try again',
            error:error.message,
        });
    }
};




// delete section
exports.deleteSection = async (req, res) => {
    try{
        // data fetch
        const {sectionId, courseId} = req.body;
        if(!sectionId){
            return res.status(400).json({
                success:false,
                message:'All fields are mandatory',
            });
        }

        await Course.findByIdAndUpdate(courseId, {
			$pull: {
				courseContent: sectionId,
			}
		});

        const section = await Section.findById(sectionId);
		console.log(sectionId, courseId);

		if(!section) {
			return res.status(404).json({
				success:false,
				message:"Section not Found",
			})
		}

        //delete sub section
		await SubSection.deleteMany({_id: {$in: section.subSection}});

        // deleted from section (but from course schema also ?)
        await Section.findByIdAndDelete(sectionId);

        //find the updated course and return 
		const course = await Course.findById(courseId).populate({
			path:"courseContent",
			populate: {
				path: "subSection"
			}
		})
		.exec();

        return res.status(200).json({
            success:true,
            message:'Section deleted successfully',
            data:course,
        });
    }
    catch(error){
        console.error("Error deleting section:", error);
        return res.status(500).json({
            success:false,
            message:'Unable to delete Section , please try again',
            error:error.message,
        });
    }
}