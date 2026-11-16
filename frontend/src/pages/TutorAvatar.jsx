import { useState } from 'react';
import api from '../api';

function TutorAvatar({ id, name, hasPhoto, size = 80 }) {
  const [failed, setFailed] = useState(false);
  const base = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const box = { width: size, height: size, borderRadius: '50%', flex: '0 0 auto' };

  if (hasPhoto && !failed) {
    return (
      <img
        src={`${base}/profile/photo/${id}`}
        alt={name}
        onError={() => setFailed(true)}
        style={{ ...box, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      style={{
        ...box,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e5e7eb',
        fontSize: size / 2.5
      }}
    >
      {name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}

export default TutorAvatar;