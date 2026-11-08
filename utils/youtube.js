const fetchLatestVideos = async () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  // Step 1: Get uploads playlist ID
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
  );

  if (!channelRes.ok) {
    throw new Error("Failed to fetch channel details");
  }

  const channelData = await channelRes.json();
  const uploadsPlaylistId =
    channelData.items[0].contentDetails.relatedPlaylists.uploads;

  // Step 2: Fetch uploaded videos
  let allVideos = [];
  let nextPageToken = null;

  do {
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&pageToken=${nextPageToken || ""}&key=${apiKey}`,
    );

    if (!playlistRes.ok) {
      throw new Error("Failed to fetch playlist videos");
    }

    const playlistData = await playlistRes.json();

    const videos = playlistData.items.map((item) => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
    }));

    allVideos.push(...videos);
    nextPageToken = playlistData.nextPageToken;
  } while (nextPageToken);

  // Step 3: Fetch video durations in batches of 50
  const videosWithDuration = [];

  for (let i = 0; i < allVideos.length; i += 50) {
    const batch = allVideos.slice(i, i + 50);
    const ids = batch.map((v) => v.videoId).join(",");

    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${apiKey}`,
    );

    if (!detailsRes.ok) {
      throw new Error("Failed to fetch video durations");
    }

    const detailsData = await detailsRes.json();

    const durationMap = new Map(
      detailsData.items.map((item) => [item.id, item.contentDetails.duration]),
    );

    for (const video of batch) {
      const duration = durationMap.get(video.videoId);

      if (!duration) continue;

      // Convert ISO 8601 duration into seconds
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

      const seconds =
        Number(match?.[1] || 0) * 3600 +
        Number(match?.[2] || 0) * 60 +
        Number(match?.[3] || 0);

      videosWithDuration.push({
        ...video,
        isShort: seconds < 180,
      });
    }
  }

  return videosWithDuration;
};

module.exports = { fetchLatestVideos };
