export const searchLocation = async (locationName, map, statusUpdate) => {
    if (!locationName) return;

    statusUpdate(`Searching for "${locationName}"...`, 'loading');

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
            const location = data[0];
            map.setView([location.lat, location.lon], 14, {
                animate: true,
                duration: 1.5
            });
            statusUpdate(`Found "${location.display_name}". Ready to explore.`, 'success');
        } else {
            statusUpdate(`Couldn't find "${locationName}".`, 'error');
        }
    } catch (error) {
        statusUpdate(`Error searching: ${error.message}`, 'error');
        console.error("Location search error:", error);
    }
};
