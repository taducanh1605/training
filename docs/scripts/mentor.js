// Mentor Management Functions

// API_BASE is already declared in oauth.js which is loaded before this file

// Global variables for mentor management
let currentStudentsList = [];
let currentSelectedUser = null;
let mentorExerciseData = {};
let currentSelectedStudentId = null;

// Show mentor editor form
function showMentorEditor() {
    // Hide row3 and row4 content
    const row3Elements = document.querySelectorAll('.row3, .row4-regular, .row4-break');
    const row4Elements = document.querySelectorAll('[class*="row4"]');
    
    row3Elements.forEach(el => el.style.display = 'none');
    row4Elements.forEach(el => el.style.display = 'none');
    
    // Hide exercise editor if it's open
    const exerciseEditor = document.getElementById('exercise-editor-container');
    if (exerciseEditor) {
        exerciseEditor.style.display = 'none';
    }
    
    // Show mentor editor form
    const mentorEditor = document.getElementById('mentor-editor-container');
    if (mentorEditor) {
        mentorEditor.style.display = 'block';
        loadMentorData();
        
        // Auto scroll to mentor editor
        setTimeout(() => {
            mentorEditor.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }
}

// Hide mentor editor form and exercise editor
function hideMentorEditor() {
    // Hide mentor editor form
    const mentorEditor = document.getElementById('mentor-editor-container');
    if (mentorEditor) {
        mentorEditor.style.display = 'none';
    }
    
    // Also hide exercise editor
    const exerciseEditor = document.getElementById('exercise-editor-container');
    if (exerciseEditor) {
        exerciseEditor.style.display = 'none';
    }
    
    // Show row3 and row4 content again
    const row3Elements = document.querySelectorAll('.row3, .row4-regular, .row4-break');
    const row4Elements = document.querySelectorAll('[class*="row4"]');
    
    row3Elements.forEach(el => el.style.display = 'block');
    row4Elements.forEach(el => el.style.display = 'block');
}

// Load mentor data (students list and exercise data)
async function loadMentorData() {
    try {
        // Load students list
        await loadStudentsList();
        
    } catch (error) {
        console.error('Error loading mentor data:', error);
        alert('Error loading mentor data: ' + error.message);
    }
}

// Load students list
async function loadStudentsList() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/mentor/students`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (result.success) {
            currentStudentsList = result.students || [];
            displayStudentsList();
        } else {
            console.error('Error loading students:', result.error);
            currentStudentsList = [];
            displayStudentsList();
        }
    } catch (error) {
        console.error('Error loading students:', error);
        currentStudentsList = [];
        displayStudentsList();
    }
}

// Display students list in UI (including "Me")
function displayStudentsList() {
    const studentsListContainer = document.getElementById('students-list');
    if (!studentsListContainer) return;

    let html = '';
    
    // Add "Me" (current user) first
    const currentUserName = localStorage.getItem('training.user_name');
    const currentUserMentorId = localStorage.getItem('training.mentor_code');
    const mentorIdDisplay = currentUserMentorId ? `ID: ${currentUserMentorId}` : 'No mentor ID';
    
    html += `
        <div class="student-item ${currentSelectedUser && currentSelectedUser.user_id === 'self' ? 'selected' : ''}" 
             style="display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 10px 12px !important; margin-bottom: 6px !important; min-height: 40px !important;
             background: ${currentSelectedUser && currentSelectedUser.user_id === 'self' ? '#1a472a' : '#2a2a2a'} !important; 
             border-radius: 5px !important; border-left: 3px solid ${currentSelectedUser && currentSelectedUser.user_id === 'self' ? '#28a745' : '#007bff'} !important; cursor: pointer !important;"
             onclick="selectUserForExerciseEdit('self')">
            <div style="display: flex !important; align-items: center !important; gap: 10px !important;">
                <strong style="color: #fff !important; font-size: 14px !important;">👤 Me - ${currentUserName}</strong>
                <span style="background: #28a745 !important; color: white !important; padding: 2px 6px !important; border-radius: 3px !important; font-size: 10px !important;">
                    MENTOR
                </span>
            </div>
        </div>
    `;
    
    // Add students
    currentStudentsList.forEach(student => {
        const displayName = student.custom_name || student.user_name;
        const originalName = student.user_name;
        const mentorIdInfo = student.mentor_id ? `ID: ${student.mentor_id}` : 'No mentor ID';
        const isSelected = currentSelectedUser && currentSelectedUser.user_id === student.user_id;
        
        html += `
            <div class="student-item ${isSelected ? 'selected' : ''}" 
                 style="display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 10px 12px !important; margin-bottom: 6px !important; min-height: 40px !important;
                 background: ${isSelected ? '#1a472a' : '#2a2a2a'} !important; 
                 border-radius: 5px !important; border-left: 3px solid ${isSelected ? '#28a745' : '#007bff'} !important; cursor: pointer !important;"
                 onclick="selectUserForExerciseEdit(${student.user_id})">
                <div style="flex: 1 !important; display: flex !important; align-items: center !important; gap: 10px !important;">
                    <strong style="color: #fff !important; font-size: 14px !important;">👨‍🎓 ${displayName}</strong>
                    <small style="color: #aaa !important; font-size: 12px !important;">${student.mentor_id}</small>
                </div>
                <div style="display: flex !important; gap: 6px !important;">
                    <button onclick="event.stopPropagation(); editStudentName(${student.user_id}, '${displayName}')" 
                            style="background: #007bff !important; color: white !important; border: none !important; padding: 4px 8px !important; border-radius: 4px !important; font-size: 12px !important; cursor: pointer !important; min-height: 28px !important;" 
                            title="Edit name">✏️</button>
                    <button onclick="event.stopPropagation(); removeStudent(${student.user_id})" 
                            style="background: #dc3545 !important; color: white !important; border: none !important; padding: 4px 8px !important; border-radius: 4px !important; font-size: 12px !important; cursor: pointer !important; min-height: 28px !important;" 
                            title="Remove student">🗑️</button>
                </div>
            </div>
        `;
    });

    if (currentStudentsList.length === 0) {
        html += '<p style="color: #aaa; font-style: italic; margin-top: 8px; font-size: 12px; text-align: center;">No students yet. Click "👤 Me" to edit your exercises.</p>';
    }

    studentsListContainer.innerHTML = html;
}

// Add student
async function addStudent() {
    const codeInput = document.getElementById('student-code-input');
    const studentCode = codeInput.value.trim();
    
    if (!studentCode) {
        alert('Please enter student mentor code');
        return;
    }

    // Basic validation for mentor code format
    if (studentCode.length < 6) {
        alert('Mentor code should be at least 6 characters long');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/mentor/add-student-by-code`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ student_code: studentCode })
        });

        let result;
        try {
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            if (responseText.trim()) {
                result = JSON.parse(responseText);
            } else {
                result = { error: `Empty response from server (HTTP ${response.status})` };
            }
        } catch (parseError) {
            console.error('Parse error:', parseError);
            throw new Error(`HTTP ${response.status}: Invalid JSON response from server`);
        }

        if (response.ok && result && result.success) {
            alert('Student added successfully!');
            codeInput.value = '';
            // Reload students list
            await loadStudentsList();
            // Reload mentor selection
            loadMentorSelection();
        } else {
            // Show detailed error from server
            const errorMessage = (result && result.error) || `HTTP ${response.status}: ${response.statusText}`;
            console.error('Server error details:', result);
            console.error('Response status:', response.status, response.statusText);
            alert('Error adding student: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Error adding student: ' + error.message);
    }
}

// Remove student
async function removeStudent(studentId) {
    if (!confirm('Are you sure you want to remove this student?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/mentor/remove-student/${studentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Student removed successfully!');
            // Reload students list
            await loadStudentsList();
            // Reload mentor selection
            loadMentorSelection();
            
            // If the removed student was selected, clear selection
            if (currentSelectedUser && currentSelectedUser.user_id === studentId) {
                currentSelectedUser = null;

            }
        } else {
            alert('Error removing student: ' + result.error);
        }
    } catch (error) {
        console.error('Error removing student:', error);
        alert('Error removing student: ' + error.message);
    }
}

// Load mentor selection radio buttons
function loadMentorSelection() {
    const mentorSelectionContainer = document.getElementById('mentor-selection');
    if (!mentorSelectionContainer) return;

    // Get current user info
    const currentUserName = localStorage.getItem('training.user_name');
    const currentUserEmail = localStorage.getItem('training.user_email');
    const currentUserMentorId = localStorage.getItem('training.mentor_code'); // mentor_id of current user

    let html = '<p style="color: #fff; margin-bottom: 10px;">Select user to edit exercises:</p>';
    
    // Add current user (mentor)
    const mentorIdDisplay = currentUserMentorId ? `ID: ${currentUserMentorId}` : 'No mentor ID';
    html += `
        <div class="mentor-selection-radio">
            <label>
                <input type="radio" name="mentor-user" value="self" onchange="selectUserForExerciseEdit('self')">
                <strong>Me - ${currentUserName} (${mentorIdDisplay})</strong>
            </label>
        </div>
    `;

    // Add students
    currentStudentsList.forEach(student => {
        const displayName = student.custom_name || student.user_name;
        const studentMentorId = student.mentor_id ? `ID: ${student.mentor_id}` : 'No mentor ID';
        html += `
            <div class="mentor-selection-radio">
                <label>
                    <input type="radio" name="mentor-user" value="${student.user_id}" onchange="selectUserForExerciseEdit(${student.user_id})">
                    ${displayName} - ${student.user_name} (${studentMentorId})
                </label>
            </div>
        `;
    });

    mentorSelectionContainer.innerHTML = html;
}

// Select user for exercise editing
async function selectUserForExerciseEdit(userId) {
    if (userId === 'self') {
        currentSelectedUser = {
            user_id: 'self',
            user_name: localStorage.getItem('training.user_name'),
            user_email: localStorage.getItem('training.user_email')
        };
        
        // Update visual selection in students list to highlight "Me"
        displayStudentsList();
        
        // Restore original save function when editing own exercises
        restoreOriginalSaveFunction();
        
        // Show existing exercise editor below mentor editor (don't hide mentor editor)
        const exerciseEditor = document.getElementById('exercise-editor-container');
        if (exerciseEditor) {
            exerciseEditor.style.display = 'block';
            
            // Call existing loadCurrentExercisesForEdit if available
            if (typeof loadCurrentExercisesForEdit === 'function') {
                await loadCurrentExercisesForEdit();
            }
            
            // Scroll to mentor editor to keep it visible at top
            setTimeout(() => {
                const mentorEditor = document.getElementById('mentor-editor-container');
                if (mentorEditor) {
                    mentorEditor.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 100);
        }
        
    } else {
        // Find student in current list
        const student = currentStudentsList.find(s => s.user_id === parseInt(userId));
        if (student) {
            currentSelectedUser = student;
            
            // Update visual selection in students list
            displayStudentsList();
            
            // Load student exercises in exercise editor
            await loadStudentExercisesForEdit(student);
        }
    }
}

// Load student exercises for editing
async function loadStudentExercisesForEdit(student) {
    const exerciseEditor = document.getElementById('exercise-editor-container');
    if (!exerciseEditor) return;

    try {
        // Show exercise editor
        exerciseEditor.style.display = 'block';
        
        // Show loading message
        const exerciseList = document.getElementById('exercise-list');
        if (exerciseList) {
            exerciseList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h4 style="color: #fff; margin-bottom: 15px;">
                        Loading exercises for: <strong>${student.custom_name || student.user_name}</strong>
                    </h4>
                    <p style="color: #ccc;">Please wait...</p>
                </div>
            `;
        }

        // Load student exercises from API
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/mentor/student-exercises/${student.user_id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (result.success && result.exercises) {
            // Store student exercise data
            mentorExerciseData[student.user_id] = result.exercises;
            
            // Call existing exercise loading function if available
            if (typeof loadCurrentExercisesForEdit === 'function') {
                // Temporarily override the data source for loadCurrentExercisesForEdit
                const originalLocalStorage = localStorage.getItem('training.editedExercises');
                localStorage.setItem('training.editedExercises', JSON.stringify(result.exercises));
                
                // Load exercises using existing function
                await loadCurrentExercisesForEdit();
                
                // Store reference for saving later and setup interceptor
                currentSelectedStudentId = student.user_id;
                setupStudentSaveInterceptor(student);
                
                // Restore original localStorage if it existed
                if (originalLocalStorage) {
                    localStorage.setItem('training.editedExercises', originalLocalStorage);
                } else {
                    localStorage.removeItem('training.editedExercises');
                }
            } else {
                // Fallback: display basic exercise list
                displayBasicExerciseList(result.exercises, student);
            }
        } else if (result.error && result.error.includes('No workout program found')) {
            // Student has no exercises yet, show create option
            displayNoExercisesMessage(student);
        } else {
            // Permission denied or other error
            const errorMessage = result.message || 'Failed to load student exercises';
            if (exerciseList) {
                exerciseList.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <h4 style="color: #ff4444; margin-bottom: 15px;">
                            Error loading exercises for ${student.custom_name || student.user_name}
                        </h4>
                        <p style="color: #ccc;">${errorMessage}</p>
                    </div>
                `;
            }
        }
        
        // Scroll to mentor editor to keep it visible at top
        setTimeout(() => {
            const mentorEditor = document.getElementById('mentor-editor-container');
            if (mentorEditor) {
                mentorEditor.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);

    } catch (error) {
        console.error('Error loading student exercises:', error);
        const exerciseList = document.getElementById('exercise-list');
        if (exerciseList) {
            exerciseList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h4 style="color: #ff4444; margin-bottom: 15px;">
                        Error loading exercises
                    </h4>
                    <p style="color: #ccc;">Network error: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Setup interceptor to redirect exercise saves to student API
function setupStudentSaveInterceptor(student) {
    // Store original submit function if it exists
    if (typeof submitExerciseChanges !== 'undefined' && !window.originalSubmitExerciseChanges) {
        window.originalSubmitExerciseChanges = submitExerciseChanges;
    }
    
    // Override the global submitExerciseChanges function
    window.submitExerciseChanges = async function() {
        console.log('Intercepted save for student:', student.user_id);
        return await saveStudentExerciseChanges(student.user_id);
    };
    
    // Also override save button onclick if it exists
    setTimeout(() => {
        const saveBtn = document.getElementById('save-changes-btn') || document.querySelector('button[onclick*="submitExerciseChanges"]');
        if (saveBtn) {
            saveBtn.onclick = async function() {
                return await saveStudentExerciseChanges(student.user_id);
            };
            // Update button text to show it's for student
            if (saveBtn.textContent && saveBtn.textContent.includes('Save')) {
                saveBtn.textContent = `Save Changes for ${student.custom_name || student.user_name}`;
            }
        }
    }, 500);
}

// Restore original save functions when switching back to mentor
function restoreOriginalSaveFunction() {
    if (window.originalSubmitExerciseChanges) {
        window.submitExerciseChanges = window.originalSubmitExerciseChanges;
    }
    currentSelectedStudentId = null;
    
    // Restore save button
    setTimeout(() => {
        const saveBtn = document.getElementById('save-changes-btn') || document.querySelector('button[onclick*="submitExerciseChanges"]');
        if (saveBtn && saveBtn.textContent && saveBtn.textContent.includes('for ')) {
            saveBtn.textContent = 'Save Changes';
            if (window.originalSubmitExerciseChanges) {
                saveBtn.onclick = window.originalSubmitExerciseChanges;
            }
        }
    }, 100);
}

// Save student exercise changes
async function saveStudentExerciseChanges(studentUserId) {
    const token = localStorage.getItem('token');
    
    try {
        // Get current exercise data from multiple sources
        let exercises = {};
        
        // Method 1: Try collectExerciseData (for advanced editor)
        if (typeof collectExerciseData === 'function') {
            exercises = collectExerciseData();
        }
        
        // Method 2: Try collectNavigationExerciseData (for navigation editor)
        if ((!exercises || Object.keys(exercises).length === 0) && typeof collectNavigationExerciseData === 'function') {
            exercises = collectNavigationExerciseData();
        }
        
        // Method 3: Try localStorage
        if (!exercises || Object.keys(exercises).length === 0) {
            try {
                const storedExercises = localStorage.getItem('training.editedExercises');
                if (storedExercises && storedExercises !== '{}') {
                    exercises = JSON.parse(storedExercises);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        // Method 4: Try getting from inputCSV.dataUsers (global data)
        if ((!exercises || Object.keys(exercises).length === 0) && typeof inputCSV !== 'undefined' && inputCSV.dataUsers) {
            exercises = inputCSV.dataUsers;
        }
        
        // Final validation
        if (!exercises || Object.keys(exercises).length === 0) {
            alert('No exercise data to save! Please make sure exercises are loaded in the editor.');
            return { error: 'No exercise data' };
        }

        const response = await fetch(`${API_BASE}/api/mentor/student-exercises/${studentUserId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ exercises: exercises })
        });

        const result = await response.json();
        
        if (result.success) {
            // Clear localStorage exercises
            localStorage.removeItem('training.editedExercises');
            
            // Reset save button state (remove *)
            const saveBtn = document.getElementById('save-changes-btn') || document.querySelector('button[onclick*="submitExerciseChanges"]');
            if (saveBtn) {
                const originalText = saveBtn.textContent.replace(' *', '');
                saveBtn.textContent = originalText;
                saveBtn.style.background = '#28a745'; // Reset to green
            }
            
            // Call reset functions if available
            if (typeof resetModifiedState === 'function') {
                resetModifiedState();
            }
            
            alert('Student exercises updated successfully!');
            return { success: true };
        } else {
            alert('Error saving student exercises: ' + (result.message || 'Unknown error'));
            return { error: result.message || 'Save failed' };
        }
    } catch (error) {
        console.error('Error saving student exercises:', error);
        alert('Network error while saving: ' + error.message);
        return { error: error.message };
    }
}

// Display basic exercise list (fallback)
function displayBasicExerciseList(exercises, student) {
    const exerciseList = document.getElementById('exercise-list');
    if (!exerciseList) return;

    let html = `
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
            <h4 style="color: #fff; margin: 0 0 15px 0; text-align: center;">
                Exercises for: <strong>${student.custom_name || student.user_name}</strong>
            </h4>
            <p style="color: #ccc; text-align: center; margin-bottom: 15px;">
                Basic view - Full editor integration coming soon
            </p>
    `;

    if (exercises && Object.keys(exercises).length > 0) {
        Object.keys(exercises).forEach(categoryKey => {
            const category = exercises[categoryKey];
            html += `
                <div style="margin-bottom: 15px; border: 1px solid #555; border-radius: 5px;">
                    <div style="background: #333; padding: 10px;">
                        <strong style="color: #fff;">${categoryKey}</strong>
                    </div>
                    <div style="background: #2a2a2a; padding: 10px;">
                        <p style="color: #ccc; margin: 0;">Contains exercise data</p>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<p style="color: #ccc; text-align: center;">No exercises found for this student.</p>`;
    }
    
    html += `</div>`;
    exerciseList.innerHTML = html;
}

// Display no exercises message
function displayNoExercisesMessage(student) {
    const exerciseList = document.getElementById('exercise-list');
    if (!exerciseList) return;

    exerciseList.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h4 style="color: #fff; margin-bottom: 15px;">
                No exercises found for: <strong>${student.custom_name || student.user_name}</strong>
            </h4>
            <p style="color: #ccc; margin-bottom: 15px;">This student hasn't created any exercises yet.</p>
            <p style="color: #aaa; font-size: 12px;">
                You can copy your exercises to this student or create new ones.
            </p>
        </div>
    `;
}

// Edit student name
async function editStudentName(studentId, currentName) {
    const newName = prompt('Enter new name for student:', currentName);
    
    if (newName === null) return; // User cancelled
    if (newName.trim() === '') {
        alert('Name cannot be empty');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/mentor/update-student-name/${studentId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ custom_name: newName.trim() })
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Student name updated successfully!');
            // Reload students list to show updated name
            await loadStudentsList();
            // Reload mentor selection to show updated name
            loadMentorSelection();
        } else {
            alert('Error updating student name: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating student name:', error);
        alert('Error updating student name: ' + error.message);
    }
}

// Initialize mentor editor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize mentor editor if needed

});