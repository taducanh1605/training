// Load default exercises (reload original data)
function loadDefaultExercises() {
    try {
        // Clear any localStorage modifications
        clearLocalStorageExercises();
        
        // Reload from original data (before modifications)
        let baseData = inputCSV.dataUsers;
        
        // If no ProgUsers data, try to get it from server again
        if (!baseData || Object.keys(baseData).length === 0) {
            alert('No base exercise data available. Please login and select a workout first.');
            return;
        }
        
        // Reset to base data
        currentExerciseData = JSON.parse(JSON.stringify(baseData)); // Deep copy
        navigateToLevels();
        
        console.log('Loaded default exercises from ProgUsers');
    } catch (error) {
        console.error('Error loading default exercises:', error);
        alert('Error loading default exercises: ' + error.message);
    }
}

// Reset exercises to default
async function resetToDefaultExercises() {
    if (confirm('Are you sure you want to reset to default exercises? All your customizations will be lost.')) {
        try {
            // Clear localStorage
            clearLocalStorageExercises();
            
            // Reset server data
            const result = await callExerciseAPI('/api/user/exercises', 'DELETE');
            if (result.success) {
                alert('Exercises reset to default successfully! The page will refresh.');
                setTimeout(() => {
                    window.location.reload(true);
                }, 500);
            }
        } catch (error) {
            console.error('Error resetting exercises:', error);
            alert('Error resetting exercises: ' + error.message);
        }
    }
}