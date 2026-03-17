import { useCallback, useMemo, useRef, useState } from 'react';

const reorderList = (list, sourceId, targetId, position) => {
  if (!sourceId || sourceId === targetId) {
    return list;
  }
  const next = [...list];
  const fromIndex = next.findIndex((item) => item.queueId === sourceId);
  const toIndex = next.findIndex((item) => item.queueId === targetId);
  if (fromIndex === -1) {
    return list;
  }
  const [moved] = next.splice(fromIndex, 1);
  if (toIndex === -1) {
    next.push(moved);
    return next;
  }
  const insertIndex = position === 'after' ? toIndex + 1 : toIndex;
  next.splice(insertIndex, 0, moved);
  return next;
};

const ImageTray = ({
  images = [],
  maxSlots = 10,
  onRemove,
  onOrderChange,
  onDragReorder,
  renderMeta,
}) => {
  const [draggingId, setDraggingId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  const dragOverIdRef = useRef(null);

  const handleDragStart = useCallback((event, queueId) => {
    if (!queueId) return;
    setDraggingId(queueId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', queueId);
  }, []);

  const updateDropIndicator = useCallback((targetId, offsetX, width) => {
    if (!draggingId || !targetId || draggingId === targetId) {
      setDropIndicator(null);
      return;
    }
    const halfway = width / 2;
    const position = offsetX < halfway ? 'before' : 'after';
    setDropIndicator({ targetId, position });
  }, [draggingId]);

  const handleDragOver = useCallback((event, targetId) => {
    event.preventDefault();
    if (!draggingId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    updateDropIndicator(targetId, offsetX, bounds.width);
    dragOverIdRef.current = targetId;
  }, [draggingId, updateDropIndicator]);

  const handleDrop = useCallback((event, targetId) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain');
    if (!sourceId) {
      setDraggingId(null);
      setDropIndicator(null);
      return;
    }
    const target = dropIndicator?.targetId || targetId;
    const position = dropIndicator?.position || 'after';
    setDraggingId(null);
    setDropIndicator(null);
    if (onDragReorder) {
      onDragReorder(sourceId, target, position);
    } else if (onOrderChange) {
      const next = reorderList(images, sourceId, target, position);
      onOrderChange(next);
    }
  }, [dropIndicator, images, onDragReorder, onOrderChange]);

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropIndicator(null);
  };

  const handleKeyDown = useCallback((event, queueId) => {
    if (!queueId) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onRemove?.(queueId);
      return;
    }
    if (!draggingId && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const currentIndex = images.findIndex((item) => item.queueId === queueId);
      if (currentIndex === -1) return;
      const targetIndex = event.key === 'ArrowLeft' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= images.length) {
        return;
      }
      const targetId = images[targetIndex].queueId;
      const position = event.key === 'ArrowLeft' ? 'before' : 'after';
      if (onDragReorder) {
        onDragReorder(queueId, targetId, position);
      } else if (onOrderChange) {
        const next = reorderList(images, queueId, targetId, position);
        onOrderChange(next);
      }
    }
  }, [draggingId, images, onDragReorder, onOrderChange, onRemove]);

  const slotsFilled = images.length;
  const emptySlots = Math.max(maxSlots - slotsFilled, 0);

  const metaText = useMemo(() => {
    if (slotsFilled === 0) {
      return 'No images yet';
    }
    if (slotsFilled === maxSlots) {
      return 'Tray is full';
    }
    return `${slotsFilled}/${maxSlots} images staged`;
  }, [maxSlots, slotsFilled]);

  return (
    <section className="image-tray">
      <header className="image-tray__header">
        <div>
          <h4>Image Tray</h4>
          <span className="image-tray__count">{metaText}</span>
        </div>
        <span className="image-tray__hint">Drag cards to reorder, remove unwanted shots.</span>
      </header>

      <div className="image-tray__grid">
        {images.map((item, index) => (
          <article
            key={item.queueId}
            className={`tray-card ${draggingId === item.queueId ? 'tray-card--dragging' : ''}`}
            draggable
            onDragStart={(event) => handleDragStart(event, item.queueId)}
            onDragOver={(event) => handleDragOver(event, item.queueId)}
            onDrop={(event) => handleDrop(event, item.queueId)}
            onDragEnd={handleDragEnd}
            tabIndex={0}
            onKeyDown={(event) => handleKeyDown(event, item.queueId)}
            aria-label={`Image ${index + 1} of ${slotsFilled}`}
            aria-grabbed={draggingId === item.queueId}
          >
            <div className="tray-card__thumb">
              {item.preview || item.url ? (
                <img src={item.preview || item.url} alt="Preview" />
              ) : (
                <div className="tray-card__placeholder">IMG</div>
              )}
            </div>
            <div className="tray-card__body">
              <div className="tray-card__meta">{renderMeta ? renderMeta(item) : null}</div>
              {item.name && <div className="tray-card__name" title={item.name}>{item.name}</div>}
              {item.url && (
                <div className="tray-card__name" title={item.url}>
                  {item.url}
                </div>
              )}
            </div>
            <button
              type="button"
              className="tray-card__remove"
              onClick={() => onRemove?.(item.queueId)}
            >
              Remove
            </button>
            {index === 0 && <span className="tray-card__badge">Cover</span>}
            {dropIndicator?.targetId === item.queueId && (
              <span className={`drop-indicator drop-indicator--${dropIndicator.position}`}></span>
            )}
          </article>
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className="tray-card tray-card--empty">
            <div className="tray-card__placeholder">Empty slot</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ImageTray;
