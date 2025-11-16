// Exercise Management Functions
// Dedicated file for managing exercise editing and customization

// const API_BASE = 'https://pika-proxy.taducanhbkhn.workers.dev/port/52445';
const EXERCISE_STORAGE_KEY = 'training.editedExercises';

// Navigation state
let currentExerciseData = {};
let currentNavigationLevel = 'levels'; // 'levels' -> 'workouts' -> 'exercises'
let currentLevelKey = null;
let currentWorkoutKey = null;

// Calculate workout time estimate
function calculateWorkoutTimeEstimate(workoutData) {
    if (!workoutData || !Array.isArray(workoutData) || workoutData.length < 3) {
        return 0;
    }
    
    const [exercises, rounds, restTimes] = workoutData;
    let totalTime = 0;
    
    exercises.forEach((exercise, index) => {
        const exerciseRounds = rounds[index] || 1;
        const restTime = restTimes[index] || 0;
        
        // Count movements in this exercise (split by +)
        const movements = exercise.split('+');
        const movementCount = movements.length;
        
        // Each movement takes average 3 seconds
        const exerciseTime = movementCount * 60; // 90s for each movement
        
        // Total time for all rounds of this exercise
        const totalExerciseTime = exerciseTime * exerciseRounds;
        
        // 20s buffer per round + rest time after this exercise (except for last exercise)
        const bufferTime = exerciseRounds * 20;
        const postExerciseRest = (index < exercises.length - 1) ? restTime : 0;
        
        totalTime += totalExerciseTime + bufferTime + postExerciseRest;
    });
    
    return totalTime; // in seconds
}

// Format time in seconds to readable format
function formatTimeEstimate(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.floor((seconds % 3600) / 60);
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
}

// Helper function to make API calls with authentication
async function callExerciseAPI(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    
    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    let result = await response.json();
    
    // Handle error responses
    if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return result;
}

// Get user's current exercises
async function getUserExercises() {
    try {
        const result = await callExerciseAPI('/api/user/exercises', 'GET');
        return result;
    } catch (error) {
        console.error('Get user exercises error:', error);
        throw error;
    }
}

// Update user's exercises
async function updateUserExercises(exerciseData) {
    try {
        const result = await callExerciseAPI('/api/user/exercises', 'PUT', exerciseData);
        return result;
    } catch (error) {
        console.error('Update user exercises error:', error);
        throw error;
    }
}

// Show exercise editor form
function showExerciseEditor() {
    // Hide row3 and row4 content
    const row3Elements = document.querySelectorAll('.row3, .row4-regular, .row4-break');
    const row4Elements = document.querySelectorAll('[class*="row4"]');
    
    row3Elements.forEach(el => el.style.display = 'none');
    row4Elements.forEach(el => el.style.display = 'none');
    
    // Show exercise editor form
    const exerciseEditor = document.getElementById('exercise-editor-container');
    if (exerciseEditor) {
        exerciseEditor.style.display = 'block';
        loadCurrentExercisesForEdit();
        
        // Auto scroll to exercise editor
        setTimeout(() => {
            exerciseEditor.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }
}

// Hide exercise editor form
function hideExerciseEditor() {
    // Hide exercise editor form
    const exerciseEditor = document.getElementById('exercise-editor-container');
    if (exerciseEditor) {
        exerciseEditor.style.display = 'none';
    }
    
    // Check if mentor editor is open - if so, don't show row3/row4
    const mentorEditor = document.getElementById('mentor-editor-container');
    const isMentorEditorOpen = mentorEditor && mentorEditor.style.display === 'block';
    
    // Only show row3 and row4 content if mentor editor is not open
    if (!isMentorEditorOpen) {
        const row3Elements = document.querySelectorAll('.row3, .row4-regular, .row4-break');
        const row4Elements = document.querySelectorAll('[class*="row4"]');
        
        row3Elements.forEach(el => el.style.display = '');
        row4Elements.forEach(el => el.style.display = '');
    }
}

// Load current exercises for editing (from localStorage first, then ProgUsers)
function loadCurrentExercisesForEdit() {
    try {
        // Check localStorage first
        let exerciseData = getLocalStorageExercises();
        
        if (!exerciseData) {
            // Load from inputCSV.dataUsers (ProgUsers)
            exerciseData = inputCSV.dataUsers;
            console.log('Loading exercises from ProgUsers:', exerciseData);
        } else {
            console.log('Loading exercises from localStorage:', exerciseData);
        }
        
        if (exerciseData && Object.keys(exerciseData).length > 0) {
            currentExerciseData = exerciseData;
            displayNavigationExerciseEditor();
        } else {
            // If no data available, show message
            const exerciseList = document.getElementById('exercise-list');
            if (exerciseList) {
                exerciseList.innerHTML = `
                    <div style="text-align: center; color: #fff; padding: 20px;">
                        <p>No workout data found. Please select a workout first or login to access your custom exercises.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading exercises for edit:', error);
        alert('Error loading exercises: ' + error.message);
    }
}

// ====== LOCALSTORAGE MANAGEMENT ======

// Get exercises from localStorage
function getLocalStorageExercises() {
    try {
        const stored = localStorage.getItem(EXERCISE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error parsing localStorage exercises:', error);
        return null;
    }
}

// Save exercises to localStorage
function saveToLocalStorage(exercises) {
    try {
        localStorage.setItem(EXERCISE_STORAGE_KEY, JSON.stringify(exercises));
        console.log('Exercises saved to localStorage');
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

// Clear localStorage exercises
function clearLocalStorageExercises() {
    localStorage.removeItem(EXERCISE_STORAGE_KEY);
    console.log('localStorage exercises cleared');
}

// ====== ADVANCED EXERCISE EDITOR ======

// Display advanced exercise editor with full editing capabilities
function displayAdvancedExerciseEditor(exercises) {
    const exerciseList = document.getElementById('exercise-list');
    if (!exerciseList) return;
    
    exerciseList.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #00ff37;">Advanced Exercise Editor</h4>
            <p style="color: #ccc; font-size: 14px;">Edit level names, workout names, exercises, reps, rounds, and rest times.</p>
        </div>
    `;
    
    Object.keys(exercises).forEach(levelKey => {
        const levelDiv = createLevelEditor(levelKey, exercises[levelKey]);
        exerciseList.appendChild(levelDiv);
    });
    
    // Add button to create new level
    const addLevelBtn = document.createElement('button');
    addLevelBtn.textContent = '+ Add New Level';
    addLevelBtn.className = 'butLog';
    addLevelBtn.style.cssText = 'background: #ff8c00; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;';
    addLevelBtn.onclick = () => addNewLevel();
    exerciseList.appendChild(addLevelBtn);
}

// Create level editor
function createLevelEditor(levelKey, levelData) {
    const levelDiv = document.createElement('div');
    levelDiv.className = 'level-editor';
    levelDiv.style.cssText = 'margin-bottom: 30px; border: 2px solid #00ff37; border-radius: 10px; padding: 15px; background: rgba(0,0,0,0.3);';
    
    // Level name editor
    const levelHeader = document.createElement('div');
    levelHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #00ff37; padding-bottom: 10px;';
    
    const levelNameInput = document.createElement('input');
    levelNameInput.type = 'text';
    levelNameInput.value = levelKey;
    levelNameInput.style.cssText = 'flex: 1; padding: 8px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; font-size: 16px;';
    levelNameInput.dataset.originalKey = levelKey;
    levelNameInput.oninput = () => markAsModified();
    
    const deleteLevelBtn = document.createElement('button');
    deleteLevelBtn.textContent = 'Delete Level';
    deleteLevelBtn.style.cssText = 'background: #ff4444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-left: 10px;';
    deleteLevelBtn.onclick = () => deleteLevelElement(levelDiv, levelKey);
    
    levelHeader.appendChild(levelNameInput);
    levelHeader.appendChild(deleteLevelBtn);
    levelDiv.appendChild(levelHeader);
    
    // Workouts in this level
    const workoutsDiv = document.createElement('div');
    workoutsDiv.className = 'workouts-container';
    
    Object.keys(levelData).forEach(workoutKey => {
        const workoutDiv = createWorkoutEditor(workoutKey, levelData[workoutKey]);
        workoutsDiv.appendChild(workoutDiv);
    });
    
    levelDiv.appendChild(workoutsDiv);
    
    // Add workout button
    const addWorkoutBtn = document.createElement('button');
    addWorkoutBtn.textContent = '+ Add Workout';
    addWorkoutBtn.style.cssText = 'background: #00a2ff; color: #fff; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-top: 10px;';
    addWorkoutBtn.onclick = () => addNewWorkoutAdvanced(workoutsDiv);
    levelDiv.appendChild(addWorkoutBtn);
    
    return levelDiv;
}

// Create workout editor
function createWorkoutEditor(workoutKey, workoutData) {
    const [exercises, rounds, restTimes] = workoutData;
    const timeEstimate = calculateWorkoutTimeEstimate(workoutData);
    
    const workoutDiv = document.createElement('div');
    workoutDiv.className = 'workout-editor';
    workoutDiv.style.cssText = 'margin-bottom: 20px; border: 1px solid #666; border-radius: 8px; padding: 12px; background: rgba(255,255,255,0.05);';
    
    // Workout name editor
    const workoutHeader = document.createElement('div');
    workoutHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;';
    
    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; flex-direction: column; flex: 1; gap: 5px;';
    
    const workoutNameInput = document.createElement('input');
    workoutNameInput.type = 'text';
    workoutNameInput.value = workoutKey;
    workoutNameInput.style.cssText = 'padding: 6px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 4px; font-weight: bold;';
    workoutNameInput.dataset.originalKey = workoutKey;
    workoutNameInput.oninput = () => markAsModified();
    
    const timeEstimateText = document.createElement('div');
    timeEstimateText.textContent = `⏱️ Estimate: ${formatTimeEstimate(timeEstimate)}`;
    timeEstimateText.style.cssText = 'color: #ffaa00; font-size: 12px; font-weight: bold;';
    
    headerLeft.appendChild(workoutNameInput);
    headerLeft.appendChild(timeEstimateText);
    
    const deleteWorkoutBtn = document.createElement('button');
    deleteWorkoutBtn.textContent = '×';
    deleteWorkoutBtn.style.cssText = 'background: #ff4444; color: #fff; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; margin-left: 10px; font-size: 16px;';
    deleteWorkoutBtn.onclick = () => deleteWorkout(workoutDiv);
    
    workoutHeader.appendChild(headerLeft);
    workoutHeader.appendChild(deleteWorkoutBtn);
    workoutDiv.appendChild(workoutHeader);
    
    // Exercises editor
    const exercisesDiv = document.createElement('div');
    exercisesDiv.className = 'exercises-container';
    
    exercises.forEach((exercise, index) => {
        const exerciseRow = createExerciseRow(exercise, rounds[index], restTimes[index], index);
        exercisesDiv.appendChild(exerciseRow);
    });
    
    workoutDiv.appendChild(exercisesDiv);
    
    // Add exercise button
    const addExerciseBtn = document.createElement('button');
    addExerciseBtn.textContent = '+ Add Exercise';
    addExerciseBtn.style.cssText = 'background: #666; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px;';
    addExerciseBtn.onclick = () => addNewExerciseRow(exercisesDiv);
    workoutDiv.appendChild(addExerciseBtn);
    
    return workoutDiv;
}

// Create exercise row editor
function createExerciseRow(exerciseString, rounds, restTime, index) {
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.style.cssText = 'display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 6px;';
    
    // Exercise movements (split by +)
    const movementsDiv = document.createElement('div');
    const movements = exerciseString.split('+');
    
    movements.forEach((movement, idx) => {
        const movementRow = createMovementInputRow(movement.trim());
        movementsDiv.appendChild(movementRow);
    });
    
    // Add movement button
    const addMovementBtn = document.createElement('button');
    addMovementBtn.textContent = '+ Movement';
    addMovementBtn.style.cssText = 'background: #888; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 5px;';
    addMovementBtn.onclick = () => addMovement(movementsDiv);
    movementsDiv.appendChild(addMovementBtn);
    
    row.appendChild(movementsDiv);
    
    // Bottom section with rounds, rest time and delete button
    const bottomSection = document.createElement('div');
    bottomSection.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);';
    
    // Rounds and rest time container
    const roundsRestDiv = document.createElement('div');
    roundsRestDiv.style.cssText = 'display: flex; align-items: center; gap: 20px; flex-wrap: wrap;';
    
    // Rounds section
    const roundsSection = document.createElement('div');
    roundsSection.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    
    const roundsLabel = document.createElement('label');
    roundsLabel.textContent = 'Round:';
    roundsLabel.style.cssText = 'color: #fff; font-size: 13px; white-space: nowrap;';
    
    const roundsInput = document.createElement('input');
    roundsInput.type = 'number';
    roundsInput.className = 'rounds-input';
    roundsInput.value = rounds;
    roundsInput.min = '1';
    roundsInput.style.cssText = 'width: 50px; padding: 5px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 3px; font-size: 13px;';
    roundsInput.oninput = () => markAsModified();
    
    roundsSection.appendChild(roundsLabel);
    roundsSection.appendChild(roundsInput);
    
    // Break time section
    const breakSection = document.createElement('div');
    breakSection.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    
    const breakLabel = document.createElement('label');
    breakLabel.textContent = 'BreakTime:';
    breakLabel.style.cssText = 'color: #fff; font-size: 13px; white-space: nowrap;';
    
    const restInput = document.createElement('input');
    restInput.type = 'number';
    restInput.className = 'rest-input';
    restInput.value = restTime;
    restInput.min = '0';
    restInput.style.cssText = 'width: 50px; padding: 5px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 3px; font-size: 13px;';
    restInput.oninput = () => markAsModified();
    
    const secondsLabel = document.createElement('span');
    secondsLabel.textContent = 's';
    secondsLabel.style.cssText = 'color: #ccc; font-size: 13px;';
    
    breakSection.appendChild(breakLabel);
    breakSection.appendChild(restInput);
    breakSection.appendChild(secondsLabel);
    
    roundsRestDiv.appendChild(roundsSection);
    roundsRestDiv.appendChild(breakSection);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = 'background: #ff4444; color: #fff; border: none; width: 35px; height: 35px; border-radius: 4px; cursor: pointer; font-size: 16px; flex-shrink: 0;';
    deleteBtn.onclick = () => deleteExerciseRow(row);
    
    bottomSection.appendChild(roundsRestDiv);
    bottomSection.appendChild(deleteBtn);
    row.appendChild(bottomSection);
    
    return row;
}

// ====== SHARED HELPER FUNCTIONS (Used by both Advanced Editor and Navigation Interface) ======

// Add new movement to an exercise (works for both UI systems)
function addMovement(movementsDiv) {
    // Find the add movement button (should be a direct child)
    const button = Array.from(movementsDiv.children).find(child => 
        child.tagName === 'BUTTON' && child.textContent.includes('+ Movement')
    );
    
    // Create new movement input row with default values
    const newMovementRow = createMovementInputRow('New Exercise x10');
    
    // Insert before the "Add Movement" button, or append if button not found
    if (button && button.parentNode === movementsDiv) {
        movementsDiv.insertBefore(newMovementRow, button);
    } else {
        // Fallback: append to the end if button not found or not a direct child
        movementsDiv.appendChild(newMovementRow);
    }
    
    // Focus on the exercise name input for better UX
    const nameInput = newMovementRow.querySelector('input[type="text"]');
    if (nameInput) {
        nameInput.focus();
        nameInput.select();
    }
    
    markAsModified();
}

// Advanced Editor: Add new exercise row to exercises container
function addNewExerciseRow(exercisesDiv) {
    // Create exercise row with default values: name, rounds=3, rest=60s
    const newRow = createExerciseRow('New Exercise x10', 3, 60, -1);
    exercisesDiv.appendChild(newRow);
    markAsModified();
}

// Advanced Editor: Add new workout to a specific DOM container
function addNewWorkoutAdvanced(workoutsDiv) {
    // Create workout editor component with default exercise
    const newWorkout = createWorkoutEditor('New Workout', [['New Exercise x10'], [3], [60]]);
    workoutsDiv.appendChild(newWorkout);
    markAsModified();
}

// Advanced Editor: Add new level with DOM manipulation (creates visual editor)
function addNewLevelAdvanced() {
    const exerciseList = document.getElementById('exercise-list');
    const lastButton = exerciseList.querySelector('button:last-child');
    
    // Create a new level editor component with default workout
    const newLevel = createLevelEditor('New Level', {'New Workout': [['New Exercise x10'], [3], [60]]});
    
    // Insert before the last button (usually "Add Level" button)
    if (lastButton && lastButton.parentNode === exerciseList) {
        exerciseList.insertBefore(newLevel, lastButton);
    } else {
        // Fallback: append to the end if button not found or not a direct child
        exerciseList.appendChild(newLevel);
    }
    
    markAsModified();
}

function deleteLevelElement(levelDiv, levelKey) {
    if (confirm(`Are you sure you want to delete level "${levelKey}"?`)) {
        levelDiv.remove();
        markAsModified();
    }
}

function deleteWorkout(workoutDiv) {
    if (confirm('Are you sure you want to delete this workout?')) {
        workoutDiv.remove();
        markAsModified();
    }
}

function deleteExerciseRow(row) {
    if (confirm('Are you sure you want to delete this exercise?')) {
        row.remove();
        markAsModified();
    }
}

// Mark exercise data as modified (visual indicator for both Advanced Editor and Navigation Interface)
function markAsModified() {
    // Try to find save button by onclick attribute (Advanced Editor)
    let saveBtn = document.querySelector('button[onclick="submitExerciseChanges()"]');
    
    // If not found, try to find by ID (Navigation Interface)
    if (!saveBtn) {
        saveBtn = document.getElementById('save-changes-btn');
    }
    
    if (saveBtn) {
        saveBtn.style.background = '#ff6600';
        saveBtn.textContent = 'Save Changes *';
    }
}

// Load default exercises (use original ProgUsers data)
function loadDefaultExercises() {
    try {
        // Clear any localStorage modifications
        clearLocalStorageExercises();
        
        // Reload from original data (before modifications)
        let baseData = inputCSV.dataUsers;
        
        // If no ProgUsers data, try to load from gender-based files
        if (!baseData || Object.keys(baseData).length === 0) {
            alert('No base exercise data available. Please login and select a workout first.');
            return;
        }
        
        // Display the base data in editor
        displayAdvancedExerciseEditor(baseData);
        
        console.log('Loaded default exercises from ProgUsers');
    } catch (error) {
        console.error('Error loading default exercises:', error);
        alert('Error loading default exercises: ' + error.message);
    }
}

// Display exercises in the editor interface
function displayExercisesInEditor(exercises) {
    const exerciseList = document.getElementById('exercise-list');
    if (!exerciseList) return;
    
    exerciseList.innerHTML = '';
    
    // Group exercises by category (e.g., Level 0, Level 1, etc.)
    Object.keys(exercises).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'exercise-category';
        categoryDiv.style.marginBottom = '20px';
        categoryDiv.style.border = '1px solid #444';
        categoryDiv.style.borderRadius = '8px';
        categoryDiv.style.padding = '15px';
        categoryDiv.style.background = 'rgba(0,0,0,0.3)';
        
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category;
        categoryHeader.style.color = '#00ff37';
        categoryHeader.style.marginBottom = '15px';
        categoryHeader.style.borderBottom = '1px solid #00ff37';
        categoryHeader.style.paddingBottom = '5px';
        categoryDiv.appendChild(categoryHeader);
        
        const workouts = exercises[category];
        Object.keys(workouts).forEach(workoutName => {
            const workoutDiv = document.createElement('div');
            workoutDiv.className = 'workout-item';
            workoutDiv.style.marginBottom = '15px';
            workoutDiv.style.padding = '12px';
            workoutDiv.style.background = 'rgba(255,255,255,0.1)';
            workoutDiv.style.borderRadius = '5px';
            workoutDiv.style.border = '1px solid rgba(255,255,255,0.2)';
            
            const workoutHeader = document.createElement('h5');
            workoutHeader.textContent = workoutName;
            workoutHeader.style.color = '#fff';
            workoutHeader.style.marginBottom = '10px';
            workoutHeader.style.fontSize = '16px';
            workoutDiv.appendChild(workoutHeader);
            
            const exercisesArray = workouts[workoutName];
            exercisesArray.forEach((exercise, index) => {
                const exerciseRow = document.createElement('div');
                exerciseRow.style.display = 'flex';
                exerciseRow.style.alignItems = 'center';
                exerciseRow.style.marginBottom = '8px';
                
                const exerciseInput = document.createElement('input');
                exerciseInput.type = 'text';
                exerciseInput.value = exercise;
                exerciseInput.style.flex = '1';
                exerciseInput.style.padding = '8px';
                exerciseInput.style.color = '#000';
                exerciseInput.style.backgroundColor = '#fff';
                exerciseInput.style.border = '1px solid #ccc';
                exerciseInput.style.borderRadius = '4px';
                exerciseInput.style.marginRight = '10px';
                exerciseInput.dataset.category = category;
                exerciseInput.dataset.workout = workoutName;
                exerciseInput.dataset.index = index;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '×';
                deleteBtn.style.background = '#ff4444';
                deleteBtn.style.color = '#fff';
                deleteBtn.style.border = 'none';
                deleteBtn.style.borderRadius = '4px';
                deleteBtn.style.width = '30px';
                deleteBtn.style.height = '30px';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.style.fontSize = '16px';
                deleteBtn.title = 'Delete exercise';
                deleteBtn.onclick = () => deleteExercise(exerciseRow, category, workoutName, index);
                
                exerciseRow.appendChild(exerciseInput);
                exerciseRow.appendChild(deleteBtn);
                workoutDiv.appendChild(exerciseRow);
            });
            
            // Add "Add Exercise" button for each workout
            const addExerciseBtn = document.createElement('button');
            addExerciseBtn.textContent = '+ Add Exercise';
            addExerciseBtn.style.background = '#00a2ff';
            addExerciseBtn.style.color = '#fff';
            addExerciseBtn.style.border = 'none';
            addExerciseBtn.style.borderRadius = '4px';
            addExerciseBtn.style.padding = '6px 12px';
            addExerciseBtn.style.cursor = 'pointer';
            addExerciseBtn.style.marginTop = '8px';
            addExerciseBtn.onclick = () => addNewExercise(workoutDiv, category, workoutName);
            
            workoutDiv.appendChild(addExerciseBtn);
            categoryDiv.appendChild(workoutDiv);
        });
        
        exerciseList.appendChild(categoryDiv);
    });
}

// Add new exercise to a workout
function addNewExercise(workoutDiv, category, workoutName) {
    const exerciseInputs = workoutDiv.querySelectorAll('input');
    const newIndex = exerciseInputs.length;
    
    const exerciseRow = document.createElement('div');
    exerciseRow.style.display = 'flex';
    exerciseRow.style.alignItems = 'center';
    exerciseRow.style.marginBottom = '8px';
    
    const exerciseInput = document.createElement('input');
    exerciseInput.type = 'text';
    exerciseInput.value = 'New Exercise x10';
    exerciseInput.style.flex = '1';
    exerciseInput.style.padding = '8px';
    exerciseInput.style.color = '#000';
    exerciseInput.style.backgroundColor = '#fff';
    exerciseInput.style.border = '1px solid #ccc';
    exerciseInput.style.borderRadius = '4px';
    exerciseInput.style.marginRight = '10px';
    exerciseInput.dataset.category = category;
    exerciseInput.dataset.workout = workoutName;
    exerciseInput.dataset.index = newIndex;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.background = '#ff4444';
    deleteBtn.style.color = '#fff';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.width = '30px';
    deleteBtn.style.height = '30px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontSize = '16px';
    deleteBtn.title = 'Delete exercise';
    deleteBtn.onclick = () => deleteExercise(exerciseRow, category, workoutName, newIndex);
    
    exerciseRow.appendChild(exerciseInput);
    exerciseRow.appendChild(deleteBtn);
    
    // Insert before the "Add Exercise" button
    const addBtn = workoutDiv.querySelector('button');
    if (addBtn && addBtn.parentNode === workoutDiv) {
        workoutDiv.insertBefore(exerciseRow, addBtn);
    } else {
        // Fallback: append to the end if button not found or not a direct child
        workoutDiv.appendChild(exerciseRow);
    }
    
    // Focus on the new input
    exerciseInput.focus();
    exerciseInput.select();
}

// Delete an exercise
function deleteExercise(exerciseRow, category, workoutName, index) {
    if (confirm('Are you sure you want to delete this exercise?')) {
        exerciseRow.remove();
        // Update indices of remaining exercises in the same workout
        updateExerciseIndices(category, workoutName);
    }
}

// Update exercise indices after deletion
function updateExerciseIndices(category, workoutName) {
    const inputs = document.querySelectorAll(`input[data-category="${category}"][data-workout="${workoutName}"]`);
    inputs.forEach((input, index) => {
        input.dataset.index = index;
    });
}

// Submit exercise changes
async function submitExerciseChanges() {
    try {
        // Collect data from advanced editor
        const updatedExercises = collectExerciseData();
        
        if (!updatedExercises || Object.keys(updatedExercises).length === 0) {
            alert('No exercise data to save');
            return;
        }
        
        console.log('Submitting exercise changes:', updatedExercises);
        
        // Save to localStorage first
        saveToLocalStorage(updatedExercises);
        
        try {
            // Try to update server
            const result = await updateUserExercises({ exercises: updatedExercises });
            
            if (result.success) {
                // Server update successful, clear localStorage
                clearLocalStorageExercises();
                
                // Update inputCSV.dataUsers with new data
                inputCSV.dataUsers = updatedExercises;
                inputCSV.listProgUsers = json2ListProg(updatedExercises);
                
                hideExerciseEditor();
                alert('Exercise plan updated successfully!');
                
                // Refresh to show changes
                setTimeout(() => {
                    window.location.reload(true);
                }, 500);
            } else {
                alert('Server update failed, changes saved locally: ' + (result.message || 'Unknown error'));
                console.log('Changes kept in localStorage for retry');
            }
        } catch (serverError) {
            console.error('Server update failed:', serverError);
            alert('Server update failed, changes saved locally. Will retry on next startup.');
            
            // Update local data immediately
            inputCSV.dataUsers = updatedExercises;
            inputCSV.listProgUsers = json2ListProg(updatedExercises);
            
            hideExerciseEditor();
        }
    } catch (error) {
        console.error('Error submitting exercise changes:', error);
        alert('Error updating exercises: ' + error.message);
    }
}

// Collect exercise data from the advanced editor
function collectExerciseData() {
    const exerciseList = document.getElementById('exercise-list');
    if (!exerciseList) return null;
    
    const updatedExercises = {};
    
    // Get all level editors
    const levelEditors = exerciseList.querySelectorAll('.level-editor');
    
    levelEditors.forEach(levelEditor => {
        const levelNameInput = levelEditor.querySelector('input[data-original-key]');
        if (!levelNameInput) return;
        
        const levelName = levelNameInput.value.trim();
        if (!levelName) return;
        
        updatedExercises[levelName] = {};
        
        // Get all workout editors in this level
        const workoutEditors = levelEditor.querySelectorAll('.workout-editor');
        
        workoutEditors.forEach(workoutEditor => {
            const workoutNameInput = workoutEditor.querySelector('input[data-original-key]');
            if (!workoutNameInput) return;
            
            const workoutName = workoutNameInput.value.trim();
            if (!workoutName) return;
            
            const exercises = [];
            const rounds = [];
            const restTimes = [];
            
            // Get all exercise rows in this workout
            const exerciseRows = workoutEditor.querySelectorAll('.exercise-row');
            
            exerciseRows.forEach(row => {
                // Get movements from movement rows
                const movementsDiv = row.children[0];
                const movementRows = movementsDiv.querySelectorAll('.movement-input-row');
                
                const movements = [];
                movementRows.forEach(movementRow => {
                    const inputs = movementRow.querySelectorAll('input');
                    if (inputs.length >= 2) {
                        const nameInput = inputs[0];  // Exercise name
                        const repsInput = inputs[1];  // Reps
                        
                        const name = nameInput.value.trim();
                        const reps = repsInput.value.trim();
                        
                        if (name && reps) {
                            movements.push(`${name} x${reps}`);
                        }
                    }
                });
                
                // Get rounds and rest from the rounds/rest section
                const roundsInput = row.querySelector('.rounds-input');
                const restInput = row.querySelector('.rest-input');
                
                if (movements.length > 0) {
                    const exerciseString = movements.join(' +');
                    const roundsValue = parseInt(roundsInput?.value) || 1;
                    const restValue = parseInt(restInput?.value) || 0;
                    
                    exercises.push(exerciseString);
                    rounds.push(roundsValue);
                    restTimes.push(restValue);
                }
            });
            
            if (exercises.length > 0) {
                updatedExercises[levelName][workoutName] = [exercises, rounds, restTimes];
            }
        });
    });
    
    return updatedExercises;
}

// Reset exercises to default
async function resetToDefaultExercises() {
    if (confirm('Are you sure you want to reset to default exercises? All your customizations will be lost.')) {
        try {
            // Clear localStorage customizations
            clearLocalStorageExercises();
            
            // Try to get default exercises from server or fallback to original data
            try {
                // Option 1: Try to get default/base exercises from server
                const result = await callExerciseAPI('/api/user/exercises/default', 'GET');
                if (result.success && result.exercises) {
                    currentExerciseData = result.exercises;
                    displayNavigationExerciseEditor();
                    alert('Exercises reset to default successfully!');
                    return;
                }
            } catch (serverError) {
                console.log('No default exercises on server, using local fallback');
            }
            
            // Option 2: Fallback to original inputCSV.dataUsers (if available)
            if (window.inputCSV && window.inputCSV.dataUsers && Object.keys(window.inputCSV.dataUsers).length > 0) {
                currentExerciseData = JSON.parse(JSON.stringify(window.inputCSV.dataUsers)); // Deep copy
                displayNavigationExerciseEditor();
                alert('Exercises reset to original data successfully!');
                return;
            }
            
            // Option 3: Last resort - reload page to get fresh data
            alert('Resetting to default exercises... The page will refresh.');
            setTimeout(() => {
                window.location.reload(true);
            }, 500);
            
        } catch (error) {
            console.error('Error resetting exercises:', error);
            alert('Error resetting exercises: ' + error.message);
        }
    }
}

// ====== STARTUP CHECK FOR LOCALSTORAGE ======

// Check for pending localStorage exercises and retry upload
async function checkAndRetryLocalStorageExercises() {
    try {
        const pendingExercises = getLocalStorageExercises();
        
        if (pendingExercises) {
            console.log('Found pending exercises in localStorage, attempting to sync with server...');
            
            try {
                const result = await updateUserExercises({ exercises: pendingExercises });
                
                if (result.success) {
                    console.log('Successfully synced localStorage exercises to server');
                    clearLocalStorageExercises();
                    
                    // Update local data
                    inputCSV.dataUsers = pendingExercises;
                    inputCSV.listProgUsers = json2ListProg(pendingExercises);
                } else {
                    console.log('Server sync failed, keeping localStorage data:', result.message);
                    // Use localStorage data locally
                    inputCSV.dataUsers = pendingExercises;
                    inputCSV.listProgUsers = json2ListProg(pendingExercises);
                }
            } catch (error) {
                console.log('Server sync failed, using localStorage data:', error.message);
                // Use localStorage data locally
                inputCSV.dataUsers = pendingExercises;
                inputCSV.listProgUsers = json2ListProg(pendingExercises);
            }
        }
    } catch (error) {
        console.error('Error checking localStorage exercises:', error);
    }
}

// ====== NAVIGATION INTERFACE ======

// Main navigation display function
function displayNavigationExerciseEditor() {
    const exerciseList = document.getElementById('exercise-list');
    if (!exerciseList) return;
    
    // Clear previous content
    exerciseList.innerHTML = '';
    
    // Create header with action buttons
    createActionButtonsHeader(exerciseList);
    
    // Create navigation breadcrumb
    createBreadcrumb(exerciseList);
    
    // Display current level based on navigation state
    switch (currentNavigationLevel) {
        case 'levels':
            displayLevelsView(exerciseList);
            break;
        case 'workouts':
            displayWorkoutsView(exerciseList);
            break;
        case 'exercises':
            displayExercisesView(exerciseList);
            break;
    }
}

// Create action buttons at the top
function createActionButtonsHeader(container) {
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #444;';
    
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    
    const title = document.createElement('h4');
    title.textContent = 'Advanced Exercise Editor';
    title.style.cssText = 'color: #00ff37; margin: 0;';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = hideExerciseEditor;
    closeBtn.style.cssText = 'background: #666; color: #fff; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 18px;';
    
    titleDiv.appendChild(title);
    titleDiv.appendChild(closeBtn);
    headerDiv.appendChild(titleDiv);
    
    // Action buttons row
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;';
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load Base';
    loadBtn.onclick = loadDefaultExercises;
    loadBtn.style.cssText = 'background: #00a2ff; color: #fff; padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;';
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset All';
    resetBtn.onclick = resetToDefaultExercises;
    resetBtn.style.cssText = 'background: #ff6666; color: #fff; padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = hideExerciseEditor;
    cancelBtn.style.cssText = 'background: #888; color: #fff; padding: 8px 12px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.onclick = submitExerciseChanges;
    saveBtn.id = 'save-changes-btn';
    saveBtn.style.cssText = 'background: #00ff37; color: #000; padding: 8px 12px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 13px;';
    
    buttonsDiv.appendChild(loadBtn);
    buttonsDiv.appendChild(resetBtn);
    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(saveBtn);
    
    headerDiv.appendChild(buttonsDiv);
    container.appendChild(headerDiv);
}

// Create breadcrumb navigation
function createBreadcrumb(container) {
    const breadcrumbDiv = document.createElement('div');
    breadcrumbDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 5px;';
    
    const breadcrumbText = document.createElement('div');
    breadcrumbText.style.cssText = 'color: #ccc; font-size: 14px;';
    
    let breadcrumbHTML = '<span style="color: #00ff37; cursor: pointer;" onclick="navigateToLevels()">📁 Levels</span>';
    
    if (currentLevelKey) {
        breadcrumbHTML += ` > <span style="color: #00a2ff; cursor: pointer;" onclick="navigateToWorkouts('${currentLevelKey}')">${currentLevelKey}</span>`;
    }
    
    if (currentWorkoutKey) {
        breadcrumbHTML += ` > <span style="color: #fff;">${currentWorkoutKey}</span>`;
    }
    
    breadcrumbText.innerHTML = breadcrumbHTML;
    breadcrumbDiv.appendChild(breadcrumbText);
    container.appendChild(breadcrumbDiv);
}

// Display levels view
function displayLevelsView(container) {
    const levelsDiv = document.createElement('div');
    levelsDiv.style.cssText = 'margin-bottom: 20px;';
    
    const levelsList = document.createElement('div');
    levelsList.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;';
    
    Object.keys(currentExerciseData).forEach(levelKey => {
        const levelCard = createLevelCard(levelKey);
        levelsList.appendChild(levelCard);
    });
    
    levelsDiv.appendChild(levelsList);
    
    // Add level button
    const addLevelBtn = document.createElement('button');
    addLevelBtn.textContent = '+ Add New Level';
    addLevelBtn.onclick = () => addNewLevelNavigation();
    addLevelBtn.style.cssText = 'background: #ff8c00; color: #fff; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; width: 100%;';
    
    levelsDiv.appendChild(addLevelBtn);
    container.appendChild(levelsDiv);
}

// Create level card
function createLevelCard(levelKey) {
    const card = document.createElement('div');
    card.style.cssText = 'background: rgba(0,255,55,0.1); border: 2px solid #00ff37; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.3s;';
    card.onmouseenter = () => card.style.background = 'rgba(0,255,55,0.2)';
    card.onmouseleave = () => card.style.background = 'rgba(0,255,55,0.1)';
    
    const levelName = document.createElement('h5');
    levelName.textContent = levelKey;
    levelName.style.cssText = 'color: #00ff37; margin: 0 0 10px 0; font-size: 16px;';
    
    const workoutCount = Object.keys(currentExerciseData[levelKey]).length;
    const countText = document.createElement('p');
    countText.textContent = `${workoutCount} workout(s)`;
    countText.style.cssText = 'color: #ccc; margin: 0 0 15px 0; font-size: 14px;';
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: flex; gap: 8px;';
    
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.onclick = (e) => {
        e.stopPropagation();
        navigateToWorkouts(levelKey);
    };
    openBtn.style.cssText = 'flex: 1; background: #00a2ff; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;';
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Name';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        editLevelName(levelKey);
    };
    editBtn.style.cssText = 'flex: 1; background: #888; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteLevel(levelKey);
    };
    deleteBtn.style.cssText = 'background: #ff4444; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;';
    
    buttonsDiv.appendChild(openBtn);
    buttonsDiv.appendChild(editBtn);
    buttonsDiv.appendChild(deleteBtn);
    
    card.appendChild(levelName);
    card.appendChild(countText);
    card.appendChild(buttonsDiv);
    
    // Click on card to open
    card.addEventListener('click', (e) => {
        if (e.target === card || e.target === levelName || e.target === countText) {
            navigateToWorkouts(levelKey);
        }
    });
    
    return card;
}

// Navigation functions
function navigateToLevels() {
    currentNavigationLevel = 'levels';
    currentLevelKey = null;
    currentWorkoutKey = null;
    displayNavigationExerciseEditor();
}

function navigateToWorkouts(levelKey) {
    currentNavigationLevel = 'workouts';
    currentLevelKey = levelKey;
    currentWorkoutKey = null;
    displayNavigationExerciseEditor();
}

function navigateToExercises(levelKey, workoutKey) {
    currentNavigationLevel = 'exercises';
    currentLevelKey = levelKey;
    currentWorkoutKey = workoutKey;
    displayNavigationExerciseEditor();
}

// Display workouts view
function displayWorkoutsView(container) {
    if (!currentLevelKey || !currentExerciseData[currentLevelKey]) return;
    
    const workoutsDiv = document.createElement('div');
    workoutsDiv.style.cssText = 'margin-bottom: 20px;';
    
    const workoutsList = document.createElement('div');
    workoutsList.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;';
    
    Object.keys(currentExerciseData[currentLevelKey]).forEach(workoutKey => {
        const workoutCard = createWorkoutCard(workoutKey);
        workoutsList.appendChild(workoutCard);
    });
    
    workoutsDiv.appendChild(workoutsList);
    
    // Add workout button
    const addWorkoutBtn = document.createElement('button');
    addWorkoutBtn.textContent = '+ Add New Workout';
    addWorkoutBtn.onclick = () => addNewWorkoutNavigation();
    addWorkoutBtn.style.cssText = 'background: #00a2ff; color: #fff; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; width: 100%;';
    
    workoutsDiv.appendChild(addWorkoutBtn);
    container.appendChild(workoutsDiv);
}

// Create workout card
function createWorkoutCard(workoutKey) {
    const workoutData = currentExerciseData[currentLevelKey][workoutKey];
    const exerciseCount = workoutData[0].length;
    const timeEstimate = calculateWorkoutTimeEstimate(workoutData);
    
    const card = document.createElement('div');
    card.style.cssText = 'background: rgba(0,162,255,0.1); border: 2px solid #00a2ff; border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.3s;';
    card.onmouseenter = () => card.style.background = 'rgba(0,162,255,0.2)';
    card.onmouseleave = () => card.style.background = 'rgba(0,162,255,0.1)';
    
    const workoutName = document.createElement('h5');
    workoutName.textContent = workoutKey;
    workoutName.style.cssText = 'color: #00a2ff; margin: 0 0 10px 0; font-size: 16px;';
    
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'margin-bottom: 15px;';
    
    const countText = document.createElement('p');
    countText.textContent = `${exerciseCount} exercise(s)`;
    countText.style.cssText = 'color: #ccc; margin: 0 0 5px 0; font-size: 14px;';
    
    const timeText = document.createElement('p');
    timeText.textContent = `⏱️ Est. ${formatTimeEstimate(timeEstimate)}`;
    timeText.style.cssText = 'color: #ffaa00; margin: 0; font-size: 13px; font-weight: bold;';
    
    infoDiv.appendChild(countText);
    infoDiv.appendChild(timeText);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: flex; gap: 8px;';
    
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Edit';
    openBtn.onclick = (e) => {
        e.stopPropagation();
        navigateToExercises(currentLevelKey, workoutKey);
    };
    openBtn.style.cssText = 'flex: 1; background: #ff8c00; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;';
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Rename';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        editWorkoutName(workoutKey);
    };
    editBtn.style.cssText = 'flex: 1; background: #888; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteWorkout(workoutKey);
    };
    deleteBtn.style.cssText = 'background: #ff4444; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;';
    
    buttonsDiv.appendChild(openBtn);
    buttonsDiv.appendChild(editBtn);
    buttonsDiv.appendChild(deleteBtn);
    
    card.appendChild(workoutName);
    card.appendChild(infoDiv);
    card.appendChild(buttonsDiv);
    
    // Click on card to edit
    card.addEventListener('click', (e) => {
        if (e.target === card || e.target === workoutName || e.target === countText || e.target === timeText || e.target === infoDiv) {
            navigateToExercises(currentLevelKey, workoutKey);
        }
    });
    
    return card;
}

// Display exercises view (detailed editor)
function displayExercisesView(container) {
    if (!currentLevelKey || !currentWorkoutKey || !currentExerciseData[currentLevelKey] || !currentExerciseData[currentLevelKey][currentWorkoutKey]) return;
    
    const workoutData = currentExerciseData[currentLevelKey][currentWorkoutKey];
    const [exercises, rounds, restTimes] = workoutData;
    const timeEstimate = calculateWorkoutTimeEstimate(workoutData);
    
    const exercisesDiv = document.createElement('div');
    exercisesDiv.className = 'exercises-editor';
    exercisesDiv.style.cssText = 'background: rgba(0,0,0,0.3); border: 2px solid #ff8c00; border-radius: 10px; padding: 20px;';
    
    const header = document.createElement('h5');
    header.textContent = `Editing: ${currentWorkoutKey}`;
    header.style.cssText = 'color: #ff8c00; margin: 0 0 10px 0; font-size: 18px; text-align: center;';
    exercisesDiv.appendChild(header);
    
    const timeEstimateDiv = document.createElement('div');
    timeEstimateDiv.textContent = `⏱️ Estimated Time: ${formatTimeEstimate(timeEstimate)}`;
    timeEstimateDiv.style.cssText = 'color: #ffaa00; font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 20px; padding: 8px; background: rgba(255,170,0,0.1); border-radius: 5px;';
    exercisesDiv.appendChild(timeEstimateDiv);
    
    // Exercises list
    const exercisesList = document.createElement('div');
    exercisesList.className = 'exercises-list';
    
    exercises.forEach((exercise, index) => {
        const exerciseRow = createDetailedExerciseRow(exercise, rounds[index], restTimes[index], index);
        exercisesList.appendChild(exerciseRow);
    });
    
    exercisesDiv.appendChild(exercisesList);
    
    // Add exercise button
    const addExerciseBtn = document.createElement('button');
    addExerciseBtn.textContent = '+ Add Exercise';
    addExerciseBtn.onclick = () => addNewExerciseToWorkout();
    addExerciseBtn.style.cssText = 'background: #666; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 15px; width: 100%;';
    
    exercisesDiv.appendChild(addExerciseBtn);
    container.appendChild(exercisesDiv);
}

// Create detailed exercise row
function createDetailedExerciseRow(exerciseString, rounds, restTime, index) {
    const row = document.createElement('div');
    row.className = 'detailed-exercise-row';
    row.dataset.index = index;
    row.style.cssText = 'display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; position: relative;';
    
    // Movements column
    const movementsDiv = document.createElement('div');
    const movements = exerciseString.split('+');
    
    movements.forEach((movement, idx) => {
        const movementRow = createMovementInputRow(movement.trim());
        movementsDiv.appendChild(movementRow);
    });
    
    // Add movement button
    const addMovementBtn = document.createElement('button');
    addMovementBtn.textContent = '+ Movement';
    addMovementBtn.onclick = () => addMovement(movementsDiv);
    addMovementBtn.style.cssText = 'background: #888; color: #fff; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 5px;';
    movementsDiv.appendChild(addMovementBtn);
    
    row.appendChild(movementsDiv);
    
    // Bottom section with rounds, rest time and delete button
    const bottomSection = document.createElement('div');
    bottomSection.style.cssText = 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);';
    
    // Rounds and rest time container
    const roundsRestDiv = document.createElement('div');
    roundsRestDiv.style.cssText = 'display: flex; align-items: center; gap: 20px; flex-wrap: wrap;';
    
    // Rounds section
    const roundsSection = document.createElement('div');
    roundsSection.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    const roundsLabel = document.createElement('label');
    roundsLabel.textContent = 'Round:';
    roundsLabel.style.cssText = 'color: #fff; font-size: 14px; white-space: nowrap;';
    
    const roundsInput = document.createElement('input');
    roundsInput.type = 'number';
    roundsInput.className = 'rounds-input';
    roundsInput.value = rounds;
    roundsInput.min = '1';
    roundsInput.style.cssText = 'width: 60px; padding: 6px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;';
    roundsInput.oninput = () => markAsModified();
    
    roundsSection.appendChild(roundsLabel);
    roundsSection.appendChild(roundsInput);
    
    // Break time section
    const breakSection = document.createElement('div');
    breakSection.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    const breakLabel = document.createElement('label');
    breakLabel.textContent = 'BreakTime:';
    breakLabel.style.cssText = 'color: #fff; font-size: 14px; white-space: nowrap;';
    
    const restInput = document.createElement('input');
    restInput.type = 'number';
    restInput.className = 'rest-input';
    restInput.value = restTime;
    restInput.min = '0';
    restInput.style.cssText = 'width: 60px; padding: 6px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;';
    restInput.oninput = () => markAsModified();
    
    const secondsLabel = document.createElement('span');
    secondsLabel.textContent = 's';
    secondsLabel.style.cssText = 'color: #ccc; font-size: 14px;';
    
    breakSection.appendChild(breakLabel);
    breakSection.appendChild(restInput);
    breakSection.appendChild(secondsLabel);
    
    roundsRestDiv.appendChild(roundsSection);
    roundsRestDiv.appendChild(breakSection);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => deleteExerciseFromWorkout(row);
    deleteBtn.style.cssText = 'background: #ff4444; color: #fff; border: none; width: 40px; height: 40px; border-radius: 4px; cursor: pointer; font-size: 16px; flex-shrink: 0;';
    
    bottomSection.appendChild(roundsRestDiv);
    bottomSection.appendChild(deleteBtn);
    row.appendChild(bottomSection);
    
    return row;
}

// Create movement input row with separate name and reps fields
function createMovementInputRow(movementText) {
    const movementRow = document.createElement('div');
    movementRow.className = 'movement-input-row';
    movementRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 5px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;';
    
    // Parse movement text (e.g., "Push-Up x10" -> name: "Push-Up", reps: "10")
    let exerciseName = '';
    let exerciseReps = '10';
    
    if (movementText.includes(' x')) {
        const parts = movementText.split(' x');
        exerciseName = parts[0].trim();
        exerciseReps = parts[1] ? parts[1].trim() : '10';
    } else {
        exerciseName = movementText || 'New Exercise';
    }
    
    // Exercise name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = exerciseName;
    nameInput.placeholder = 'Exercise name';
    nameInput.style.cssText = 'flex: 1; min-width: 120px; padding: 6px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 3px; font-size: 13px;';
    nameInput.oninput = () => markAsModified();
    
    // "x" label
    const xLabel = document.createElement('span');
    xLabel.textContent = 'x';
    xLabel.style.cssText = 'color: #fff; font-weight: bold; font-size: 14px;';
    
    // Reps input
    const repsInput = document.createElement('input');
    repsInput.type = 'text';
    repsInput.value = exerciseReps;
    repsInput.placeholder = '10';
    repsInput.style.cssText = 'width: 80px; min-width: 60px; padding: 6px; color: #000; background: #fff; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; text-align: center;';
    repsInput.oninput = () => markAsModified();
    
    // Delete movement button
    const deleteMovementBtn = document.createElement('button');
    deleteMovementBtn.textContent = '×';
    deleteMovementBtn.onclick = () => {
        if (movementRow.parentElement.querySelectorAll('.movement-input-row').length > 1) {
            movementRow.remove();
            markAsModified();
        } else {
            alert('Each exercise must have at least one movement');
        }
    };
    deleteMovementBtn.style.cssText = 'background: #ff6666; color: #fff; border: none; width: 25px; height: 25px; border-radius: 3px; cursor: pointer; font-size: 12px; flex-shrink: 0;';
    
    movementRow.appendChild(nameInput);
    movementRow.appendChild(xLabel);
    movementRow.appendChild(repsInput);
    movementRow.appendChild(deleteMovementBtn);
    
    return movementRow;
}

// ====== NAVIGATION INTERFACE HELPER FUNCTIONS ======

// Navigation Interface: Add new exercise to current workout being edited
function addNewExerciseToWorkout() {
    const exercisesList = document.querySelector('.exercises-list');
    if (!exercisesList) return;
    
    // Calculate new index based on existing exercises
    const newIndex = exercisesList.children.length;
    // Create detailed exercise row for navigation interface
    const newRow = createDetailedExerciseRow('New Exercise x10', 3, 60, newIndex);
    exercisesList.appendChild(newRow);
    markAsModified();
}

// Navigation Interface: Delete exercise from current workout
function deleteExerciseFromWorkout(row) {
    if (confirm('Are you sure you want to delete this exercise?')) {
        row.remove();
        markAsModified();
    }
}

// Navigation Interface: Add new level to data structure (prompt-based)
function addNewLevelNavigation() {
    const newLevelName = prompt('Enter new level name:', 'New Level');
    if (newLevelName && newLevelName.trim()) {
        // Add new level to current exercise data with default workout
        currentExerciseData[newLevelName.trim()] = {
            'New Workout': [['New Exercise x10'], [3], [60]]
        };
        markAsModified();
        displayNavigationExerciseEditor(); // Refresh the navigation view
    }
}

// Navigation Interface: Add new workout to current level (prompt-based)
function addNewWorkoutNavigation() {
    const newWorkoutName = prompt('Enter new workout name:', 'New Workout');
    if (newWorkoutName && newWorkoutName.trim() && currentLevelKey) {
        // Add workout to current level with default exercise, rounds, and rest time
        currentExerciseData[currentLevelKey][newWorkoutName.trim()] = [['New Exercise x10'], [3], [60]];
        markAsModified();
        displayNavigationExerciseEditor(); // Refresh the navigation view
    }
}

// Navigation Interface: Edit level name via prompt
function editLevelName(oldName) {
    const newName = prompt('Enter new level name:', oldName);
    if (newName && newName.trim() && newName !== oldName) {
        // Rename level in data structure
        currentExerciseData[newName.trim()] = currentExerciseData[oldName];
        delete currentExerciseData[oldName];
        // Update current navigation state if we're editing the active level
        if (currentLevelKey === oldName) {
            currentLevelKey = newName.trim();
        }
        markAsModified();
        displayNavigationExerciseEditor(); // Refresh view to show changes
    }
}

// Navigation Interface: Edit workout name via prompt
function editWorkoutName(oldName) {
    const newName = prompt('Enter new workout name:', oldName);
    if (newName && newName.trim() && newName !== oldName && currentLevelKey) {
        // Rename workout in current level
        currentExerciseData[currentLevelKey][newName.trim()] = currentExerciseData[currentLevelKey][oldName];
        delete currentExerciseData[currentLevelKey][oldName];
        // Update current navigation state if we're editing the active workout
        if (currentWorkoutKey === oldName) {
            currentWorkoutKey = newName.trim();
        }
        markAsModified();
        displayNavigationExerciseEditor(); // Refresh view to show changes
    }
}

// Navigation Interface: Delete entire level and all its workouts
function deleteLevel(levelKey) {
    if (confirm(`Are you sure you want to delete level "${levelKey}" and all its workouts?`)) {
        delete currentExerciseData[levelKey];
        // If we're currently viewing the deleted level, navigate back to levels view
        if (currentLevelKey === levelKey) {
            navigateToLevels();
        }
        markAsModified();
        displayNavigationExerciseEditor(); // Refresh view
    }
}

// Navigation Interface: Delete workout from current level  
function deleteWorkout(workoutKey) {
    if (confirm(`Are you sure you want to delete workout "${workoutKey}"?`)) {
        delete currentExerciseData[currentLevelKey][workoutKey];
        // Navigate back to workouts view after deletion
        navigateToWorkouts(currentLevelKey);
        markAsModified();
    }
}

// Collect exercise data from navigation interface
function collectNavigationExerciseData() {
    // If we're in exercise edit view, update the current data from form
    if (currentNavigationLevel === 'exercises' && currentLevelKey && currentWorkoutKey) {
        const exercisesList = document.querySelector('.exercises-list');
        if (exercisesList) {
            const exercises = [];
            const rounds = [];
            const restTimes = [];
            
            const rows = exercisesList.querySelectorAll('.detailed-exercise-row');
            rows.forEach(row => {
                // Get movements from each movement row
                const movementRows = row.querySelectorAll('.movement-input-row');
                const movements = [];
                
                movementRows.forEach(movementRow => {
                    const inputs = movementRow.querySelectorAll('input');
                    if (inputs.length >= 2) {
                        const nameInput = inputs[0];  // Exercise name
                        const repsInput = inputs[1];  // Reps
                        
                        const name = nameInput.value.trim();
                        const reps = repsInput.value.trim();
                        
                        if (name && reps) {
                            movements.push(`${name} x${reps}`);
                        }
                    }
                });
                
                // Get rounds and rest from the rounds/rest section
                const roundsInput = row.querySelector('.rounds-input');
                const restInput = row.querySelector('.rest-input');
                
                if (movements.length > 0) {
                    const exerciseString = movements.join(' +');
                    const roundsValue = parseInt(roundsInput?.value) || 1;
                    const restValue = parseInt(restInput?.value) || 0;
                    
                    exercises.push(exerciseString);
                    rounds.push(roundsValue);
                    restTimes.push(restValue);
                }
            });
            
            if (exercises.length > 0) {
                currentExerciseData[currentLevelKey][currentWorkoutKey] = [exercises, rounds, restTimes];
            }
        }
    }
    
    return currentExerciseData;
}

// Submit exercise changes
async function submitExerciseChanges() {
    try {
        // Collect data from navigation interface
        const updatedExercises = collectNavigationExerciseData();
        
        if (!updatedExercises || Object.keys(updatedExercises).length === 0) {
            alert('No exercise data to save');
            return;
        }
        
        console.log('Submitting exercise changes:', updatedExercises);
        
        // Save to localStorage first
        saveToLocalStorage(updatedExercises);
        
        try {
            // Try to update server
            const result = await updateUserExercises({ exercises: updatedExercises });
            
            if (result.success) {
                // Server update successful, clear localStorage
                clearLocalStorageExercises();
                
                // Update inputCSV.dataUsers with new data
                inputCSV.dataUsers = updatedExercises;
                inputCSV.listProgUsers = json2ListProg(updatedExercises);
                
                hideExerciseEditor();
                alert('Exercise plan updated successfully!');
                
                // Refresh to show changes
                setTimeout(() => {
                    window.location.reload(true);
                }, 500);
            } else {
                alert('Server update failed, changes saved locally: ' + (result.message || 'Unknown error'));
                console.log('Changes kept in localStorage for retry');
            }
        } catch (serverError) {
            console.error('Server update failed:', serverError);
            alert('Server update failed, changes saved locally. Will retry on next startup.');
            
            // Update local data immediately
            inputCSV.dataUsers = updatedExercises;
            inputCSV.listProgUsers = json2ListProg(updatedExercises);
            
            hideExerciseEditor();
        }
    } catch (error) {
        console.error('Error submitting exercise changes:', error);
        alert('Error updating exercises: ' + error.message);
    }
}