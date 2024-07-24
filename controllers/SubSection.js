const Section = require("../models/Section");
const SubSection = require("../models/SubSection")
const {uploadImageToCloudinary} = require("../utils/imageUploader");
require("dotenv").config();

//create-subsection
exports.createSubSection = async (req, res) => {
    try{

        //fetch the data (title, duration , description, url(extract files so need to upload vid to cloudinary and get url  bec we need to store vid not url )
        const {title, description, timeOfDuration, sectionId} = req.body;
        const video = req.files.videoFile;

        //if(video)console.log("video done");

        // validation
        if(!title || !description || !timeOfDuration || !sectionId || !video){
            return res.status(400).json({
                success:false,
                message:'All fields are mandatory',
            });
        }

        //console.log(sectionId);

        const ifsection= await Section.findById(sectionId);
        if (!ifsection) {
                return res.status(404).json({ 
                  success: false, 
                  message: "Section not found" 
                });
        }

        // upload video to cloudinary
        const uploadDetails = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
        //console.log(uploadDetails);

        //create subsection
        const SubSectionDetails = await SubSection.create(
            {   title:title,
                timeDuration: timeOfDuration,
                description:description,
                videoUrl:uploadDetails.secure_url   // provide the url of provided video
            }
        );

        // update subsection id in section
        const updatedSection = await Section.findByIdAndUpdate({_id:sectionId},
            {$push:{
                subSection:SubSectionDetails._id,
            }},
            {new:true},  // when you want to log section id object then use populate
        ).populate("subSection");

        console.log(updatedSection);

        //const updatedCourse = await Course.findById(courseId).populate({ path: "courseContent", populate: { path: "subSection" } }).exec();
        //console.log(updatedCourse);

        return res.status(200).json({
            success:true,
            message:'SubSection created successfully',
            data: updatedSection,
        });

    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to create Sub Section , please try again',
            error:error.message,
        });
    }
}


// update sub section
exports.updateSubSection = async (req, res) => {
    try {
      const { sectionId, subSectionId, title, description } = req.body
      const subSection = await SubSection.findById(subSectionId)
  
      if (!subSection) {
        return res.status(404).json({
          success: false,
          message: "SubSection not found",
        })
      }
  
      if (title !== undefined) {
        subSection.title = title
      }
  
      if (description !== undefined) {
        subSection.description = description
      }
      if (req.files && req.files.video !== undefined) {
        const video = req.files.video;
        const uploadDetails = await uploadImageToCloudinary(
          video,
          process.env.FOLDER_NAME
        );
        subSection.videoUrl = uploadDetails.secure_url
        subSection.timeDuration = `${uploadDetails.duration}`
      }
  
      await subSection.save();
  
      // find updated section and return it
      const updatedSection = await Section.findById(sectionId).populate("subSection");
  
      console.log("updated section", updatedSection)
  
      return res.json({
        success: true,
        message: "Section updated successfully",
        data: updatedSection,
      })
    } 
    catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating the section",
      })
    }
};
  
  

// delete subs section
exports.deleteSubSection = async (req, res) => {
    try {
      const { subSectionId, sectionId } = req.body
      await Section.findByIdAndUpdate(
        { _id: sectionId },
        {
          $pull: {
            subSection: subSectionId,
          },
        }
      )
      const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })
  
      if (!subSection) {
        return res
          .status(404)
          .json({ success: false, message: "SubSection not found" })
      }
  
      // find updated section and return it
      const updatedSection = await Section.findById(sectionId).populate(
        "subSection"
      )
  
      return res.json({
        success: true,
        message: "SubSection deleted successfully",
        data: updatedSection,
      })
    } 
    catch (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: "An error occurred while deleting the SubSection",
      })
    }
};
