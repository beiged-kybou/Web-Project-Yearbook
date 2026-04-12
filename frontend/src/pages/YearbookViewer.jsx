import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Flipbook from '../components/Flipbook/Flipbook';

const YearbookViewer = () => {
  const { id } = useParams();
  const [yearbook, setYearbook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYearbook = async () => {
      try {
        const { data } = await axios.get(`/api/digital-yearbooks/${id}`);
        setYearbook(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchYearbook();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!yearbook) return <div>Yearbook not found or you don't have access.</div>;

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Flipbook yearbook={yearbook} />
    </div>
  );
};

export default YearbookViewer;
