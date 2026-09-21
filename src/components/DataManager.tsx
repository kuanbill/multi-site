import { useState, useEffect } from 'react';
import { DataCollection, DataRecord, FieldDefinition, Site } from '../types';
import {
  getCollectionsBySite, getRecordsByCollection, getSites,
  saveCollection, deleteCollection, saveRecord, deleteRecord, generateId
} from '../database';
import { Plus, Edit2, Trash2, X, Check, Database, FolderOpen, Table, ChevronRight } from 'lucide-react';

interface DataManagerProps {
  selectedSiteId: string;
}

const FIELD_TYPES: FieldDefinition['type'][] = ['text', 'number', 'date', 'boolean', 'select', 'textarea'];

export default function DataManager({ selectedSiteId }: DataManagerProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState(selectedSiteId || '');
  const [collections, setCollections] = useState<DataCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<DataCollection | null>(null);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<DataCollection | null>(null);
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null);
  const [collectionForm, setCollectionForm] = useState({ name: '', description: '', fields: [] as FieldDefinition[] });
  const [recordForm, setRecordForm] = useState<Record<string, any>>({});

  useEffect(() => {
    const init = async () => {
      const allSites = await getSites();
      setSites(allSites);
      const siteId = selectedSiteId || allSites[0]?.id || '';
      setActiveSiteId(siteId);
      if (siteId) {
        const cols = await getCollectionsBySite(siteId);
        setCollections(cols);
      }
    };
    init();
  }, [selectedSiteId]);

  const handleSiteChange = async (siteId: string) => {
    setActiveSiteId(siteId);
    const cols = await getCollectionsBySite(siteId);
    setCollections(cols);
    setSelectedCollection(null);
    setRecords([]);
  };

  const selectCollection = async (col: DataCollection) => {
    setSelectedCollection(col);
    const recs = await getRecordsByCollection(col.id);
    setRecords(recs);
  };

  const openCreateCollection = () => {
    setEditingCollection(null);
    setCollectionForm({ name: '', description: '', fields: [] });
    setShowCollectionForm(true);
  };

  const openEditCollection = (col: DataCollection) => {
    setEditingCollection(col);
    setCollectionForm({ name: col.name, description: col.description, fields: [...col.fields] });
    setShowCollectionForm(true);
  };

  const handleSaveCollection = async () => {
    if (!collectionForm.name) return;
    const col: DataCollection = {
      id: editingCollection?.id || generateId('col'),
      siteId: activeSiteId,
      name: collectionForm.name,
      description: collectionForm.description,
      fields: collectionForm.fields,
      createdAt: editingCollection?.createdAt || new Date().toISOString(),
    };
    await saveCollection(col);
    const cols = await getCollectionsBySite(activeSiteId);
    setCollections(cols);
    setShowCollectionForm(false);
  };

  const handleDeleteCollection = async (id: string) => {
    if (confirm('確定要刪除此資料集合嗎？所有相關資料也會被刪除。')) {
      await deleteCollection(id);
      const cols = await getCollectionsBySite(activeSiteId);
      setCollections(cols);
      if (selectedCollection?.id === id) {
        setSelectedCollection(null);
        setRecords([]);
      }
    }
  };

  const addField = () => {
    setCollectionForm(prev => ({
      ...prev,
      fields: [...prev.fields, { name: '', type: 'text', label: '', required: false }],
    }));
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    setCollectionForm(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? { ...f, ...updates } : f),
    }));
  };

  const removeField = (index: number) => {
    setCollectionForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const openCreateRecord = () => {
    if (!selectedCollection) return;
    setEditingRecord(null);
    const initial: Record<string, any> = {};
    selectedCollection.fields.forEach(f => {
      initial[f.name] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : '';
    });
    setRecordForm(initial);
    setShowRecordForm(true);
  };

  const openEditRecord = (record: DataRecord) => {
    setEditingRecord(record);
    setRecordForm({ ...record.data });
    setShowRecordForm(true);
  };

  const handleSaveRecord = async () => {
    if (!selectedCollection) return;
    const record: DataRecord = {
      id: editingRecord?.id || generateId('rec'),
      siteId: activeSiteId,
      collection: selectedCollection.id,
      ['data']: recordForm,
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveRecord(record);
    const recs = await getRecordsByCollection(selectedCollection.id);
    setRecords(recs);
    setShowRecordForm(false);
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('確定要刪除此筆資料嗎？')) {
      await deleteRecord(id);
      if (selectedCollection) {
        const recs = await getRecordsByCollection(selectedCollection.id);
        setRecords(recs);
      }
    }
  };

  if (!activeSiteId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>請先選擇一個子網站來管理資料</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">資料管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理 <span className="font-medium text-blue-600">{sites.find(s => s.id === activeSiteId)?.name}</span> 的資料集合與記錄
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={activeSiteId} onChange={e => handleSiteChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          <button onClick={openCreateCollection} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> 新增集合
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">資料集合</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {collections.map(col => (
              <div key={col.id}
                className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                  selectedCollection?.id === col.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'hover:bg-gray-50'
                }`}
                onClick={() => selectCollection(col)}>
                <div className="flex items-center gap-3">
                  <Table className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{col.name}</p>
                    <p className="text-xs text-gray-500">{col.fields.length} 欄位</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); openEditCollection(col); }} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }} className="p-1 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
          {collections.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm"><p>尚無資料集合</p></div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {selectedCollection ? (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-700">{selectedCollection.name}</h3>
                  <span className="text-xs text-gray-500">({records.length} 筆)</span>
                </div>
                <button onClick={openCreateRecord} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  <Plus className="w-3.5 h-3.5" /> 新增資料
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {selectedCollection.fields.map(f => (
                        <th key={f.name} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{f.label}</th>
                      ))}
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        {selectedCollection.fields.map(f => (
                          <td key={f.name} className="px-4 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                            {f.type === 'boolean' ? (record.data[f.name] ? '✅' : '❌') : String(record.data[f.name] ?? '')}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => openEditRecord(record)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRecord(record.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {records.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm"><p>此集合尚無資料</p></div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>請選擇一個資料集合來查看記錄</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCollectionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingCollection ? '編輯資料集合' : '新增資料集合'}</h3>
              <button onClick={() => setShowCollectionForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">集合名稱 *</label>
                <input type="text" value={collectionForm.name} onChange={e => setCollectionForm({ ...collectionForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input type="text" value={collectionForm.description} onChange={e => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">欄位定義</label>
                  <button onClick={addField} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> 新增欄位
                  </button>
                </div>
                <div className="space-y-3">
                  {collectionForm.fields.map((field, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input type="text" value={field.name} placeholder="欄位名稱(英文)"
                          onChange={e => updateField(index, { name: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input type="text" value={field.label} placeholder="顯示名稱"
                          onChange={e => updateField(index, { label: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <select value={field.type} onChange={e => updateField(index, { type: e.target.value as FieldDefinition['type'] })}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-sm">
                          <input type="checkbox" checked={field.required} onChange={e => updateField(index, { required: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600" />
                          必填
                        </label>
                      </div>
                      <button onClick={() => removeField(index)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowCollectionForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSaveCollection} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Check className="w-4 h-4" /> 儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {showRecordForm && selectedCollection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{editingRecord ? '編輯資料' : '新增資料'}</h3>
              <button onClick={() => setShowRecordForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedCollection.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'text' && (
                    <input type="text" value={recordForm[field.name] || ''} onChange={e => setRecordForm({ ...recordForm, [field.name]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {field.type === 'textarea' && (
                    <textarea value={recordForm[field.name] || ''} onChange={e => setRecordForm({ ...recordForm, [field.name]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                  )}
                  {field.type === 'number' && (
                    <input type="number" value={recordForm[field.name] || 0} onChange={e => setRecordForm({ ...recordForm, [field.name]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {field.type === 'date' && (
                    <input type="date" value={recordForm[field.name] || ''} onChange={e => setRecordForm({ ...recordForm, [field.name]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                  {field.type === 'boolean' && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={recordForm[field.name] || false} onChange={e => setRecordForm({ ...recordForm, [field.name]: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600">是</span>
                    </label>
                  )}
                  {field.type === 'select' && (
                    <select value={recordForm[field.name] || ''} onChange={e => setRecordForm({ ...recordForm, [field.name]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">請選擇</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowRecordForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSaveRecord} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Check className="w-4 h-4" /> 儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
