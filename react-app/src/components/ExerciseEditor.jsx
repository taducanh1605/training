import React, { useState, useEffect } from 'react';
import { useWorkout } from '../context/WorkoutContext.jsx';

const EXERCISE_STORAGE_KEY = 'training.editedExercises';

export default function ExerciseEditor() {
  const { setShowExerciseEditor, dataUsers, setDataUsers, json2ListProg, setListProgUsers } = useWorkout();
  const [navLevel, setNavLevel] = useState('levels');
  const [currentLevel, setCurrentLevel] = useState(null);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXERCISE_STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : dataUsers;
      if (data && Object.keys(data).length > 0) {
        setEditedData(JSON.parse(JSON.stringify(data)));
      }
    } catch (e) {
      console.error('Error loading exercises:', e);
    }
  }, [dataUsers]);

  function handleClose() {
    setShowExerciseEditor(false);
  }

  function saveToStorage(data) {
    localStorage.setItem(EXERCISE_STORAGE_KEY, JSON.stringify(data));
    setDataUsers(data);
    setListProgUsers(json2ListProg(data));
    setMessage('Saved!');
    setTimeout(() => setMessage(''), 2000);
  }

  function handleSave() {
    if (editedData) saveToStorage(editedData);
  }

  function handleReset() {
    if (confirm('Reset to default exercises?')) {
      localStorage.removeItem(EXERCISE_STORAGE_KEY);
      window.location.reload(true);
    }
  }

  if (!editedData) {
    return (
      <div style={{ textAlign: 'center', color: '#fff', padding: '20px', background: 'rgba(0,0,0,0.85)', borderRadius: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Exercise Editor</h3>
          <button onClick={handleClose} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}>X</button>
        </div>
        <p>No workout data found. Please login and select a workout first.</p>
      </div>
    );
  }

  if (navLevel === 'levels') {
    return (
      <div style={{ width: '100%', background: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '10px', marginBottom: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Exercise Editor - Levels</h3>
          <button onClick={handleClose} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}>X</button>
        </div>
        {message && <p style={{ color: '#00ff37', textAlign: 'center' }}>{message}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.keys(editedData).map(level => (
            <button key={level} onClick={() => { setCurrentLevel(level); setNavLevel('workouts'); }}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #666', borderRadius: '4px', padding: '10px', textAlign: 'left', cursor: 'pointer' }}>
              {level}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button onClick={handleSave} className="butLog" style={{ background: '#00ff37', color: '#000' }}>Save Changes</button>
          <button onClick={handleReset} className="butLog">Reset to Default</button>
        </div>
      </div>
    );
  }

  if (navLevel === 'workouts' && currentLevel) {
    const workouts = editedData[currentLevel] || {};
    return (
      <div style={{ width: '100%', background: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '10px', marginBottom: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Level: {currentLevel}</h3>
          <div>
            <button onClick={() => setNavLevel('levels')} style={{ background: '#666', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', marginRight: '5px' }}>Back</button>
            <button onClick={handleClose} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}>X</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.keys(workouts).map(workout => (
            <button key={workout} onClick={() => { setCurrentWorkout(workout); setNavLevel('exercises'); }}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #666', borderRadius: '4px', padding: '10px', textAlign: 'left', cursor: 'pointer' }}>
              {workout}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (navLevel === 'exercises' && currentLevel && currentWorkout) {
    const workoutData = editedData[currentLevel][currentWorkout];
    const [exercises, sets, rests] = workoutData;

    function updateExercise(idx, value) {
      const newData = JSON.parse(JSON.stringify(editedData));
      newData[currentLevel][currentWorkout][0][idx] = value;
      setEditedData(newData);
    }

    function updateSet(idx, value) {
      const newData = JSON.parse(JSON.stringify(editedData));
      newData[currentLevel][currentWorkout][1][idx] = parseInt(value) || 1;
      setEditedData(newData);
    }

    function updateRest(idx, value) {
      const newData = JSON.parse(JSON.stringify(editedData));
      newData[currentLevel][currentWorkout][2][idx] = parseInt(value) || 0;
      setEditedData(newData);
    }

    return (
      <div style={{ width: '100%', background: 'rgba(0,0,0,0.85)', padding: '20px', borderRadius: '10px', marginBottom: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>{currentWorkout}</h3>
          <div>
            <button onClick={() => setNavLevel('workouts')} style={{ background: '#666', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer', marginRight: '5px' }}>Back</button>
            <button onClick={handleClose} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}>X</button>
          </div>
        </div>
        {message && <p style={{ color: '#00ff37', textAlign: 'center' }}>{message}</p>}
        <table style={{ width: '100%', color: '#fff', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '5px' }}>Exercise</th>
              <th style={{ width: '60px', textAlign: 'center', padding: '5px' }}>Sets</th>
              <th style={{ width: '60px', textAlign: 'center', padding: '5px' }}>Rest</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, idx) => (
              <tr key={idx}>
                <td style={{ padding: '5px' }}>
                  <input
                    type="text"
                    value={ex}
                    onChange={e => updateExercise(idx, e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555', borderRadius: '3px', padding: '4px' }}
                  />
                </td>
                <td style={{ padding: '5px' }}>
                  <input
                    type="number"
                    value={sets[idx]}
                    onChange={e => updateSet(idx, e.target.value)}
                    min="1"
                    style={{ width: '50px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555', borderRadius: '3px', padding: '4px', textAlign: 'center' }}
                  />
                </td>
                <td style={{ padding: '5px' }}>
                  <input
                    type="number"
                    value={rests[idx]}
                    onChange={e => updateRest(idx, e.target.value)}
                    min="0"
                    style={{ width: '50px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #555', borderRadius: '3px', padding: '4px', textAlign: 'center' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button onClick={handleSave} className="butLog" style={{ background: '#00ff37', color: '#000' }}>Save Changes</button>
        </div>
      </div>
    );
  }

  return null;
}
