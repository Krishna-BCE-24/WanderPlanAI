import { Router } from 'express';
import { searchPhotos } from '../integrations/unsplash/unsplash.service.js';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();

    if (!query || query.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'A valid photo search query is required',
      });
    }

    const photos = await searchPhotos(query);

    return res.json({
      success: true,
      photos,
    });
  } catch (error) {
    console.error('Photo search failed:', error.message);

    return res.status(502).json({
      success: false,
      message: 'Unable to fetch photos right now',
    });
  }
});

export default router;
