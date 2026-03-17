import toast from 'react-hot-toast';
import { UserProfile } from '../pages/Profile';
import api from '../utils/api';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface ProfileProps {
  formData: UserProfile;
  setFormData: React.Dispatch<React.SetStateAction<UserProfile>>;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const profileSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  bio: z
    .string()
    .min(1, 'Bio is required')
    .max(300, 'Bio must be under 300 characters'),
  skills: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileModal = ({ formData, setFormData, setEditMode }: ProfileProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: formData.username,
      email: formData.email,
      bio: formData.bio ?? '',
      skills: Array.isArray(formData.skills) ? formData.skills.join(', ') : '',
    },
  });

  const bioValue = watch('bio');
  const bioLength = bioValue?.length ?? 0;

  useEffect(() => {
    reset({
      username: formData.username,
      email: formData.email,
      bio: formData.bio ?? '',
      skills: Array.isArray(formData.skills) ? formData.skills.join(', ') : '',
    });
  }, [formData, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updateData = {
        ...formData,
        username: data.username,
        email: data.email,
        bio: data.bio,
        skills: data.skills ? data.skills.split(',').map(skill => skill.trim()) : [],
      };

      const { data: responseData } = await api.put('/api/users/profile', updateData);
      setFormData(responseData);
      setEditMode(false);

      localStorage.setItem(
        'userInfo',
        responseData.username
          ? JSON.stringify({
              ...updateData,
              username: responseData.username,
              email: responseData.email,
            })
          : '{}'
      );

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 min-h-screen w-screen">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="items-center mx-auto justify-between flex mb-12">
          <h2 className="text-3xl font-bold text-center text-primary-600">Edit Profile</h2>
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="text-secondary-600 hover:text-primary-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-secondary-900 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed ${
                errors.username ? 'border-red-300' : 'border-secondary-300'
              }`}
              {...register('username')}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary-900 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed ${
                errors.email ? 'border-red-300' : 'border-secondary-300'
              }`}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-secondary-900 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed ${
                errors.bio ? 'border-red-300' : 'border-secondary-300'
              }`}
              {...register('bio')}
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
            )}
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                bioLength >= 300 ? 'text-red-500' : 'text-secondary-900'
              }`}
            >
              <span className="text-primary-600 underline">Characters:</span>
              {` ${bioLength} / 300`}
            </label>
          </div>

          {formData.role === 'freelancer' && (
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
                placeholder="React, TypeScript, Node.js"
                className="w-full bg-secondary-900/50 border border-secondary-600 rounded-lg px-4 py-2.5 text-primary-400 font-semibold focus:outline-none focus:border-primary-500 transition-colors"
                {...register('skills')}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            className="font-semibold x-4 py-2 border-2 border-primary-600 hover:border-primary-500 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors w-1/2"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="font-semibold px-4 py-2 border-2 border-primary-600 hover:border-primary-400 text-primary-600 hover:text-primary-500 rounded-lg transition-colors w-1/2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
