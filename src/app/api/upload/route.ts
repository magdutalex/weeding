import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';

export async function POST(request: Request) {
  const uploadStartTime = Date.now();
  console.log(`🚀 Upload request started at ${new Date().toISOString()}`);
  
  try {
    console.log('📄 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('❌ No file provided in request');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    console.log(`📊 File received: ${file.name}`);
    console.log(`📏 File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📄 File type: ${file.type}`);

    try {
      // Validate file before processing
      if (!file.type.startsWith('image/')) {
        throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`);
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 50MB.`);
      }
      
      if (file.size === 0) {
        throw new Error('Empty file provided');
      }
      
      // Sanitize filename to avoid special characters that might cause issues
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      console.log(`📝 Sanitized filename: ${file.name} -> ${sanitizedName}`);
      
      const bytes = await file.arrayBuffer();
      console.log(`📊 File array buffer size: ${bytes.byteLength} bytes`);
      
      const buffer = Buffer.from(bytes);
      
      // Validate buffer
      if (buffer.length === 0) {
        throw new Error('Empty file buffer');
      }
      
      // Create base64 string with validation
      let base64String;
      try {
        base64String = buffer.toString('base64');
        console.log(`📊 Base64 string length for ${file.name}: ${base64String.length} characters`);
        
        // Validate base64 string
        if (!base64String || base64String.length === 0) {
          throw new Error('Failed to create base64 string');
        }
        
        // Check for valid base64 pattern
        const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Pattern.test(base64String)) {
          throw new Error('Invalid base64 string pattern');
        }
        
      } catch (base64Error) {
        console.error(`❌ Base64 conversion error for ${file.name}:`, base64Error);
        throw new Error(`Base64 conversion failed: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`);
      }
      
      const fileStr = `data:${file.type};base64,${base64String}`;
      console.log(`📊 Final data URL length: ${fileStr.length} characters`);

      console.log(`⬆️  Starting Cloudinary upload for: ${file.name}`);
      const cloudinaryStartTime = Date.now();

      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'wedding-photos',
        public_id: sanitizedName.split('.')[0] + '_' + Date.now(), // Unique public_id
        // Add image optimization
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1920, height: 1080, crop: 'limit' }
        ],
        // Add upload options for better reliability
        resource_type: 'image',
        invalidate: true,
        overwrite: false
      });
      
      const cloudinaryTime = Date.now() - cloudinaryStartTime;
      console.log(`✅ Cloudinary upload successful in ${cloudinaryTime}ms: ${file.name} -> ${result.secure_url}`);
      
      const totalTime = Date.now() - uploadStartTime;
      console.log(`🎉 Upload completed successfully in ${totalTime}ms`);
      
      return NextResponse.json({ 
        success: true,
        url: result.secure_url,
        metadata: {
          fileName: file.name,
          fileSizeMB: parseFloat((file.size / 1024 / 1024).toFixed(2)),
          processingTimeMs: totalTime,
          cloudinaryTimeMs: cloudinaryTime
        }
      });
      
    } catch (fileError) {
      console.error(`❌ Upload failed for file ${file.name}:`, fileError);
      
      // Log specific error details for debugging
      if (fileError instanceof Error) {
        console.error(`Error details for ${file.name}:`, {
          name: fileError.name,
          message: fileError.message,
          stack: fileError.stack?.substring(0, 500) // Limit stack trace length
        });
      }
      
      throw new Error(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
    }
    
  } catch (error) {
    const totalTime = Date.now() - uploadStartTime;
    console.error(`💥 Upload failed after ${totalTime}ms:`, error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: totalTime
      },
      { status: 500 }
    );
  }
} 