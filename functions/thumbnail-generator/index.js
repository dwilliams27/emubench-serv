const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');
const sharp = require('sharp');
const path = require('path');

const storage = new Storage();
const firestore = new Firestore();

const THUMBNAIL_SIZE = 150;
const THUMBNAIL_SUFFIX = '_t';

functions.cloudEvent('thumbnail-generator', async (cloudEvent) => {
  const file = cloudEvent.data;

  const fileBucket = file.bucket;
  const fileName = file.name;
  const contentType = file.contentType;

  if (!contentType || !contentType.startsWith('image/')) {
    console.log('Not an image, skipping:', fileName);
    return;
  }
  
  if (fileName.includes(THUMBNAIL_SUFFIX)) {
    console.log('Already a thumbnail, skipping:', fileName);
    return;
  }
  
  if (file.resourceState === 'not_exists') {
    console.log('File deleted, skipping:', fileName);
    return;
  }

  try {
    const fileExtension = path.extname(fileName);
    const fileNameWithoutExt = path.basename(fileName, fileExtension);
    
    const bucket = storage.bucket(fileBucket);
    const originalFile = bucket.file(fileName);
    const [buffer] = await originalFile.download();
    
    const thumbnailBuffer = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ 
        quality: 80,
        effort: 4
      })
      .toBuffer();
    
    const thumbnailFileName = `${fileName.substring(0, fileName.lastIndexOf("/"))}/${fileNameWithoutExt}${THUMBNAIL_SUFFIX}.webp`;
    const thumbnailFile = bucket.file(thumbnailFileName);
    await thumbnailFile.save(thumbnailBuffer, {
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=3600',
      }
    });

    // Write urls to firestore

    const [fullResolutionUrl] = await originalFile.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    const [thumbnailUrl] = await thumbnailFile.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    const docId = fileName.substring(0, fileName.indexOf('/'));
    const docRefBase = firestore.collection('TESTS').doc(docId);
    const docRefPublic = firestore.collection('TESTS_PUBLIC').doc(docId);

    await docRefBase.set({
      screenshots: {
        [`s-${fileNameWithoutExt}`]: {
          fullResolutionUrl,
          thumbnailUrl
        }
      }
    }, { merge: true });
    await docRefPublic.set({
      screenshots: {
        [`s-${fileNameWithoutExt}`]: {
          fullResolutionUrl,
          thumbnailUrl
        }
      }
    }, { merge: true });
    
    console.log(`Thumbnail generated successfully: ${thumbnailFileName}`);
    
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
});
