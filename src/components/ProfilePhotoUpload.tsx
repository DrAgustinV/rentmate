// ... imports
import { getCachedSignedUrl } from '@/lib/signedUrlCache';

// In useEffect:
useEffect(() => {
  const loadSignedUrl = async () => {
    if (currentPhotoPath) {
      try {
        const url = await getCachedSignedUrl(STORAGE_BUCKETS.PROFILE_PHOTOS, currentPhotoPath);
        setPreviewUrl(url);
      } catch {
        // ignore
      }
    } else {
      setPreviewUrl(null);
    }
  };
  
  loadSignedUrl();
}, [currentPhotoPath]); // Only re-runs when path actually changes
