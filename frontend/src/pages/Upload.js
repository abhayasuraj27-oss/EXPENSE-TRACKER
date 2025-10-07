import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';

const Upload = () => {
  const { uploadFile, dispatch, addUploadItems, updateUploadItem, uploads } = useExpense();
  const [isUploading, setIsUploading] = useState(false);

  const onChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const startIndex = uploads.length;
    const next = Array.from(files).map((f) => ({ name: f.name, status: 'pending' }));
    addUploadItems(next);
    setIsUploading(true);

    try {
      const uploadedResults = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const idx = startIndex + i;
        updateUploadItem(idx, { status: 'uploading' });
        try {
          const data = await uploadFile(file);
          uploadedResults.push(data);
          updateUploadItem(idx, { status: 'success' });
        } catch (err) {
          updateUploadItem(idx, { status: 'error', error: err?.message || 'Upload failed' });
        }
      }

      // Collect extracted transactions and stage them for selection (do not persist yet)
      const extracted = uploadedResults
        .flatMap(r => (Array.isArray(r?.transactions) ? r.transactions : []));
      if (extracted.length > 0) {
        dispatch({ type: 'SET_TRANSACTIONS', payload: extracted });
      }
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Upload Receipts</h2>
      <p className="mt-2 text-gray-700 dark:text-gray-300">Upload receipt images or PDFs to extract transactions.</p>
      <div className="mt-6">
        <label className="block">
          <div className="card card-hover flex cursor-pointer items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-blue-600 dark:text-blue-400"><path d="M12 16a1 1 0 0 1-1-1V8.41l-2.3 2.3a1 1 0 1 1-1.4-1.42l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 1 1-1.4 1.42L13 8.4V15a1 1 0 0 1-1 1Z"/><path d="M5 20a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h2a1 1 0 1 1 0 2H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1a1 1 0 1 1 2 0v1a3 3 0 0 1-3 3H5Z"/></svg>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Click to upload or drag and drop</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">PNG, JPG, PDF up to 10MB each</div>
            </div>
          </div>
          <input className="sr-only" type="file" accept="image/*,application/pdf" multiple onChange={onChange} />
        </label>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">You can select multiple files.</div>
        {uploads.length > 0 && (
          <div className="mt-4 card">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Upload Status</h3>
            <ul className="mt-2 space-y-2">
              {uploads.map((it, i) => (
                <li key={`${it.name}-${i}-${it.status}`} className="flex items-center justify-between text-sm">
                  <span className="truncate text-gray-800 dark:text-gray-200">{it.name}</span>
                  <span className="ml-3">
                    {it.status === 'pending' && <span className="text-gray-500">Pending</span>}
                    {it.status === 'uploading' && (
                      <span className="inline-flex items-center text-blue-600">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                        Uploading
                      </span>
                    )}
                    {it.status === 'success' && (
                      <span className="inline-flex items-center text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Parsed
                      </span>
                    )}
                    {it.status === 'error' && (
                      <span className="inline-flex items-center text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm0-6a1 1 0 112 0v4a1 1 0 11-2 0V7z" clipRule="evenodd" /></svg>
                        Failed
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {isUploading && <div className="mt-3 text-xs text-gray-500">Parsing receipts...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;


