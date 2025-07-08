import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Upload all files in parallel
    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileStr = `data:${file.type};base64,${buffer.toString('base64')}`;

      return cloudinary.uploader.upload(fileStr, {
        folder: 'wedding-photos',
        // Add image optimization
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1920, height: 1080, crop: 'limit' }
        ]
      });
    });

    const results = await Promise.all(uploadPromises);
    
    return NextResponse.json({ 
      success: true,
      urls: results.map(result => result.secure_url)
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
} 