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

    // Process files with batch size limit to avoid memory issues
    const BATCH_SIZE = 10;
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
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const fileStr = `data:${file.type};base64,${buffer.toString('base64')}`;

          const result = await cloudinary.uploader.upload(fileStr, {
            folder: 'wedding-photos',
            // Add image optimization
            transformation: [
              { quality: 'auto', fetch_format: 'auto' },
              { width: 1920, height: 1080, crop: 'limit' }
            ]
          });
          
          console.log(`✅ Upload successful ${fileIndex + 1}/${files.length}: ${file.name} -> ${result.secure_url}`);
          return result;
        } catch (fileError) {
          console.error(`❌ Upload failed for file ${fileIndex + 1}/${files.length} (${file.name}):`, fileError);
          throw new Error(`Failed to upload ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      });

      const batchResults = await Promise.all(uploadPromises);
      allResults.push(...batchResults);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} completed in ${batchTime}ms`);
      
      // Add a small delay between batches to avoid overwhelming Cloudinary
      if (i + BATCH_SIZE < files.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
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