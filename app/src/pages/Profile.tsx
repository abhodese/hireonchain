import React, { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { WalletButton } from '../components/WalletButton';
import { ProfileModal } from '../components/ProfileModal';
import { useAppKitAccount } from '@reown/appkit/react';
import { useFreelanceClient } from '../hooks/useFreelanceClient';

interface Review {
  _id: string;
  reviewer: {
    username: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  walletAddress: string;
  bio: string;
  skills: string[];
  reviews: Review[];
  role: string;
  rating: number;
  createdAt: string;
}

const Profile: React.FC = () => {
  const { address, isConnected } = useAppKitAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const sdkClient = useFreelanceClient();

  const [formData, setFormData] = useState<UserProfile>({
    _id: '',
    username: '',
    email: '',
    walletAddress: '',
    bio: '',
    skills: [],
    reviews: [],
    role: '',
    rating: 0,
    createdAt: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!address) {
          setLoading(false);
          return;
        }

        const { data } = await api.get<UserProfile>('/api/users/profile');
        setFormData({
          ...data,
          bio: data.bio || '',
          rating: data.rating || 0,
          skills: data.skills || [],
          reviews: data.reviews || [],
        });

        // Fetch wallet balance
        try {
          const bal = await sdkClient.connection.getBalance({ publicKey: () => address } as any);
          setBalance(bal / LAMPORTS_PER_SOL);
        } catch (balError) {
          console.error('Error fetching balance:', balError);
        }

        setError('');
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
        toast.error('Error fetching profile');
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && address) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, sdkClient.connection]);

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = async (updatedData: Partial<UserProfile>) => {
    try {
      await api.put('/api/users/profile', updatedData);
      setFormData(prev => ({ ...prev, ...updatedData }));
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="profile-page loading-state">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="profile-page not-connected">
        <h1>Profile</h1>
        <p>Please connect your wallet to view your profile.</p>
        <WalletButton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page error-state">
        <h1>Profile</h1>
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>{formData.username}'s Profile</h1>
        <span className={`role-badge ${formData.role}`}>{formData.role}</span>
      </div>

      <div className="profile-container">
        <div className="profile-main">
          <div className="profile-info">
            <div className="info-section">
              <h2>Contact Information</h2>
              <div className="info-row">
                <label>Email:</label>
                <span>{formData.email}</span>
              </div>
              <div className="info-row">
                <label>Wallet:</label>
                <span className="wallet-address">
                  {formData.walletAddress.slice(0, 6)}...{formData.walletAddress.slice(-6)}
                </span>
              </div>
              <div className="info-row">
                <label>Balance:</label>
                <span>{balance.toFixed(4)} SOL</span>
              </div>
            </div>

            <div className="info-section">
              <h2>Bio</h2>
              <p>{formData.bio || 'No bio provided'}</p>
            </div>

            <div className="info-section">
              <h2>Skills</h2>
              <div className="skills-list">
                {formData.skills && formData.skills.length > 0 ? (
                  formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p>No skills listed</p>
                )}
              </div>
            </div>

            <div className="info-section">
              <h2>Rating</h2>
              <div className="rating-display">
                <span className="rating-value">{formData.rating.toFixed(1)}</span>
                <span className="rating-stars">
                  {'★'.repeat(Math.round(formData.rating))}
                  {'☆'.repeat(5 - Math.round(formData.rating))}
                </span>
              </div>
            </div>

            <button onClick={handleEdit} className="edit-profile-btn">
              Edit Profile
            </button>
          </div>
        </div>

        <div className="profile-sidebar">
          <div className="reviews-section">
            <h2>Reviews ({formData.reviews?.length || 0})</h2>
            {formData.reviews && formData.reviews.length > 0 ? (
              <div className="reviews-list">
                {formData.reviews.map(review => (
                  <div key={review._id} className="review-card">
                    <div className="review-header">
                      <span className="reviewer-name">
                        {review.reviewer?.username || 'Anonymous'}
                      </span>
                      <span className="review-rating">{'★'.repeat(review.rating)}</span>
                    </div>
                    <p className="review-comment">{review.comment}</p>
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-reviews">No reviews yet</p>
            )}
          </div>

          <div className="member-since">
            <h3>Member Since</h3>
            <p>{new Date(formData.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {editMode && (
        <ProfileModal profile={formData} onClose={() => setEditMode(false)} onSave={handleSave} />
      )}
    </div>
  );
};

export default Profile;
