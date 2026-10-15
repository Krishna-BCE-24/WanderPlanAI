const UNSPLASH_API_URL = 'https://api.unsplash.com';

export const searchPhotos = async (query) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error('Unsplash API key is not configured');
  }

  const response = await fetch(
    `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  const data = await response.json();

  return data.results.map((photo) => ({
    id: photo.id,
    description: photo.alt_description || photo.description || query,
    imageUrl: photo.urls.regular,
    thumbnailUrl: photo.urls.small,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    photoUrl: photo.links.html,
  }));
};
