import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';

export async function POST(request: Request) {
  const uploadStartTime = Date.now();
  console.log(`🚀 Upload request started at ${new Date().toISOString()}`);
  
  try {
    console.log('📄 Parsing form data...');
    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    
    console.log(`📊 Files received: ${files.length}`);
    
    if (!files || files.length === 0) {
      console.log('❌ No files provided in request');
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Log file details
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    console.log(`📏 Total file size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📁 File details:`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB - ${file.type}`);
    });

    // Process files with smaller batch size to avoid memory issues and API limits
    const BATCH_SIZE = 5; // Reduced from 10 to 5 for better stability
    const allResults = [];
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)} (${batch.length} files)`);
      
      const batchStartTime = Date.now();
      
      // Upload current batch in parallel
      const uploadPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;
        console.log(`⬆️  Starting upload ${fileIndex + 1}/${files.length}: ${file.name}`);
        
        try {
          // Validate file before processing
          if (!file.type.startsWith('image/')) {
            throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`);
          }
          
          if (file.size > 50 * 1024 * 1024) { // 50MB limit
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 50MB.`);
          }
          
          // Sanitize filename to avoid special characters that might cause issues
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          console.log(`📝 Sanitized filename: ${file.name} -> ${sanitizedName}`);
          
          const bytes = await file.arrayBuffer();
          console.log(`📊 File ${fileIndex + 1} array buffer size: ${bytes.byteLength} bytes`);
          
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
          
          console.log(`✅ Upload successful ${fileIndex + 1}/${files.length}: ${file.name} -> ${result.secure_url}`);
          return result;
        } catch (fileError) {
          console.error(`❌ Upload failed for file ${fileIndex + 1}/${files.length} (${file.name}):`, fileError);
          
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
      });

      const batchResults = await Promise.all(uploadPromises);
      allResults.push(...batchResults);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed in ${batchTime}ms`);
      
      // Add a longer delay between batches to avoid overwhelming Cloudinary
      if (i + BATCH_SIZE < files.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const totalTime = Date.now() - uploadStartTime;
    console.log(`🎉 All uploads completed successfully in ${totalTime}ms`);
    console.log(`📈 Upload speed: ${(files.length / (totalTime / 1000)).toFixed(2)} files/second`);
    
    return NextResponse.json({ 
      success: true,
      urls: allResults.map(result => result.secure_url),
      metadata: {
        totalFiles: files.length,
        totalSizeMB: parseFloat((totalSize / 1024 / 1024).toFixed(2)),
        processingTimeMs: totalTime
      }
    });
    
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