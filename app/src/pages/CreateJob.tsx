import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../utils/api';
import { WalletButton } from '../components/WalletButton';
import { useAppKitAccount } from '@reown/appkit/react';

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z
    .string()
    .min(1, 'Price is required')
    .refine(val => parseFloat(val) > 0, 'Price must be greater than 0'),
  skills: z.string().min(1, 'At least one skill is required'),
  deadline: z.string().optional(),
});

type CreateJobFormData = z.infer<typeof createJobSchema>;

const CreateJob: React.FC = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAppKitAccount();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [userRole, setUserRole] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateJobFormData>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: '',
      description: '',
      price: '',
      skills: '',
      deadline: '',
    },
  });

  useEffect(() => {
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      setUserRole(userInfo.role);

      if (userInfo.role !== 'client') {
        alert('Only clients can post jobs');
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  const onSubmit = async (data: CreateJobFormData) => {
    if (!isConnected || !address) {
      setSubmitError('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const jobData = {
        title: data.title,
        description: data.description,
        price: parseFloat(data.price),
        skills: data.skills.split(',').map(skill => skill.trim()),
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      };

      const response = await api.post('/api/jobs', jobData);

      navigate(`/jobs/${response.data._id}`);
    } catch (error) {
      console.error('Error creating job:', error);
      if (error instanceof Error) {
        setSubmitError(error.message || 'Failed to create job. Please try again.');
      } else {
        setSubmitError('Failed to create job. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userRole !== 'client') {
    return null;
  }

  return (
    <div className="create-job-page">
      <h1>Post a New Job</h1>

      {!isConnected ? (
        <div className="wallet-connection">
          <p>Please connect your wallet to post a job</p>
          <WalletButton />
        </div>
      ) : (
        <div className="job-form-container">
          {submitError && <div className="error-message">{submitError}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="job-form">
            <div className="form-group">
              <label htmlFor="title">Job Title</label>
              <input
                type="text"
                id="title"
                placeholder="E.g. Develop a DeFi App on Solana"
                {...register('title')}
              />
              {errors.title && <div className="error">{errors.title.message}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="description">Job Description</label>
              <textarea
                id="description"
                placeholder="Provide a detailed description of the job requirements..."
                rows={6}
                {...register('description')}
              />
              {errors.description && <div className="error">{errors.description.message}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="price">Budget (SOL)</label>
              <input
                type="number"
                id="price"
                placeholder="Enter amount in SOL"
                step="0.01"
                min="0"
                {...register('price')}
              />
              {errors.price && <div className="error">{errors.price.message}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="skills">Required Skills (comma-separated)</label>
              <input
                type="text"
                id="skills"
                placeholder="E.g. React, Solana, Rust"
                {...register('skills')}
              />
              {errors.skills && <div className="error">{errors.skills.message}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="deadline">Deadline (optional)</label>
              <input
                type="date"
                id="deadline"
                min={new Date().toISOString().split('T')[0]}
                {...register('deadline')}
              />
              {errors.deadline && <div className="error">{errors.deadline.message}</div>}
            </div>

            <div className="wallet-info">
              <p>
                <strong>isConnected Wallet:</strong>{' '}
                {address
                  ? `${address.toString().slice(0, 6)}...${address.toString().slice(-4)}`
                  : ''}
              </p>
              <p className="wallet-note">This wallet will be associated with your job posting.</p>
            </div>

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Job...' : 'Post Job'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreateJob;
