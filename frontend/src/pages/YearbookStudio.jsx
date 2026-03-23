import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { yearbookService, memoryService } from '../services/api';
import './YearbookStudio.css';

const DEFAULT_CANVAS = {
  background: {
    type: 'solid',
    value: '#fdf6e3',
  },
  grid: {
    enabled: true,
    columns: 6,
    gutter: 8,
  },
};

const emptyBlock = () => ({
  id: crypto.randomUUID(),
  type: 'text',
  x: 0,
  y: 0,
  width: 2,
  height: 2,
  payload: {
    text: 'Double-click to edit',
    align: 'left',
  },
});

const useDebouncedCallback = (callback, delay = 500) => {
  const timeoutRef = useRef();

  return (...args) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  };
};

const normalizeLayout = (layout) => ({
  ...DEFAULT_CANVAS,
  ...(layout || {}),
});

const normalizeContent = (content) => ({
  blocks: Array.isArray(content?.blocks) ? content.blocks : [],
});

const CanvasBlock = ({ block, onChange, onRemove }) => {
  const [editing, setEditing] = useState(false);

  if (block.type === 'text') {
    return (
      <div
        className="yearbook-block text-block"
        style={{ gridColumn: `span ${block.width}`, gridRow: `span ${block.height}` }}
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <textarea
            autoFocus
            defaultValue={block.payload.text}
            onBlur={() => setEditing(false)}
            onChange={(event) =>
              onChange({ ...block, payload: { ...block.payload, text: event.target.value } })
            }
          />
        ) : (
          <p style={{ textAlign: block.payload.align }}>{block.payload.text}</p>
        )}
        <button type="button" className="ghost" onClick={onRemove}>
          Remove
        </button>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="yearbook-block image-block" style={{ gridColumn: `span ${block.width}` }}>
        <img src={block.payload.url} alt="Page collage" />
        <footer>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </footer>
      </div>
    );
  }

  if (block.type === 'post') {
    return (
      <article className="yearbook-block post-block" style={{ gridColumn: `span ${block.width}` }}>
        <header>
          <h4>{block.payload.snapshot?.title}</h4>
          <p>{block.payload.snapshot?.authorName || block.payload.snapshot?.eventTitle}</p>
        </header>
        <p className="post-body">{block.payload.snapshot?.body}</p>
        <footer>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </footer>
      </article>
    );
  }

  return null;
};

const AssetPanel = ({ pageId, onUploadComplete, onAttachPost }) => {
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const debouncedSearch = useDebouncedCallback(async (query) => {
    if (!query?.trim()) {
      setResults([]);
      return;
    }
    try {
      const response = await memoryService.searchPublicMemories(query);
      setResults(response.memories || []);
    } catch (error) {
      console.error('Search memories failed', error);
    }
  }, 400);

  return (
    <aside className="asset-panel">
      <section>
        <h3>Upload Media</h3>
        <label className="file-pill">
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setUploading(true);
                const formData = new FormData();
                formData.append('image', file);
                const response = await yearbookService.uploadPageImage(pageId, formData);
                onUploadComplete(response.page);
              } catch (error) {
                alert(error.response?.data?.error || 'Failed to upload');
              } finally {
                event.target.value = '';
                setUploading(false);
              }
            }}
          />
          {uploading ? 'Uploading…' : 'Add Photo'}
        </label>
      </section>

      <section>
        <h3>Add Posts</h3>
        <input
          type="text"
          placeholder="Search approved posts"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            debouncedSearch(event.target.value);
          }}
        />
        <ul className="search-results">
          {results.map((memory) => (
            <li key={memory.id}>
              <button
                type="button"
                onClick={() => onAttachPost('memory', memory.id)}
              >
                {memory.title}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
};

const YearbookStudio = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pageId = params.get('pageId');
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const layout = useMemo(() => normalizeLayout(page?.layout), [page?.layout]);
  const content = useMemo(() => normalizeContent(page?.content), [page?.content]);

  useEffect(() => {
    if (!pageId) {
      navigate('/dashboard');
      return;
    }

    const fetchPage = async () => {
      try {
        setError('');
        setLoading(true);
        const response = await yearbookService.getPage(pageId);
        setPage(response.page);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [pageId, navigate]);

  const persist = useDebouncedCallback(async (nextContent) => {
    try {
      setSaving(true);
      const response = await yearbookService.updatePage(pageId, {
        layout,
        content: nextContent,
      });
      setPage(response.page);
    } catch (err) {
      console.error('Save page error', err);
    } finally {
      setSaving(false);
    }
  }, 800);

  const updateBlocks = (nextBlocks) => {
    const next = { ...content, blocks: nextBlocks };
    setPage((prev) => ({ ...prev, content: next }));
    persist(next);
  };

  const addTextBlock = () => {
    updateBlocks([...content.blocks, emptyBlock()]);
  };

  const removeBlock = (blockId) => {
    updateBlocks(content.blocks.filter((block) => block.id !== blockId));
  };

  const updateBlock = (nextBlock) => {
    updateBlocks(content.blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block)));
  };

  const handleAttachPost = async (entityType, entityId) => {
    try {
      const response = await yearbookService.attachPost(pageId, entityType, entityId);
      setPage(response.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to attach post');
    }
  };

  if (loading) {
    return (
      <div className="yearbook-studio">
        <div className="scrapbook-page studio-page">
          <div className="spinner" />
          <p className="loading-text">Setting up your canvas…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="yearbook-studio">
        <div className="scrapbook-page studio-page">
          <p className="error-message">{error}</p>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="yearbook-studio">
      <div className="studio-toolbar">
        <div>
          <h1>{page?.title || 'Yearbook Page'}</h1>
          <p className="eyebrow">Release: {page?.release_title || page?.release_id}</p>
        </div>
        <div className="toolbar-actions">
          {saving && <span className="saving-dot">Saving…</span>}
          <button type="button" onClick={addTextBlock}>
            Add Text Box
          </button>
          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={async () => {
              try {
                setSubmitting(true);
                const response = await yearbookService.submitPage(pageId);
                setPage(response.page);
              } catch (err) {
                alert(err.response?.data?.error || 'Failed to submit');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {page?.status === 'submitted' ? 'Resubmit' : 'Submit for Review'}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')}>
            Exit Studio
          </button>
        </div>
      </div>

      <main className="studio-content">
        <section className="canvas-wrapper" style={{ background: layout.background?.value }}>
          <div
            className="canvas-grid"
            style={{
              gridTemplateColumns: `repeat(${layout.grid?.columns || 6}, 1fr)`,
              gap: `${layout.grid?.gutter || 8}px`,
            }}
          >
            {content.blocks.map((block) => (
              <CanvasBlock
                key={block.id}
                block={block}
                onChange={updateBlock}
                onRemove={() => removeBlock(block.id)}
              />
            ))}
            {page?.images?.map((image) => (
              <figure key={image.id} className="yearbook-block attachment-block">
                <img src={image.url} alt="Collage" />
                <button
                  type="button"
                  className="ghost"
                  onClick={async () => {
                    try {
                      const response = await yearbookService.removeImage(pageId, image.id);
                      setPage(response.page);
                    } catch (err) {
                      alert(err.response?.data?.error || 'Failed to remove');
                    }
                  }}
                >
                  Remove
                </button>
              </figure>
            ))}
            {page?.attachments?.map((attachment) => (
              <CanvasBlock
                key={`attachment-${attachment.id}`}
                block={{
                  id: `attachment-${attachment.id}`,
                  type: 'post',
                  width: 3,
                  height: 2,
                  payload: { snapshot: attachment.snapshot },
                }}
                onRemove={async () => {
                  try {
                    const response = await yearbookService.removeAttachment(pageId, attachment.id);
                    setPage(response.page);
                  } catch (err) {
                    alert(err.response?.data?.error || 'Failed to remove attachment');
                  }
                }}
              />
            ))}
          </div>
        </section>

        <AssetPanel
          pageId={pageId}
          onUploadComplete={(nextPage) => setPage(nextPage)}
          onAttachPost={handleAttachPost}
        />
      </main>
    </div>
  );
};

export default YearbookStudio;
