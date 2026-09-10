import { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFullUrl } from '../config/apiBaseUrl';
import { Camera, Settings } from 'lucide-react';

function resolveProfileImg(rawUrl) {
  return getFullUrl(rawUrl);
}

function ProfileHeader() {
  const { user, updateProfile, uploadProfileImage } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const profileImgUrl = resolveProfileImg(user?.profile_img_url);

  const handleUpdateName = async () => {
    // Demo: update profile name
    const newName = prompt('Enter new full name:', user?.full_name || '');
    if (newName) {
      await updateProfile({ full_name: newName });
    }
  };

  const handleAvatarClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    setUploadError('');
    setUploading(true);
    const result = await uploadProfileImage(file);
    setUploading(false);
    if (!result?.success) {
      setUploadError(result?.error || 'Failed to upload photo');
    }
  };

  return (
    <header className="profile-header">
      <div
        className="profile-page-avatar"
        onClick={handleAvatarClick}
        role="button"
        tabIndex={0}
        title="Change profile picture"
      >
        {profileImgUrl ? (
          <img src={profileImgUrl} alt="Profile" />
        ) : (
          <div className="avatar-fallback">
            <Camera size={32} />
          </div>
        )}
        <div className="avatar-edit-overlay">
          <Camera size={20} />
        </div>
        {uploading && <div className="avatar-uploading-overlay">Uploading...</div>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          hidden
        />
      </div>
      <div className="profile-info">
        <h1>{user?.full_name || 'User'}</h1>
        <p>{user?.email || ''}</p>
        {uploadError && <p className="avatar-upload-error">{uploadError}</p>}
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
