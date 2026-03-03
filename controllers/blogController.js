const {
  uploadFileToCloudinary,
  deleteMultipleFromCloudinary,
} = require("../config/cloudinary");

const Blog = require("../model/Blog");
const response = require("../utils/responceHandler");

/* ===================== CREATE BLOG ===================== */

const createBlog = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      title,
      slug,
      metaTitle,
      metaDescription,
      keywords,
      segment1Heading,
      segment1Text,
      segment2Heading,
      segment2Text,
      segment3Heading,
      segment3Text,
    } = req.body;

    const uploadedMedia = [];

    if (req.files?.length) {
      if (req.files.length > 3) {
        return res.status(400).json({
          success: false,
          message: "Maximum 3 files allowed",
        });
      }

      for (const file of req.files) {
        const result = await uploadFileToCloudinary(file);

        uploadedMedia.push({
          url: result.secure_url,
          publicId: result.public_id,
          type: file.mimetype.startsWith("video") ? "video" : "image",
        });
      }
    }

    const blog = await Blog.create({
      user: userId,
      title,
      slug,
      metaTitle,
      metaDescription,
      keywords,
      segment1Heading,
      segment1Text,
      segment2Heading,
      segment2Text,
      segment3Heading,
      segment3Text,
      uploadedMedia,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    console.error("Error creating Blog:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Blog",
      error: error.message,
    });
  }
};

/* ===================== GET ALL BLOGS (LIGHTWEIGHT FOR SSG LISTING) ===================== */

const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find()
      .select("title slug uploadedMedia createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Send only first image as thumbnail
    const lightweightBlogs = blogs.map((blog) => ({
      _id: blog._id,
      title: blog.title,
      slug: blog.slug,
      createdAt: blog.createdAt,
      uploadedMedia: blog.uploadedMedia?.length ? [blog.uploadedMedia[0]] : [],
    }));

    return response(res, 200, "Got Blogs successfully", lightweightBlogs);
  } catch (error) {
    console.error("Error getting Blogs:", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

/* ===================== GET SINGLE BLOG (FULL CONTENT FOR SSG PAGE) ===================== */

const getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug }).lean();

    if (!blog) {
      return response(res, 404, "Blog not found");
    }

    return response(res, 200, "Blog fetched successfully", blog);
  } catch (error) {
    console.error("Error getting single blog:", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

/* ===================== DELETE BLOG ===================== */

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found or not authorized",
      });
    }

    if (Array.isArray(blog.uploadedMedia) && blog.uploadedMedia.length > 0) {
      try {
        await deleteMultipleFromCloudinary(blog.uploadedMedia);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await blog.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Blog in controller:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete Blog",
      error: error.message,
    });
  }
};

/* ===================== UPDATE BLOG ===================== */

const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return response(res, 404, "Blog not found");
    }

    if (blog.user.toString() !== req.user.userId) {
      return response(res, 403, "You do not own this Blog");
    }

    blog.segment1Heading = req.body.segment1Heading || blog.segment1Heading;
    blog.segment1Text = req.body.segment1Text || blog.segment1Text;
    blog.segment2Heading = req.body.segment2Heading || blog.segment2Heading;
    blog.segment2Text = req.body.segment2Text || blog.segment2Text;
    blog.segment3Heading = req.body.segment3Heading || blog.segment3Text;
    blog.segment3Text = req.body.segment3Text || blog.segment3Text;

    await blog.save();

    return response(res, 200, "Blog updated", blog);
  } catch (error) {
    console.error("Error updating blog in controller:", error);
    return response(res, 500, "Something went wrong in controller");
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  getSingleBlog,
  deleteBlog,
  updateBlog,
};
