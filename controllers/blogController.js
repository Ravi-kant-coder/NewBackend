const {
  uploadFileToCloudinary,
  deleteFromCloudinary,
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
      excerpt,
      content,
      isPublished,
    } = req.body;

    if (!req.file) {
      return response(res, 400, "Featured image is required");
    }

    const uploadResult = await uploadFileToCloudinary(req.file);

    const blog = await Blog.create({
      user: userId,
      title,
      slug,
      metaTitle,
      metaDescription,
      keywords,
      excerpt,
      content,
      isPublished,
      featuredImage: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });

    return response(res, 201, "Blog created successfully", blog);
  } catch (error) {
    console.error("Error creating Blog:", error);
    return response(res, 500, "Failed to create Blog", error.message);
  }
};

/* ===================== GET BLOG LIST (LIGHTWEIGHT FOR SSG & SIDEBAR) ===================== */

const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true })
      .select("title slug featuredImage excerpt createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return response(res, 200, "Blogs fetched successfully", blogs);
  } catch (error) {
    console.error("Error getting Blogs:", error);
    return response(res, 500, "Internal server error", error.message);
  }
};

/* ===================== GET SINGLE BLOG (FULL CONTENT FOR SSG PAGE) ===================== */

const getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      isPublished: true,
    }).lean();

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
      return response(res, 404, "Blog not found or not authorized");
    }

    if (blog.featuredImage?.publicId) {
      try {
        await deleteFromCloudinary(blog.featuredImage.publicId);
      } catch (err) {
        console.error("Cloudinary deletion failed:", err);
      }
    }

    await blog.deleteOne();

    return response(res, 200, "Blog deleted successfully");
  } catch (error) {
    console.error("Error deleting Blog:", error);
    return response(res, 500, "Failed to delete Blog", error.message);
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

    const {
      title,
      slug,
      metaTitle,
      metaDescription,
      keywords,
      excerpt,
      content,
      isPublished,
    } = req.body;

    // Update text fields
    if (title) blog.title = title;
    if (slug) blog.slug = slug;
    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription) blog.metaDescription = metaDescription;
    if (keywords) blog.keywords = keywords;
    if (excerpt) blog.excerpt = excerpt;
    if (content) blog.content = content;
    if (typeof isPublished !== "undefined") blog.isPublished = isPublished;

    // If new image uploaded → replace old one
    if (req.file) {
      if (blog.featuredImage?.publicId) {
        try {
          await deleteFromCloudinary(blog.featuredImage.publicId);
        } catch (err) {
          console.error("Old image deletion failed:", err);
        }
      }

      const uploadResult = await uploadFileToCloudinary(req.file);

      blog.featuredImage = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
    }

    await blog.save();

    return response(res, 200, "Blog updated successfully", blog);
  } catch (error) {
    console.error("Error updating blog:", error);
    return response(res, 500, "Something went wrong", error.message);
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  getSingleBlog,
  deleteBlog,
  updateBlog,
};
