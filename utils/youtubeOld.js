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

  // Step 2: Fetch ALL videos from playlist with pagination
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

  return allVideos;
};

module.exports = { fetchLatestVideos };
