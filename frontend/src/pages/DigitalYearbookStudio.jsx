import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './YearbookStudio.module.css';

const DigitalYearbookStudio = () => {
  const [filters, setFilters] = useState({
    privacyType: 'club',
    targetId: '',
    startDate: '',
    endDate: ''
  });
  const [memories, setMemories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/digital-yearbooks/studio/posts', { params: filters });
      setMemories(data);
      setSelectedIds(data.map(m => m._id)); // Default select all
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        title,
        description,
        coverImageUrl: coverUrl,
        privacyType: filters.privacyType,
        targetId: filters.targetId,
        memoryIds: selectedIds
      };
      const { data } = await axios.post('/api/digital-yearbooks', payload);
      alert('Yearbook Published Successfully!');
      window.location.href = `/yearbook/${data._id}`;
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className={styles.studioContainer}>
      <h1>Digital Yearbook Studio</h1>
      
      <section className={styles.configSection}>
        <div className={styles.row}>
          <input type="text" placeholder="Yearbook Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="text" placeholder="Cover Image URL" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
        </div>
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        
        <div className={styles.filterRow}>
          <select value={filters.privacyType} onChange={e => setFilters({...filters, privacyType: e.target.value})}>
            <option value="club">Club</option>
            <option value="department">Department</option>
            <option value="batch">Batch</option>
          </select>
          <input type="text" placeholder="Target ID (e.g. IUTCS)" value={filters.targetId} onChange={e => setFilters({...filters, targetId: e.target.value})} />
          <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
          <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
          <button onClick={fetchMemories} disabled={loading}>Load Posts</button>
        </div>
      </section>

      <div className={styles.memoriesGrid}>
        {memories.map(m => (
          <div 
            key={m._id} 
            className={`${styles.memoryCard} ${selectedIds.includes(m._id) ? styles.selected : ''}`}
            onClick={() => toggleSelection(m._id)}
          >
            <img src={m.images?.[0]?.url || 'https://via.placeholder.com/200'} alt={m.title} />
            <div className={styles.overlay}>
              <p>{m.title}</p>
              <span>{selectedIds.includes(m._id) ? 'Selected' : 'Discarded'}</span>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.publishBtn} onClick={handleCreate} disabled={!selectedIds.length || !title}>
        Publish Yearbook
      </button>
    </div>
  );
};

export default DigitalYearbookStudio;
