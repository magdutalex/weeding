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
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

export default function PhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Compress images first
      setUploadProgress(10);
      const compressedFiles = await Promise.all(
        acceptedFiles.map(file => compressImage(file))
      );
      
      setUploadProgress(30);

      // Create single FormData with all files
      const formData = new FormData();
      compressedFiles.forEach((file) => {
        formData.append('file', file);
      });

      setUploadProgress(50);

      // Single API call for all files
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);
      
      const data = await response.json();
      
      if (data.urls) {
        setUploadedImageUrls(prev => [...prev, ...data.urls]);
        alert('Fotografiile au fost încărcate cu succes!');
      } else {
        alert('Încărcarea a eșuat.');
      }
      
      setUploadProgress(100);
    } catch (error) {
      console.error('Error:', error);
      alert('A apărut o eroare la încărcare.');
    } finally {
      setUploading(false);
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
              <div className="text-pink-500 font-medium text-lg space-y-2">
                <div>Se încarcă... {uploadProgress}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
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