// js/utils/ics.js
export const downloadICS = (eventTitle, dateText, timeText) => {
    // Parse the dateText ("Mon, Oct 16" format) to a more standard string
    // This is a naive parse assuming current year, for robust prod use a library
    const currentYear = new Date().getFullYear();
    const cleanDate = dateText.replace(/^[A-Za-z]+,?\s+/, ''); // Removes "Mon, "
    const eventDate = new Date(`${cleanDate} ${currentYear} ${timeText}`);

    // If the parsed date is in the past by more than a month, it probably meant next year
    if (eventDate < new Date() && (new Date() - eventDate) > 30 * 24 * 60 * 60 * 1000) {
        eventDate.setFullYear(currentYear + 1);
    }

    const start = eventDate.toISOString().replace(/-|:|\.\d+/g, '');

    // Default 2 hours event
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
    const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Event Finder//EN',
        'BEGIN:VEVENT',
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${eventTitle}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
