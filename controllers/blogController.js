const {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} = require("../config/cloudinary");

const Blog = require("../model/Blog");
const response = require("../utils/responceHandler");
const slugify = require("slugify");

/* ===================== CREATE BLOG ===================== */

const createBlog = async (req, res) => {
  try {
    const userId = req.user.userId;

    let {
      title,
      metaTitle,
      metaDescription,
      keywords,
      excerpt,
      content,
      isPublished,
    } = req.body;

    if (!title || !content) {
      return response(res, 400, "Title and content are required");
    }

    if (!req.file) {
      return response(res, 400, "Featured image is required");
    }

    /* ---------- slug generation ---------- */

    let baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await Blog.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    /* ---------- upload image ---------- */

    const uploadResult = await uploadFileToCloudinary(req.file);

    /* ---------- create blog ---------- */

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

/* ===================== GET BLOG LIST ===================== */

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

/* ===================== GET SINGLE BLOG FOR PUBLIC ===================== */

const getSingleBlogBySlug = async (req, res) => {
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

/* ===================== GET SINGLE BLOG FOR ADMIN TO EDIT ===================== */

const getSingleBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ===================== DELETE BLOG ===================== */

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return response(res, 404, "Blog not found");
    }

    /* ---------- ownership check ---------- */

    if (blog.user.toString() !== req.user.userId) {
      return response(res, 403, "You are not allowed to delete this blog");
    }

    /* ---------- delete cloudinary image ---------- */

    if (blog.featuredImage?.publicId) {
      try {
        await deleteFileFromCloudinary({
          publicId: blog.featuredImage.publicId,
          type: "image",
        });
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

    /* ---------- ownership check ---------- */

    if (blog.user.toString() !== req.user.userId) {
      return response(res, 403, "You do not own this Blog");
    }

    let {
      title,
      metaTitle,
      metaDescription,
      keywords,
      excerpt,
      content,
      isPublished,
    } = req.body;

    /* ---------- regenerate slug if title changed ---------- */

    if (title && title !== blog.title) {
      let baseSlug = slugify(title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (
        await Blog.findOne({
          slug,
          _id: { $ne: blog._id },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      blog.slug = slug;
      blog.title = title;
    }

    /* ---------- update other fields ---------- */

    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription) blog.metaDescription = metaDescription;
    if (keywords) blog.keywords = keywords;
    if (excerpt) blog.excerpt = excerpt;
    if (content) blog.content = content;
    if (typeof isPublished !== "undefined") blog.isPublished = isPublished;

    /* ---------- replace image ---------- */

    if (req.file) {
      if (blog.featuredImage?.publicId) {
        try {
          await deleteFileFromCloudinary({
            publicId: blog.featuredImage.publicId,
            type: "image",
          });
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
  getSingleBlogById,
  getSingleBlogBySlug,
  deleteBlog,
  updateBlog,
};
