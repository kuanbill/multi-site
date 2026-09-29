'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface MediaItem {
  id: number;
  url: string;
  type: string;
  mimeType?: string | null;
  altText?: string | null;
  filename?: string | null;
}

interface MediaPickerProps {
  siteSlug: string;
  label?: string;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  multiple?: boolean;
  accept?: 'image' | 'pdf' | 'image,pdf' | 'all';
  maxItems?: number;
  hint?: string;
}

export default function MediaPicker({
  siteSlug,
  label,
  selectedIds,
  onSelectionChange,
  multiple = false,
  accept = 'image',
  maxItems,
  hint,
}: MediaPickerProps) {
  const router = useRouter();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const acceptedTypes = {
    image: 'image/*',
    pdf: 'application/pdf',
    'image,pdf': 'image/*,application/pdf',
    all: '*/*',
  }[accept];

  // 加載媒體列表
  useState(() => {
    async function loadMedia() {
      try {
        const res = await fetch(`/api/${siteSlug}/admin/assets`);
        if (res.ok) {
          const data = await res.json();
          setMediaList(Array.isArray(data) ? data : []);
        }
      } catch {
        // 靜默失敗
      }
    }
    loadMedia();
  });

  async function handleUpload() {
    if (!newFile) return;
    setUploadingFile(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('file', newFile);
      formData.set('altText', newFile.name);
      const res = await fetch(`/api/${siteSlug}/admin/assets`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '上傳失敗');
        return;
      }
      // 重新加載媒體列表
      const loadRes = await fetch(`/api/${siteSlug}/admin/assets`);
      const loadData = await loadRes.json();
      setMediaList(Array.isArray(loadData) ? loadData : []);
      // 自動選取新上傳的
      const newId = data.id as number;
      if (multiple) {
        onSelectionChange([...selectedIds, newId]);
      } else {
        onSelectionChange([newId]);
      }
      setShowModal(false);
      setNewFile(null);
    } catch (e) {
      setError('上傳發生錯誤');
    } finally {
      setUploadingFile(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setNewFile(file);
    setError(null);
  }

  const selectedSet = new Set(selectedIds);

  const filteredMedia = mediaList.filter((m) => {
    if (accept === 'image' && m.type !== 'image') return false;
    if (accept === 'pdf' && m.type !== 'pdf') return false;
    return true;
  });

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
          {!multiple && maxItems === 1 && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          bg-white border-dashed border-gray-400
          hover:border-blue-500 hover:text-blue-600
          ${selectedIds.length > 0 ? 'border-blue-500 bg-blue-50' : ''}
        `}
      >
        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-2">
            <Image
              src={filteredMedia.find((m) => m.id === selectedIds[0])?.url}
              alt=""
              width={24}
              height={24}
              className="rounded object-cover"
              unoptimized
            />
            <span className="truncate">已選擇 {selectedIds.length} 個檔案</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            選擇매체를 선택하거나 업로드
          </div>
        )}
      </button>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">媒體選擇</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* 上傳區域 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">上傳新檔案</label>
              <input
                type="file"
                accept={acceptedTypes}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {newFile && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{newFile.name} ({(newFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  {uploadingFile ? (
                    <span className="text-sm text-blue-600">上傳中...</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUpload}
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      上傳
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 媒體列表 */}
            <div className="flex-1 overflow-y-auto">
              {loading && mediaList.length === 0 ? (
                <p className="text-sm text-gray-500">加載中...</p>
              ) : filteredMedia.length === 0 ? (
                <p className="text-sm text-gray-500">尚無媒體，請上傳或啟用媒體管理功能</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredMedia.map((media) => {
                    const isSelected = selectedSet.has(media.id);
                    const isImage = media.type === 'image';
                    return (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => {
                          if (multiple) {
                            if (isSelected) {
                              onSelectionChange(selectedIds.filter((id) => id !== media.id));
                            } else if (maxItems && selectedIds.length >= maxItems) {
                              setError(`最多選擇 ${maxItems} 個`);
                            } else {
                              onSelectionChange([...selectedIds, media.id]);
                            }
                          } else {
                            onSelectionChange(isSelected ? [] : [media.id]);
                          }
                        }}
                        className={`
                          relative p-2 rounded-lg border-2 text-left
                          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                        `}
                      >
                        {isImage ? (
                          <Image
                            src={media.url}
                            alt={media.altText ?? ''}
                            width={120}
                            height={120}
                            className="rounded object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 bg-gray-100 rounded">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="text-xs text-gray-500 mt-1 truncate w-full">{media.filename ?? media.id}</span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {media.altText ?? media.filename ?? `ID:${media.id}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
