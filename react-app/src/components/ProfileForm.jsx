import React, { useState } from 'react';
import { useWorkout } from '../context/WorkoutContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { updateUserProfile } from '../services/api.js';
import { STORAGE_KEYS, removeItem } from '../services/storage.js';

export default function ProfileForm() {
  const { setShowProfileForm } = useWorkout();
  const { setNeedsProfile } = useAuth();
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  async function handleSubmit() {
    if (!gender || !weight || !height || !birthdate) {
      alert('Please fill in all required fields');
      return;
    }
    if (parseFloat(weight) <= 0 || parseFloat(weight) > 300) {
      alert('Weight must be between 1 and 300 kg');
      return;
    }
    if (parseFloat(height) <= 0 || parseFloat(height) > 250) {
      alert('Height must be between 1 and 250 cm');
      return;
    }

    const formData = {
      gender,
      weight: parseFloat(weight),
      height: parseFloat(height),
      birthdate
    };

    try {
      let workoutData = null;
      const jsonFile = gender === 'female' ? './FullBodyFemale.json' : './FullBodyMale.json';
      const response = await fetch(jsonFile);
      workoutData = await response.json();
      if (workoutData) formData.exercises = workoutData;
    } catch (e) {
      console.warn('Could not load workout data:', e);
    }

    try {
      const result = await updateUserProfile(formData);
      if (result.success) {
        setShowProfileForm(false);
        setNeedsProfile(false);
        alert('Profile updated successfully! The page will refresh to load your personalized workout plan.');
        setTimeout(() => {
          removeItem(STORAGE_KEYS.SELECTED_LVL);
          removeItem(STORAGE_KEYS.RESUME);
          window.location.reload(true);
        }, 500);
      } else {
        alert('Error updating profile: ' + (result.message || 'Unknown error'));
      }
    } catch (e) {
      alert('Error updating profile: ' + e.message);
    }
  }

  return (
    <div className="profile-form-container" style={{ width: '100%', background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
      <h3 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>Complete Your Profile</h3>
      <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '20px' }}>Please provide your information to get personalized workout recommendations</p>

      <div className="row">
        <div className="col-sm-6">
          <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Gender *</label>
          <select value={gender} onChange={e => setGender(e.target.value)} className="selectProg" style={{ width: '100%', marginBottom: '15px', color: '#000', backgroundColor: '#fff' }} required>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-sm-6">
          <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Birth Date *</label>
          <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} style={{ width: '100%', marginBottom: '15px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', backgroundColor: '#fff' }} required />
        </div>
      </div>

      <div className="row">
        <div className="col-sm-6">
          <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Weight (kg) *</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} min="1" max="300" step="0.1" style={{ width: '100%', marginBottom: '15px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', backgroundColor: '#fff' }} placeholder="Enter your weight" required />
        </div>
        <div className="col-sm-6">
          <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Height (cm) *</label>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} min="1" max="250" step="0.1" style={{ width: '100%', marginBottom: '15px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#000', backgroundColor: '#fff' }} placeholder="Enter your height" required />
        </div>
      </div>

      <div className="row">
        <div className="col-sm-12" style={{ textAlign: 'center' }}>
          <button type="button" onClick={handleSubmit} className="butLog" style={{ background: '#00ff37', color: '#000', padding: '10px 30px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Update Profile
          </button>
        </div>
      </div>
    </div>
  );
}
