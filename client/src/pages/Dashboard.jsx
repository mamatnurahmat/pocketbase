import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import LampiranForm from '../components/LampiranForm';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(pb.authStore.model);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const updatedUser = await pb.collection('users').update(user.id, {
        name: name,
      });
      setUser(updatedUser);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-panel dashboard-card">
        <div className="dashboard-header">
          <div>
            <h2>Dashboard</h2>
            <p>Welcome to your secure portal{user?.name ? `, ${user.name}` : ''}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: 'auto' }}>
            Logout
          </button>
        </div>

        <div className="user-info">
          <h3>Your Profile</h3>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Name:</strong> {user?.name || <em>Not set</em>}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Created:</strong> {new Date(user?.created).toLocaleString()}</p>
        </div>
        
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Update Profile</h3>
          
          {message.text && (
            <div className={message.type === 'error' ? 'error-message' : 'success-message'} style={{
              background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              color: message.type === 'error' ? '#fca5a5' : '#86efac',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label htmlFor="name">Display Name</label>
              <input
                type="text"
                id="name"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Updating...' : 'Save Changes'}
            </button>
          </form>
        </div>
        
        <LampiranForm />
      </div>
    </div>
  );
}
