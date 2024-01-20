'use client';
import UploadIcon from "@/components/UploadIcon";
import axios from "axios";
import {useRouter} from "next/navigation";
import {useState} from "react";
import './component_styles.css'

export default function UploadForm() {

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const router = useRouter();

  async function upload(ev) {
    ev.preventDefault();
    const files = ev.target.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.size > 100 * 1024 * 1024) { // 100 MB in bytes
        setErrorMessage(
          "File size exceeds 100 MB. Please choose a smaller file or use a " +
          "<a href='https://www.freeconvert.com/video-compressor' target='_blank' rel='noopener noreferrer' class='error-link'>video compressor</a>."
        );
        return;
      }

      setIsUploading(true);
      setErrorMessage(null);
      const res = await axios.postForm('/api/upload', {
        file,
      });
      setIsUploading(false);
      const newName = res.data.newName;
      router.push('/'+newName);
    }
  }

  return (
    <>
      {errorMessage && (
        <div className="bg-red-500 w-auto py-2 animate-bounce text-white mb-4 rounded-lg border-yellow-900/40 font-medium px-2" dangerouslySetInnerHTML={{ __html: errorMessage }} />
      )}
      {isUploading && (
        <div className="bg-black/90 text-white fixed inset-0 flex items-center">
          <div className="w-full text-center">
            <h2 className="text-4xl mb-4">Uploading</h2>
            <h3 className="text-xl gap-1">Please wait...</h3>
          </div>
        </div>
      )}
      <label className="bg-green-600 py-2 px-6 rounded-full inline-flex gap-2 border-2 border-yellow-900/40 cursor-pointer">
        <UploadIcon />
        <span>Choose file</span>
        <input onChange={upload} type="file" className="hidden"/>
      </label>
    </>
  );
}