const cron = require("node-cron");
const Story = require("../model/story");
const { deleteMultipleFromCloudinary } = require("../config/cloudinary");

cron.schedule("0 * * * *", async () => {
  try {
    const expiryTime = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const expiredStories = await Story.find({
      createdAt: { $lt: expiryTime },
    });

    for (const story of expiredStories) {
      if (story.uploadedMedia?.length) {
        await deleteMultipleFromCloudinary(story.uploadedMedia);
      }
      await story.deleteOne();
    }
  } catch (error) {
    console.error("[CRON] Story cleanup failed:", error);
  }
});
