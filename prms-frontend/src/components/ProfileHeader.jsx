import { useAuth } from '../contexts/AuthContext';
import { getFullUrl } from '../config/apiBaseUrl';
import { Camera, Settings } from 'lucide-react';

function resolveProfileImg(rawUrl) {
  return getFullUrl(rawUrl);
}

function ProfileHeader() {
  const { user, updateProfile } = useAuth();

  const profileImgUrl = resolveProfileImg(user?.profile_img_url);

  const handleUpdateName = async () => {
    // Demo: update profile name
    const newName = prompt('Enter new full name:', user?.full_name || '');
    if (newName) {
      await updateProfile({ full_name: newName });
    }
  };

  return (
    <header className="profile-header">
      <div className="profile-page-avatar">
        {profileImgUrl ? (
          <img src={profileImgUrl} alt="Profile" />
        ) : (
          <div className="avatar-fallback">
            <Camera size={32} />
          </div>
        )}
      </div>
      <div className="profile-info">
        <h1>{user?.full_name || 'User'}</h1>
        <p>{user?.email || ''}</p>
        <button
          className="btn-edit"
          onClick={handleUpdateName}
        >
          <Settings size={16} />
          Edit Profile
        </button>
      </div>
    </header>
  );
}

export default ProfileHeader;
