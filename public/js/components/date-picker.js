// js/components/date-picker.js
// Custom Apple-style date and time picker modal logic

export const requestDateAndTime = () => {
    return new Promise((resolve) => {
        const modal = document.getElementById('date-picker-modal');
        const confirmBtn = document.getElementById('date-picker-confirm');
        const cancelBtn = document.getElementById('date-picker-cancel');
        const dateInput = document.getElementById('apple-date-input');
        const timeInput = document.getElementById('apple-time-input');

        // Reset inputs
        dateInput.value = '';
        timeInput.value = '';

        // Show modal
        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const onConfirm = () => {
            const dateVal = dateInput.value;
            const timeVal = timeInput.value;

            if (!dateVal || !timeVal) {
                // If they don't select both, we could either show an error or just return null
                // For a friendly UX, let's just alert them
                alert('Please select both a date and a time.');
                return;
            }

            // Format the raw YYYY-MM-DD to a nicer string
            const dateObj = new Date(dateVal);
            
            // Adjust for timezone offset to avoid it showing the wrong day natively
            const adjustedDate = new Date(dateObj.getTime() + Math.abs(dateObj.getTimezoneOffset() * 60000));
            
            const formattedDate = adjustedDate.toLocaleDateString(undefined, { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });

            cleanup();
            resolve({ dateText: formattedDate, timeText: timeVal });
        };

        const onCancel = () => {
            cleanup();
            resolve(null);
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
};
