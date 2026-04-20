import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Convert uploaded image to a compressed base64 data URL.
 * Uses sharp to resize (max 1200px) and compress (quality 80)
 * to keep the base64 string reasonably small.
 * This avoids filesystem storage (Vercel is read-only).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB raw)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image must be less than 10MB' },
        { status: 400 },
      );
    }

    // Process with sharp: resize + compress
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const processed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = processed.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 },
    );
  }
}
