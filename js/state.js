// js/state.js
// Global state and API integration

export const state = {
    picnicId: null,
    picnicDetails: null,
    currentUser: null, // { id, name, role, avatar }
    participants: [],
    potluckItems: []
};

const API_BASE = 'http://localhost:3000/api';

export const dispatchStateUpdate = (topic) => {
    window.dispatchEvent(new CustomEvent('stateUpdated', { detail: { topic } }));
};

// Check for existing picnic in URL
export const checkUrlForPicnic = async () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#picnic=')) {
        const id = hash.replace('#picnic=', '');
        await fetchPicnic(id);
        return true;
    }
    return false;
};

// API: Fetch Picnic
export const fetchPicnic = async (id) => {
    try {
        const res = await fetch(`${API_BASE}/picnics/${id}`);
        if (!res.ok) throw new Error('Picnic not found');
        const data = await res.json();

        state.picnicId = data.id;
        state.picnicDetails = { name: data.name, lat: data.lat, lon: data.lon };
        state.participants = data.participants;
        state.potluckItems = data.potluckItems;

        // Check if I am already a participant in localStorage
        const savedUser = localStorage.getItem(`picnic_user_${id}`);
        if (savedUser) {
            state.currentUser = JSON.parse(savedUser);
        }

        dispatchStateUpdate('all');
        return data;
    } catch (err) {
        console.error(err);
        alert('Could not load picnic.');
        window.location.hash = '';
    }
};

// API: Create Picnic
export const createPicnic = async (name, lat, lon, organizerName) => {
    try {
        const res = await fetch(`${API_BASE}/picnics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, lat, lon, organizerName, avatar: '👑' })
        });
        if (!res.ok) throw new Error('Failed to create picnic');
        const data = await res.json();

        state.picnicId = data.id;
        state.currentUser = { id: data.participantId, name: organizerName, role: 'organizer', avatar: '👑' };
        localStorage.setItem(`picnic_user_${data.id}`, JSON.stringify(state.currentUser));

        window.location.hash = `#picnic=${data.id}`;
        await fetchPicnic(data.id);
        return data.id;
    } catch (err) {
        console.error(err);
        alert('Error creating picnic');
    }
};

// API: Join Picnic
export const joinPicnic = async (name) => {
    if (!state.picnicId) return;
    try {
        const res = await fetch(`${API_BASE}/picnics/${state.picnicId}/participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, avatar: '🥳' })
        });
        if (!res.ok) throw new Error('Failed to join');
        const data = await res.json();

        state.currentUser = data;
        localStorage.setItem(`picnic_user_${state.picnicId}`, JSON.stringify(state.currentUser));

        await fetchPicnic(state.picnicId);
    } catch (err) {
        console.error(err);
        alert('Error joining picnic');
    }
};

// API: Add Potluck Item
export const addPotluckItemApi = async (name) => {
    if (!state.picnicId || !state.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/picnics/${state.picnicId}/potluck`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, addedBy: state.currentUser.name })
        });
        if (!res.ok) throw new Error('Failed to add item');
        await fetchPicnic(state.picnicId);
    } catch (err) {
        console.error(err);
        alert('Error adding item');
    }
};

// API: Claim Potluck Item
export const claimPotluckItemApi = async (itemId) => {
    if (!state.picnicId || !state.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/picnics/${state.picnicId}/potluck/${itemId}/claim`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId: state.currentUser.id })
        });
        if (!res.ok) throw new Error('Failed to claim item');
        await fetchPicnic(state.picnicId);
    } catch (err) {
        console.error(err);
        alert('Error claiming item');
    }
};
