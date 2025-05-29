'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Great_Vibes } from 'next/font/google';

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
});

export default function PhotoUpload() {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append('file', file);
    });

    fetch('/api/upload', {
      method: 'POST',
      body: formData,
    }).then((res) => {
      if (res.ok) {
        alert('Photo uploaded successfully!');
      } else {
        alert('Upload failed.');
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center space-y-8">
        <h1 className={`${greatVibes.className} text-4xl text-pink-700`}>
          Choose your photo, be part of our memory
        </h1>

        <div
          {...getRootProps()}
          className="border-4 border-dashed border-gray-300 rounded-2xl p-10 hover:border-pink-400 transition-all duration-300 cursor-pointer bg-gray-100"
        >
          <input {...getInputProps()} />
        
          {isDragActive ? (
            <p className="text-pink-500 font-medium text-lg">Drop your photo here...</p>
          ) : (
            <p className="text-lg text-gray-600 italic font-light">
              Drag & drop or <span className="underline text-pink-500 hover:text-pink-600 transition">click</span> to upload a photo
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
