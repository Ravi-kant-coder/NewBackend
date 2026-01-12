const fetchLatestVideos = async () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?key=${apiKey}` +
    `&channelId=${channelId}` +
    `&part=snippet` +
    `&order=date` +
    `&maxResults=50`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch YouTube videos");
  }

  const data = await response.json();

  return data.items
    .filter((item) => item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
    }));
};

module.exports = { fetchLatestVideos };
