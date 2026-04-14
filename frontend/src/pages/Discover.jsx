import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { memoryService } from '../services/api'
import './Discover.css'

const DEFAULT_REACTIONS = ['love', 'wow', 'support']

const formatDate = (value) => {
  if (!value) return ''
  try {
    const date = new Date(value);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return value
  }
}

const MemoryCard = ({ memory, viewer, onReact, onRemoveReaction, onOpenComments, onDelete }) => {
  const reactionCounts = memory.reactions?.counts || {}
  const viewerReaction = memory.reactions?.viewer || null
  const isOwner = viewer?.studentId === memory.creator?.studentId

  return (
    <article className="memory-card">
      <header className="memory-card__header">
        <div className="memory-card__avatar">
          {memory.creator?.photoUrl ? (
            <img src={memory.creator.photoUrl} alt={memory.creator?.firstName || 'Profile'} />
          ) : (
            <span>{memory.creator?.displayName?.charAt(0) || '?'}</span>
          )}
        </div>
        <div className="memory-card__meta">
          <span className="memory-card__name">{memory.creator?.firstName} {memory.creator?.lastName}</span>
          <span className="memory-card__timestamp">{formatDate(memory.createdAt)}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isOwner && (
            <button 
              type="button" 
              className="memory-card__delete-btn"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this memory?')) {
                  onDelete(memory.id)
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff4d4f',
                cursor: 'pointer',
                fontSize: '0.8rem',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              Delete
            </button>
          )}
          <span className="memory-card__badge">{memory.albumType === 'club' ? 'Club' : memory.albumType}</span>
        </div>
      </header>

      <h3 className="memory-card__title">{memory.title}</h3>
      <p className="memory-card__content">{memory.content}</p>

      {memory.images?.length > 0 && (
        <div className="memory-card__images">
          {memory.images.slice(0, 3).map((image) => (
            <img key={image.id} src={image.url} alt={memory.title} />
          ))}
        </div>
      )}

      <footer className="memory-card__footer">
        <div className="memory-card__reactions">
          {DEFAULT_REACTIONS.map((type) => {
            const label = type === 'love' ? '❤️' : type === 'wow' ? '🔥' : '👏'
            const isActive = viewerReaction === type
            const count = reactionCounts[type] || 0
            return (
              <button
                key={type}
                type="button"
                className={isActive ? 'active' : ''}
                onClick={() => {
                  if (isActive) {
                    onRemoveReaction(memory.id)
                  } else {
                    onReact(memory.id, type)
                  }
                }}
              >
                {label} <span>{count}</span>
              </button>
            )
          })}
        </div>
        <button type="button" className="memory-card__comments" onClick={() => onOpenComments(memory)}>
          💬 {memory.commentCount || 0}
        </button>
      </footer>
    </article>
  )
}

const CommentsDrawer = ({ memory, open, onClose }) => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const listRef = useRef(null)

  const loadComments = async (targetPage = 1, overwrite = false) => {
    if (!memory) return
    try {
      setLoading(true)
      const response = await memoryService.listComments(memory.id, { page: targetPage, limit: 20 })
      setHasMore(response.total > targetPage * response.limit)
      setPage(targetPage)
      setComments((prev) => (overwrite ? response.comments : [...prev, ...response.comments]))
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadComments(1, true)
      setBody('')
    }
  }, [open, memory?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    try {
      await memoryService.addComment(memory.id, body.trim())
      setBody('')
      await loadComments(1, true)
      if (listRef.current) {
        listRef.current.scrollTop = 0
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post comment')
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <section className="comments-drawer" onClick={(event) => event.stopPropagation()}>
        <header>
          <h4>Comments</h4>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        {error && <div className="error-message">{error}</div>}

        <div className="comments-list" ref={listRef}>
          {loading && comments.length === 0 ? (
            <p className="muted">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="muted">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <article className="comment" key={comment.id}>
                <div className="comment__avatar">{comment.student?.firstName?.charAt(0) || '?'}</div>
                <div className="comment__body">
                  <strong>
                    {comment.student?.firstName} {comment.student?.lastName}
                  </strong>
                  <p>{comment.body}</p>
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
              </article>
            ))
          )}
        </div>

        {hasMore && (
          <button type="button" className="ghost" onClick={() => loadComments(page + 1)} disabled={loading}>
            Load more
          </button>
        )}

        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share something kind..."
            rows={3}
          />
          <button type="submit" disabled={loading || !body.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  )
}

const Discover = () => {
  const navigate = useNavigate()
  const [memories, setMemories] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [commentsMemory, setCommentsMemory] = useState(null)
  const [viewer, setViewer] = useState(null)

  const fetchFeed = async (nextPage = 1, overwrite = false) => {
    try {
      setLoading(true)
      const response = await memoryService.getFeed({ page: nextPage })
      setMemories((prev) => (overwrite ? response.memories : [...prev, ...response.memories]))
      setViewer(response.viewer)
      setHasMore(response.memories.length >= response.limit)
      setPage(nextPage)
      setError('')
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        navigate('/login')
        return
      }
      setError(err.response?.data?.error || 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed(1, true)
  }, [])

  const handleReact = async (memoryId, reactionType) => {
    try {
      const response = await memoryService.react(memoryId, reactionType)
      setMemories((prev) =>
        prev.map((memory) =>
          memory.id === memoryId
            ? {
                ...memory,
                reactions: {
                  counts: response.counts,
                  viewer: response.viewerReaction,
                },
              }
            : memory,
        ),
      )
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to react to memory')
    }
  }

  const handleRemoveReaction = async (memoryId) => {
    try {
      await memoryService.removeReaction(memoryId)
      setMemories((prev) =>
        prev.map((memory) =>
          memory.id === memoryId
            ? {
                ...memory,
                reactions: {
                  counts: memory.reactions?.counts || {},
                  viewer: null,
                },
              }
            : memory,
        ),
      )
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove reaction')
    }
  }

  const handleDeleteMemory = async (memoryId) => {
    try {
      await memoryService.deleteMemory(memoryId)
      setMemories((prev) => prev.filter((m) => m.id !== memoryId))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete memory')
    }
  }

  const greeting = useMemo(() => {
    if (!viewer?.department) return 'Discover memories'
    return `Discover ${viewer.department} & Batch ${viewer.graduationYear || ''}`
  }, [viewer])

  return (
    <div className="discover-page">
      <nav className="discover-nav">
        <div className="nav-inner">
          <h1>IUT Yearbook</h1>
          <div className="nav-links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/directory">Directory</Link>
            <button type="button" onClick={() => fetchFeed(1, true)} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </nav>

      <header className="discover-hero">
        <h2>{greeting}</h2>
        <p>Browse new stories from your peers, celebrate wins, and keep memories alive.</p>
      </header>

      {error && <div className="error-message centered">{error}</div>}

      <section className="memory-feed">
        {loading && memories.length === 0 ? (
          <p className="muted">Loading feed...</p>
        ) : memories.length === 0 ? (
          <p className="muted">No memories yet. Be the first to post one!</p>
        ) : (
          memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              viewer={viewer}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
              onOpenComments={setCommentsMemory}
              onDelete={handleDeleteMemory}
            />
          ))
        )}
      </section>

      {hasMore && (
        <div className="load-more-row">
          <button type="button" onClick={() => fetchFeed(page + 1)} disabled={loading}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      <CommentsDrawer memory={commentsMemory} open={Boolean(commentsMemory)} onClose={() => setCommentsMemory(null)} />
    </div>
  )
}

export default Discover
