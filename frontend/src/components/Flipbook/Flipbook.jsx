import React from 'react';
import HTMLFlipBook from 'react-pageflip';
import styles from './Flipbook.module.css';

const Page = React.forwardRef(({ memory }, ref) => {
  if (!memory) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  return (
    <div className={styles.page} ref={ref}>
      <div className={styles.pageContent}>
        <div className={styles.header}>
          <h3>{memory.title}</h3>
          <span className={styles.author}>by {memory.participants?.[0]?.studentId?.firstName || 'Anonymous'}</span>
        </div>
        
        <div className={styles.collageGrid}>
          {memory.images?.slice(0, 4).map((img, i) => (
            <div key={i} className={`${styles.imageWrapper} ${styles[`img${i}`]}`}>
              <img src={img.url} alt={`Memory ${i}`} />
            </div>
          ))}
        </div>

        <p className={styles.caption}>{memory.content}</p>
        
        <div className={styles.footer}>
          <span>{formatDate(memory.created_at)}</span>
        </div>
      </div>
    </div>
  );
});

const Flipbook = ({ yearbook }) => {
  return (
    <div className={styles.flipbookContainer}>
      <HTMLFlipBook 
        width={500} 
        height={700}
        size="stretch"
        minWidth={315}
        maxWidth={1000}
        minHeight={400}
        maxHeight={1533}
        maxShadowOpacity={0.5}
        showCover={true}
        mobileScrollSupport={true}
        className={styles.flipBook}
      >
        {/* Cover Page */}
        <div className={styles.coverPage}>
          <div className={styles.coverContent}>
            <h1>{yearbook.title}</h1>
            <p>{yearbook.description}</p>
            {yearbook.coverImageUrl && (
              <img src={yearbook.coverImageUrl} alt="Cover" className={styles.coverImg} />
            )}
            <div className={styles.coverFooter}>
              <span>A Digital Yearbook Production</span>
            </div>
          </div>
        </div>

        {/* Dynamic Pages */}
        {yearbook.pages.map((page, index) => (
          <Page key={index} memory={page.memoryId} />
        ))}

        {/* Back Cover */}
        <div className={styles.backCover}>
          <div className={styles.backContent}>
            <h2>THE END</h2>
            <p>Memories captured forever.</p>
          </div>
        </div>
      </HTMLFlipBook>
    </div>
  );
};

export default Flipbook;
