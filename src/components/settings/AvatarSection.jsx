export default function AvatarSection({
  user,
  avatarLoading,
  avatarError,
  handleAvatarUpload,
  handleAvatarRemove,
  getInitials
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
      <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: 'rgba(124, 92, 255, 0.15)',
          color: '#a855f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          fontWeight: '600',
          border: '2px solid rgba(124, 92, 255, 0.28)'
        }}>
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Foto de perfil"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            getInitials(user?.user_metadata?.name || user?.email)
          )}
        </div>

        <label style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: '#7C3AED',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '2px solid var(--bg-panel)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#ffffff" style={{ width: '14px', height: '14px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
            disabled={avatarLoading}
          />
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
        <label style={{
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '38px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: '600',
          padding: '0 16px',
          transition: 'all 0.15s ease',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          Alterar foto
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
            disabled={avatarLoading}
          />
        </label>

        {user?.user_metadata?.avatar_url && (
          <button
            type="button"
            onClick={handleAvatarRemove}
            disabled={avatarLoading}
            style={{
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer',
              padding: '0 16px',
              width: '100%',
              opacity: 0.85
            }}
          >
            Remover foto
          </button>
        )}

        {avatarError && (
          <p style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', margin: 0, marginTop: '4px' }}>
            {avatarError}
          </p>
        )}
      </div>
    </div>
  )
}
