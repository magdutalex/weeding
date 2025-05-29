'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Great_Vibes } from 'next/font/google';
import Image from 'next/image';

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
});

export default function PhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append('file', file);
    });

    fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          setUploadedImageUrl(data.url);
          alert('Fotografia a fost încărcată cu succes!');
        } else {
          alert('Încărcarea a eșuat.');
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('A apărut o eroare la încărcare.');
      })
      .finally(() => {
        setUploading(false);
      });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.heic']
    },
    maxFiles: 1
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center space-y-8">
        <h1 className={`${greatVibes.className} text-4xl text-pink-700`}>
          Încarcă o fotografie pentru nunta noastră
        </h1>

        {!uploadedImageUrl ? (
          <div
            {...getRootProps()}
            className={`border-4 border-dashed rounded-2xl p-10 transition-all duration-300 cursor-pointer bg-gray-100
              ${isDragActive ? 'border-pink-400 bg-pink-50' : 'border-gray-300 hover:border-pink-400'}`}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="text-pink-500 font-medium text-lg">
                Se încarcă...
              </div>
            ) : isDragActive ? (
              <p className="text-pink-500 font-medium text-lg">Plasează fotografia aici...</p>
            ) : (
              <p className="text-lg text-gray-600 italic font-light">
                Trage și plasează sau <span className="underline text-pink-500 hover:text-pink-600 transition">click</span> pentru a încărca o fotografie
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full h-64">
              <Image
                src={uploadedImageUrl}
                alt="Fotografie încărcată"
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <button
              onClick={() => setUploadedImageUrl(null)}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              Încarcă altă fotografie
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
