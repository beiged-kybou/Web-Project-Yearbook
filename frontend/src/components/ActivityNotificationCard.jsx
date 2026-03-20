import './ActivityNotificationCard.css'

const emojiMap = {
  reaction: '💖',
  comment: '💬',
  memory: '📸',
}

const ActivityNotificationCard = ({ notification }) => {
  const type = notification.type || notification.notification_type
  const payload = notification.payload || {}
  const actor = payload.actor || {}
  const memory = payload.memory || {}
  const emoji = emojiMap[type] || '✨'

  return (
    <article className="activity-notification-card">
      <div className="activity-notification-card__emoji" aria-hidden="true">
        {emoji}
      </div>
      <div className="activity-notification-card__body">
        <header>
          <strong>
            {actor.firstName} {actor.lastName}
          </strong>
          <span>
            {type === 'reaction'
              ? ' added a reaction'
              : type === 'comment'
                ? ' commented'
                : ' shared something new'}
          </span>
        </header>
        <p className="activity-notification-card__title">{memory.title || 'One of your memories'}</p>
        {type === 'reaction' && payload.reactionType && (
          <p className="activity-notification-card__meta">Reaction: {payload.reactionType}</p>
        )}
      </div>
    </article>
  )
}

export default ActivityNotificationCard
