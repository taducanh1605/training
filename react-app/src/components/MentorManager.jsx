import React, { useState, useEffect } from 'react';
import { useWorkout } from '../context/WorkoutContext.jsx';
import { getMentorStudents, addMentorStudent, removeMentorStudent } from '../services/api.js';

export default function MentorManager() {
  const { setShowMentorEditor, setShowExerciseEditor } = useWorkout();
  const [students, setStudents] = useState([]);
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const result = await getMentorStudents();
      if (result.success) setStudents(result.students || []);
    } catch (e) {
      setError('Error loading students: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStudent() {
    if (!studentCode.trim()) return;
    try {
      const result = await addMentorStudent(studentCode.trim());
      if (result.success) {
        setStudentCode('');
        loadStudents();
      } else {
        alert('Error adding student: ' + (result.message || 'Unknown error'));
      }
    } catch (e) {
      alert('Error adding student: ' + e.message);
    }
  }

  async function handleRemoveStudent(studentId) {
    if (!confirm('Remove this student?')) return;
    try {
      const result = await removeMentorStudent(studentId);
      if (result.success) loadStudents();
    } catch (e) {
      alert('Error removing student: ' + e.message);
    }
  }

  function handleClose() {
    setShowMentorEditor(false);
    setShowExerciseEditor(false);
  }

  return (
    <div className="mentor-editor-container" style={{ display: 'block', width: '100%', background: 'rgba(0,0,0,0.85)', padding: '15px', borderRadius: '10px', marginBottom: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        <h3 style={{ color: '#fff', margin: 0, fontSize: '18px' }}>Mentor Manager</h3>
        <button onClick={handleClose} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '12px', cursor: 'pointer' }}>X</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
        <input
          type="text"
          value={studentCode}
          onChange={e => setStudentCode(e.target.value)}
          placeholder="Student's mentor code"
          style={{ padding: '6px 8px', borderRadius: '4px', border: 'none', flex: 1, color: '#333', background: '#fff', fontSize: '13px' }}
        />
        <button onClick={handleAddStudent} className="butLog" style={{ padding: '6px 12px', fontSize: '13px' }}>Add</button>
      </div>

      {loading && <p style={{ color: '#fff' }}>Loading...</p>}
      {error && <p style={{ color: '#f00' }}>{error}</p>}

      <div>
        {students.length === 0 && !loading && (
          <p style={{ color: '#ccc', textAlign: 'center' }}>No students yet. Add a student using their mentor code.</p>
        )}
        {students.map(student => (
          <div key={student.id} className="student-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '5px' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{student.name || 'Unknown'}</span>
              {student.email && <span style={{ color: '#ccc', marginLeft: '8px', fontSize: '12px' }}>{student.email}</span>}
            </div>
            <button onClick={() => handleRemoveStudent(student.id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '3px 7px', borderRadius: '3px', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
