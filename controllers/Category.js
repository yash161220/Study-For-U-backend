const { Mongoose } = require("mongoose");
const Category = require("../models/Category");

function getRandomInt(max) {
    return Math.floor(Math.random() * max)
  }


// createCategory (in which u fetch all the details and make a entry in dB)
exports.createCategory = async (req, res) => {

    try{

        //fetch data and validate it  and abi courses ka data nhi
        const {name, description} = req.body;

        if(!name || !description){
            return res.status(400).json({
                success:false,
                message:'All fields are required',
            });
        }

        // create entry in dataBase
        const CategorysDetails = await Category.create({
            name:name,
            description:description,
        });
        console.log(CategorysDetails);

        // return response
        return res.status(200).json({
            success:true,
            message:'Categorys created successfully',
        });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Categorys not created',
        });
    }
}





// getalltags (so it provide all the data)
exports.showAllCategories = async(req,res) => {

    try{

        // find all data and return it 
        const allCategorys = await Category.find({}, {name:true, description:true});
        res.status(200).json({
            success:true,
            data: allCategorys,
            message:'AllCategorys returned successfully',
        });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'AllCategorys not created',
        });
    }
}




// category page details(ki kya kya hoga) like Dsa category search then voh show ho saath me top selling bi hoo
exports.categoryPageDetails = async(req, res) => {
    try{

        // fetch category id
        const {catergoryId} = req.body;
        const selectedCategory = await Category.findById(catergoryId)
          .populate({
            path: "courses",
            match: { status: "Published" },
            populate: "ratingAndReviews",
          })
          .exec()

        //validation
        if(!selectedCategory){
            console.log("Category not found.");
            return res.status(404).json({
                success:false,
                message:'Category Data not found',
            });  
        }

        // Handle the case when there are no courses
        if (selectedCategory.courses.length === 0) {
            console.log("No courses found for the selected category.")
            return res.status(404).json({
            success: false,
            message: "No courses found for the selected category.",
            })
        }

        // // get course for differnet categories id
        // const differnetCategories = await Category.find({_id: {$ne : catergoryId}, }).populate("courses").exec();    // ne => not equal 


        // // for top selling courses
        

        // return res.status(200).json({
        //     success:true,
        //     data: {
        //         selectedCategory,
        //         differnetCategories,
        //     },
        // }); 

        // Get courses for other categories
      const categoriesExceptSelected = await Category.find({
        _id: { $ne: categoryId },
      });
      let differentCategory = await Category.findOne(
        categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]._id)
        .populate({
          path: "courses",
          match: { status: "Published" },
        })
        .exec()

        //console.log("Different COURSE", differentCategory)
      // Get top-selling courses across all categories
      const allCategories = await Category.find()
        .populate({
          path: "courses",
          match: { status: "Published" },
          populate: {
            path: "instructor",
        },}).exec()


      const allCourses = allCategories.flatMap((category) => category.courses)

      const mostSellingCourses = allCourses
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10)

       // console.log("mostSellingCourses COURSE", mostSellingCourses)

      res.status(200).json({
        success: true,
        data: {
          selectedCategory,
          differentCategory,
          mostSellingCourses,
        },
      });
    }
    
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:'Eror in category page details',
        }); 
    }
}
