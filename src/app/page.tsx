'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Great_Vibes } from 'next/font/google';
import Image from 'next/image';

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
});

// Helper function to compress images
const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const compressionStartTime = Date.now();
    console.log(`🗜️  Starting compression for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    
    img.onload = () => {
      try {
        console.log(`📐 Original dimensions: ${img.width}x${img.height}`);
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        console.log(`📐 Compressed dimensions: ${canvas.width}x${canvas.height} (ratio: ${ratio.toFixed(3)})`);
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            const compressionTime = Date.now() - compressionStartTime;
            const compressionRatio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
            console.log(`✅ Compression completed for ${file.name} in ${compressionTime}ms: ${(file.size / 1024 / 1024).toFixed(2)} MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)`);
            
            resolve(compressedFile);
          } else {
            console.warn(`⚠️  Canvas.toBlob failed for ${file.name}, using original file`);
            resolve(file);
          }
        }, 'image/jpeg', quality);
      } catch (error) {
        console.error(`❌ Compression error for ${file.name}:`, error);
        console.warn(`🔄 Falling back to original file for ${file.name}`);
        resolve(file);
      }
    };
    
    img.onerror = (error) => {
      console.error(`❌ Image load error for ${file.name}:`, error);
      console.warn(`🔄 Falling back to original file for ${file.name}`);
      resolve(file);
    };
    
    // Add timeout for image loading
    setTimeout(() => {
      console.warn(`⏰ Compression timeout for ${file.name}, using original file`);
      resolve(file);
    }, 30000); // 30 second timeout
    
    img.src = URL.createObjectURL(file);
  });
};

export default function PhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [totalFiles, setTotalFiles] = useState(0);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  const uploadSingleFile = async (file: File, fileIndex: number, totalFiles: number): Promise<string> => {
    console.log(`📤 Starting upload for file ${fileIndex + 1}/${totalFiles}: ${file.name}`);
    
    // Compress the image first
    const compressedFile = await compressImage(file);
    
    // Create FormData for single file
    const formData = new FormData();
    formData.append('file', compressedFile);
    
    // Upload the file
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    
    if (!data.url) {
      throw new Error('Server response missing URL');
    }
    
    console.log(`✅ Upload completed for ${file.name}: ${data.url}`);
    return data.url;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadStartTime = Date.now();
    console.log(`🚀 Frontend upload started at ${new Date().toISOString()}`);
    console.log(`📊 Files selected: ${acceptedFiles.length}`);
    
    // Validate files before processing
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of acceptedFiles) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name}: Invalid file type (${file.type})`);
        continue;
      }
      
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        continue;
      }
      
      // Check for empty files
      if (file.size === 0) {
        invalidFiles.push(`${file.name}: Empty file`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    // Report invalid files
    if (invalidFiles.length > 0) {
      console.warn(`⚠️  Found ${invalidFiles.length} invalid files:`);
      invalidFiles.forEach(error => console.warn(`  - ${error}`));
      
      if (validFiles.length === 0) {
        alert(`Toate fișierele sunt invalide:\n${invalidFiles.join('\n')}`);
        return;
      } else {
        const proceed = confirm(`${invalidFiles.length} fișiere sunt invalide și vor fi ignorate. Continui cu ${validFiles.length} fișiere valide?`);
        if (!proceed) return;
      }
    }
    
    // Log file details
    const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
    console.log(`📏 Total original file size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📁 Valid file details (${validFiles.length} files):`);
    validFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)} MB - ${file.type}`);
    });

    setUploading(true);
    setUploadProgress(0);
    setTotalFiles(validFiles.length);
    setCurrentFileIndex(0);
    
    const newUploadedUrls: string[] = [];

    try {
      // Upload files one by one
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setCurrentFileIndex(i + 1);
        setCurrentFileName(file.name);
        
        // Update progress based on current file
        const baseProgress = (i / validFiles.length) * 100;
        setUploadProgress(baseProgress);
        
        console.log(`📤 Uploading file ${i + 1}/${validFiles.length}: ${file.name}`);
        
        try {
          const url = await uploadSingleFile(file, i, validFiles.length);
          newUploadedUrls.push(url);
          
          // Update progress after successful upload
          const completedProgress = ((i + 1) / validFiles.length) * 100;
          setUploadProgress(completedProgress);
          
          console.log(`✅ Successfully uploaded ${i + 1}/${validFiles.length}: ${file.name}`);
          
        } catch (fileError) {
          console.error(`❌ Failed to upload ${file.name}:`, fileError);
          
          // Ask user if they want to continue with remaining files
          const continueUpload = confirm(
            `Încărcarea fișierului "${file.name}" a eșuat.\n\nEroare: ${fileError instanceof Error ? fileError.message : 'Eroare necunoscută'}\n\nVrei să continui cu fișierele rămase?`
          );
          
          if (!continueUpload) {
            break;
          }
        }
      }
      
      // Update the uploaded images list
      setUploadedImageUrls(prev => [...prev, ...newUploadedUrls]);
      
      const totalTime = Date.now() - uploadStartTime;
      console.log(`🎉 Upload process completed in ${totalTime}ms`);
      
      if (newUploadedUrls.length === validFiles.length) {
        alert(`Toate fotografiile au fost încărcate cu succes! ${newUploadedUrls.length} fișiere procesate în ${(totalTime / 1000).toFixed(1)} secunde.`);
      } else if (newUploadedUrls.length > 0) {
        alert(`Încărcare parțială: ${newUploadedUrls.length}/${validFiles.length} fotografii încărcate cu succes în ${(totalTime / 1000).toFixed(1)} secunde.`);
      } else {
        alert('Nicio fotografie nu a fost încărcată cu succes.');
      }
      
      setUploadProgress(100);
    } catch (error) {
      const totalTime = Date.now() - uploadStartTime;
      console.error(`💥 Upload process failed after ${totalTime}ms:`, error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      alert(`A apărut o eroare la încărcare: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`);
    } finally {
      setUploading(false);
      setCurrentFileName('');
      setCurrentFileIndex(0);
      setTotalFiles(0);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.heic']
    },
    multiple: true
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center space-y-8">
        <h1 className={`${greatVibes.className} text-4xl text-pink-700`}>
          Alege fotografiile tale, fii parte din amintirile noastre
        </h1>

        {uploadedImageUrls.length === 0 ? ( 
          <div
            {...getRootProps()}
            className={`border-4 border-dashed rounded-2xl p-10 transition-all duration-300 cursor-pointer bg-gray-100
              ${isDragActive ? 'border-pink-400 bg-pink-50' : 'border-gray-300 hover:border-pink-400'}`}
          >  
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="text-pink-500 font-medium text-lg space-y-3">
                <div>Se încarcă fotografia {currentFileIndex} din {totalFiles}</div>
                {currentFileName && (
                  <div className="text-sm text-gray-600 truncate max-w-full">
                    {currentFileName}
                  </div>
                )}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="text-sm">{Math.round(uploadProgress)}% completat</div>
              </div>
            ) : isDragActive ? (
              <p className="text-pink-500 font-medium text-lg">Plasează fotografiile aici...</p>
            ) : (
              <p className="text-lg text-gray-600 italic font-light">
                Trage și plasează sau <span className="underline text-pink-500 hover:text-pink-600 transition">click</span> pentru a încărca fotografii
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {uploadedImageUrls.map((url, index) => (
                <div key={index} className="relative w-full h-32">
                  <Image
                    src={url}
                    alt={`Fotografie încărcată ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setUploadedImageUrls([])}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
              >
                Șterge toate fotografiile
              </button>
              <button
                onClick={() => setUploadedImageUrls([])}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Încarcă mai multe fotografii
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
