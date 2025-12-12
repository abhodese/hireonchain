import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getBalance } from '../utils/solana';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { WalletButton } from '../components/WalletButton';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  walletAddress: string;
  role: string;
  skills: string[];
  bio: string;
  rating: number;
  reviews: {
    from: {
      _id: string;
      username: string;
    };
    content: string;
    rating: number;
    createdAt: string;
  }[];
}

const Profile: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    skills: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!publicKey) {
          toast.error('Error fetching profile');
          return;
        }

        const response = await api.get('/api/users/profile');
        setProfile(response.data);

        setFormData({
          username: response.data.username,
          email: response.data.email,
          bio: response.data.bio || '',
          skills: response.data.skills ? response.data.skills.join(', ') : '',
        });
      } catch (error) {
        console.log(error);
        toast.error('Error fetching profile');
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      fetchProfile();
    }
  }, [loading, publicKey]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey) {
        try {
          const solBalance = await getBalance(publicKey.toString());
          setBalance(solBalance);
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      }
    };

    fetchBalance();
  }, [connected, publicKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        skills: formData.skills ? formData.skills.split(',').map(skill => skill.trim()) : [],
      };

      const response = await api.put('/api/users/profile', updateData);
      setProfile(response.data);
      setEditMode(false);

      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      localStorage.setItem(
        'userInfo',
        JSON.stringify({
          ...userInfo,
          username: response.data.username,
          email: response.data.email,
        })
      );

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
          <p className="text-secondary-600 font-semibold text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary-950 via-secondary-900 to-primary-950 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 max-w-md">
          <p className="text-red-400 text-center">{error || 'Failed to load profile'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-4">Your Profile</h1>

          {!connected && (
            <div className="bg-primary-500/20 border border-primary-500/30 rounded-xl p-4 flex items-center justify-between">
              <p className="text-primary-200">Connect your wallet to view your balance</p>
              <WalletButton />
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Information */}
            {connected && profile.walletAddress && (
              <div className="border-2 border-primary-100 rounded-xl p-6 shadow-xl">
                <h2 className="text-xl font-semibold text-primary-600 mb-4">Wallet Information</h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-secondary-600 font-bold block">Address</label>
                    <code className="text-primary-400 font-mono text-lg break-all block">
                      {profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-8)}
                    </code>
                  </div>

                  <div className="font-">
                    {publicKey && publicKey.toBase58() === profile.walletAddress ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500/20 text-accent-600 font-semibold text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Wallet connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
                        ⚠️ Connected wallet doesn't match profile
                      </span>
                    )}
                  </div>

                  {balance !== null && (
                    <div>
                      <label className=" text-secondary-900 block font-semibold">Balance</label>
                      <div className="text-xl text-primary-400 font-semibold">
                        {balance.toFixed(4)} <span className="text-primary-400">SOL</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Type */}
            <div className="border-2 border-primary-100 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-primary-600 mb-4">Account Type</h2>
              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-400 border border-primary-400">
                <span className="text-lg font-medium text-white">
                  {profile.role === 'client' ? 'Client' : 'Freelancer'}
                </span>
              </div>

              {profile.role === 'freelancer' && (
                <div className="mt-4">
                  <h3 className="text-sm text-secondary-600 font-semibold mb-2">Rating</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-xl">
                      {'★'.repeat(Math.round(profile.rating))}
                      {'☆'.repeat(5 - Math.round(profile.rating))}
                    </span>
                    <span className="text-primary-400 font-semibold">
                      ({profile.rating.toFixed(1)})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {editMode ? (
              // Edit Form
              <form
                onSubmit={handleSubmit}
                className="bg-secondary-800/50 backdrop-blur-sm rounded-2xl p-6 border border-secondary-700/50"
              >
                <h2 className="text-2xl text-primary-400 font-semibold mb-6">Edit Profile</h2>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm text-secondary-600 font-semibold mb-1"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="w-full bg-secondary-900/50 border border-secondary-600 rounded-lg px-4 py-2.5 text-primary-400 font-semibold focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm text-secondary-600 font-semibold mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-secondary-900/50 border border-secondary-600 rounded-lg px-4 py-2.5 text-primary-400 font-semibold focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bio"
                      className="block text-sm text-secondary-600 font-semibold mb-1"
                    >
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full bg-secondary-900/50 border border-secondary-600 rounded-lg px-4 py-2.5 text-primary-400 font-semibold focus:outline-none focus:border-primary-500 transition-colors resize-none"
                    />
                  </div>

                  {profile.role === 'freelancer' && (
                    <div>
                      <label
                        htmlFor="skills"
                        className="block text-sm text-secondary-600 font-semibold mb-1"
                      >
                        Skills (comma-separated)
                      </label>
                      <input
                        type="text"
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="React, TypeScript, Node.js"
                        className="w-full bg-secondary-900/50 border border-secondary-600 rounded-lg px-4 py-2.5 text-primary-400 font-semibold focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-primary-400 font-semibold font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="flex-1 bg-secondary-700 hover:bg-secondary-600 text-primary-400 font-semibold font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              // Profile Display
              <>
                <div className="border-2 border-primary-100 rounded-xl p-6 shadow-xl">
                  <h2 className="text-xl font-semibold text-primary-600 mb-4">
                    Personal Information
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <span className="text-secondary-600 font-semibold block mb-1">Username</span>
                      <span className="text-lg text-primary-400">{profile.username}</span>
                    </div>

                    <div>
                      <span className="text-secondary-600 font-semibold block mb-1">Email</span>
                      <span className="text-lg text-primary-400">{profile.email}</span>
                    </div>

                    {profile.bio && (
                      <div>
                        <span className="text-sm text-secondary-600 font-semibold block mb-1">
                          Bio
                        </span>
                        <p className="text-primary-400 font-semibold leading-relaxed">
                          {profile.bio}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setEditMode(true)}
                    className="mt-6 bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Skills Section */}
                {profile.role === 'freelancer' && profile.skills.length > 0 && (
                  <div className="bg-secondary-800/50 backdrop-blur-sm rounded-2xl p-6 border border-secondary-700/50">
                    <h2 className="text-2xl text-primary-400 font-semibold mb-4">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-primary-500/20 border border-primary-500/30 rounded-lg text-primary-300 text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                {profile.role === 'freelancer' && profile.reviews.length > 0 && (
                  <div className="bg-secondary-800/50 backdrop-blur-sm rounded-2xl p-6 border border-secondary-700/50">
                    <h2 className="text-2xl text-primary-400 font-semibold mb-4">
                      Reviews ({profile.reviews.length})
                    </h2>
                    <div className="space-y-4">
                      {profile.reviews.map((review, index) => (
                        <div
                          key={index}
                          className="bg-secondary-900/50 rounded-lg p-4 border border-secondary-700/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-primary-400 font-semibold">
                              {review.from.username}
                            </span>
                            <span className="text-yellow-400">
                              {'★'.repeat(review.rating)}
                              {'☆'.repeat(5 - review.rating)}
                            </span>
                          </div>
                          <p className="text-secondary-300 mb-2">{review.content}</p>
                          <span className="text-xs text-secondary-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
