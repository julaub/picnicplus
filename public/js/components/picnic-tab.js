import { state, proposeDateApi, toggleVoteApi } from '../state.js';
import { requestDateAndTime } from './date-picker.js';
import { generateQRCodeUrl } from '../utils/qr.js';
import { downloadICS } from '../utils/ics.js';
import { t, tp } from '../i18n.js';

const locationCache = {};

const reverseGeocode = async (lat, lon) => {
    const key = `${lat},${lon}`;
    if (locationCache[key]) return locationCache[key];

    const headers = { 'Accept-Language': navigator.language || 'en' };

    const buildDisplayName = (data) => {
        const addr = data.address || {};
        let placeName = data.name || addr.leisure || addr.park || addr.tourism || addr.amenity || addr.building || addr.road || addr.pedestrian || addr.path || '';
        let cityName = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
        if (placeName && cityName && placeName.toLowerCase() !== cityName.toLowerCase()) return `${placeName} / ${cityName}`;
        return placeName || cityName || null;
    };

    try {
        const res18 = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`, { headers });
        if (!res18.ok) return null;
        const data18 = await res18.json();
        const name18 = buildDisplayName(data18);
        if (data18.name && data18.addresstype !== 'road' && name18) { locationCache[key] = name18; return name18; }

        const res14 = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`, { headers });
        if (res14.ok) {
            const data14 = await res14.json();
            const name14 = buildDisplayName(data14);
            if (name14 && name14.includes(' / ')) { locationCache[key] = name14; return name14; }
        }

        const displayName = name18 || data18.display_name || null;
        locationCache[key] = displayName;
        return displayName;
    } catch (err) {
        console.error('Reverse geocoding error:', err);
        return null;
    }
};

const navTo = (target) => document.querySelector(`.pp-nav-item[data-target="${target}"]`)?.click();

export const initPicnicTab = (containerId) => {
    const container = document.getElementById(containerId);
    const navBtn = document.getElementById('nav-btn-picnic');

    if (!container || !navBtn) return;

    window.addEventListener('stateUpdated', (e) => {
        if (!e.detail || e.detail.topic === 'all' || e.detail.topic === 'potluckItems' || e.detail.topic === 'dates') {
            renderDashboard();
        }
    });
    window.addEventListener('localeChange', renderDashboard);

    const renderDashboard = () => {
        if (!state.picnicId || !state.picnicDetails) {
            navBtn.style.display = 'none';
            return;
        }

        navBtn.style.display = 'flex';

        const { lat, lon } = state.picnicDetails;
        const eventName = state.picnicDetails.name || t('event.fallback_name');

        const participantCount = state.participants ? state.participants.length : 0;
        const going = participantCount;
        const potluckCount = state.potluckItems ? state.potluckItems.length : 0;
        const claimedCount = state.potluckItems ? state.potluckItems.filter(i => i.status === 'covered').length : 0;
        const shareUrl = `${window.location.origin}${window.location.pathname}#picnic=${state.picnicId}`;

        // Countdown to a real date if we have one, else show placeholder
        const firstDate = state.dates && state.dates.length > 0 ? state.dates[0] : null;
        let days = 0, hours = 0, mins = 0, secs = 0;
        let dateLabel = t('event.date_tbd');
        if (firstDate) {
            const target = new Date(`${firstDate.dateText} ${firstDate.timeText}`);
            const diff = target - Date.now();
            if (diff > 0) {
                days  = Math.floor(diff / 86400000);
                hours = Math.floor((diff % 86400000) / 3600000);
                mins  = Math.floor((diff % 3600000) / 60000);
                secs  = Math.floor((diff % 60000) / 1000);
            }
            dateLabel = `${firstDate.dateText} · ${firstDate.timeText}`;
        }

        container.innerHTML = '';

        // ── Header ──
        const header = document.createElement('div');
        header.className = 'pp-header';
        header.innerHTML = `
            <div class="pp-header-row">
                <div>
                    <div class="pp-subtitle" style="color:var(--green-700);text-transform:uppercase;letter-spacing:.06em;font-size:11px;font-weight:700;">${t('event.eyebrow')}</div>
                    <h1 class="pp-title">${eventName}</h1>
                </div>
                <button id="share-event-btn" style="width:40px;height:40px;border-radius:14px;background:#fff;border:1px solid rgba(20,22,19,.06);display:flex;align-items:center;justify-content:center;color:var(--ink-700);box-shadow:var(--shadow-1);flex-shrink:0;">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
            </div>`;
        container.appendChild(header);

        const scroll = document.createElement('div');
        scroll.style.cssText = 'padding-bottom:20px;';

        // ── Hero ──
        const hero = document.createElement('div');
        hero.className = 'pp-event-hero';
        hero.innerHTML = `
            <div class="inner">
                <div class="pp-event-status"><span class="dot"></span> ${t('event.confirmed')}</div>
                <div class="pp-event-name">${eventName}</div>
                <div class="pp-event-meta">${dateLabel}</div>
                <div class="pp-event-countdown">
                    <div class="pp-count-cell"><div class="pp-count-num">${String(days).padStart(2,'0')}</div><div class="pp-count-label">${t('event.countdown_days')}</div></div>
                    <div class="pp-count-cell"><div class="pp-count-num">${String(hours).padStart(2,'0')}</div><div class="pp-count-label">${t('event.countdown_hours')}</div></div>
                    <div class="pp-count-cell"><div class="pp-count-num">${String(mins).padStart(2,'0')}</div><div class="pp-count-label">${t('event.countdown_min')}</div></div>
                    <div class="pp-count-cell"><div class="pp-count-num">${String(secs).padStart(2,'0')}</div><div class="pp-count-label">${t('event.countdown_sec')}</div></div>
                </div>
            </div>`;
        scroll.appendChild(hero);

        // ── Location tile ──
        const locWrap = document.createElement('div');
        locWrap.style.cssText = 'padding:12px 16px 0;';
        const locTile = document.createElement('div');
        locTile.className = 'pp-event-tile';
        locTile.style.cursor = 'pointer';
        locTile.onclick = () => navTo('view-map');
        locTile.innerHTML = `
            <div class="pp-tile-icon" style="background:#FDE8D7;color:var(--sun-700);">📍</div>
            <div class="pp-tile-body">
                <div class="pp-tile-label">${t('event.location')}</div>
                <div class="pp-tile-value" id="event-location-name">${t('event.location_loading')}</div>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--ink-300)" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"/></svg>`;
        locWrap.appendChild(locTile);
        scroll.appendChild(locWrap);

        reverseGeocode(lat, lon).then(name => {
            const el = document.getElementById('event-location-name');
            if (el) el.textContent = name || `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
        });

        // ── Stat row ──
        const statRow = document.createElement('div');
        statRow.className = 'pp-stat-row';
        statRow.innerHTML = `
            <div class="pp-stat"><div class="pp-stat-num">${going}</div><div class="pp-stat-label">${t('event.guests')}</div></div>
            <div class="pp-stat"><div class="pp-stat-num">${potluckCount}</div><div class="pp-stat-label">${t('event.items')}</div></div>
            <div class="pp-stat"><div class="pp-stat-num">${claimedCount}</div><div class="pp-stat-label">${t('event.claimed')}</div></div>`;
        scroll.appendChild(statRow);

        // ── Date options ──
        const dateSection = document.createElement('div');
        dateSection.style.cssText = 'padding:16px 16px 0;';

        const dateSectionTitle = document.createElement('div');
        dateSectionTitle.style.cssText = 'font-size:12px;font-weight:700;color:var(--ink-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;';
        dateSectionTitle.innerHTML = `<span>${t('event.date_options')}</span>`;

        const proposeBtn = document.createElement('button');
        proposeBtn.style.cssText = 'font-size:12px;font-weight:700;color:var(--green-700);background:var(--green-50);border:none;border-radius:8px;padding:4px 10px;cursor:pointer;font-family:inherit;';
        proposeBtn.textContent = t('event.propose');
        proposeBtn.addEventListener('click', async () => {
            const dateResult = await requestDateAndTime();
            if (!dateResult) return;
            proposeBtn.textContent = t('event.proposing');
            await proposeDateApi(dateResult.dateText, dateResult.timeText);
        });
        dateSectionTitle.appendChild(proposeBtn);
        dateSection.appendChild(dateSectionTitle);

        if (!state.dates || state.dates.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:var(--ink-400);font-size:13.5px;padding:12px 14px;background:#fff;border-radius:14px;border:1px solid rgba(20,22,19,.05);box-shadow:var(--shadow-1);';
            empty.textContent = t('event.no_dates');
            dateSection.appendChild(empty);
        } else {
            state.dates.forEach(date => {
                const myVote = state.currentUser ? date.votes.find(v => v.participantId === state.currentUser.id) : null;
                const voteCount = date.votes.length;
                const voters = date.votes.map(v => v.participantName).join(', ');

                const tile = document.createElement('div');
                tile.style.cssText = 'display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:12px 14px;border:1px solid rgba(20,22,19,.05);box-shadow:var(--shadow-1);margin-bottom:8px;';
                const voteText = tp('event.vote_count', voteCount) + (voters ? ' · ' + voters : '');
                tile.innerHTML = `
                    <div style="width:38px;height:38px;border-radius:10px;background:var(--green-50);color:var(--green-700);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;">📅</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:600;color:var(--ink-900);">${date.dateText} · ${date.timeText}</div>
                        <div style="font-size:12px;color:var(--ink-500);margin-top:2px;">${voteText}</div>
                    </div>`;

                const btnWrap = document.createElement('div');
                btnWrap.style.cssText = 'display:flex;gap:6px;align-items:center;';

                const icsBtn = document.createElement('button');
                icsBtn.style.cssText = 'width:32px;height:32px;border-radius:9px;background:var(--ink-100);color:var(--ink-700);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;border:none;';
                icsBtn.textContent = '📅';
                icsBtn.title = t('event.add_to_calendar');
                icsBtn.onclick = () => downloadICS(eventName, date.dateText, date.timeText);

                const voteBtn = document.createElement('button');
                voteBtn.style.cssText = `padding:6px 12px;border-radius:10px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;border:none;${myVote ? 'background:var(--green-700);color:#fff;' : 'background:var(--ink-100);color:var(--ink-700);'}`;
                voteBtn.textContent = myVote ? t('event.voted') : t('event.vote');
                voteBtn.addEventListener('click', async () => {
                    voteBtn.textContent = '…';
                    voteBtn.disabled = true;
                    await toggleVoteApi(date.id);
                });

                btnWrap.appendChild(icsBtn);
                btnWrap.appendChild(voteBtn);
                tile.appendChild(btnWrap);
                dateSection.appendChild(tile);
            });
        }
        scroll.appendChild(dateSection);

        // ── Share CTA ──
        const ctaWrap = document.createElement('div');
        ctaWrap.style.cssText = 'padding:16px 16px 0;';
        const cta = document.createElement('button');
        cta.className = 'pp-cta secondary';
        cta.style.position = 'static';
        const shareIconHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
        cta.innerHTML = `${shareIconHTML} ${t('event.share_link')}`;
        cta.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({ title: eventName, url: shareUrl });
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    cta.textContent = t('event.link_copied');
                    setTimeout(() => { cta.innerHTML = `${shareIconHTML} ${t('event.share_link')}`; }, 2000);
                });
            }
        });
        ctaWrap.appendChild(cta);
        scroll.appendChild(ctaWrap);

        // ── QR Code ──
        const qrWrap = document.createElement('div');
        qrWrap.style.cssText = 'padding:14px 16px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;';
        const qrImg = document.createElement('img');
        qrImg.src = generateQRCodeUrl(shareUrl);
        qrImg.style.cssText = 'border-radius:12px;max-width:130px;background:#fff;padding:6px;box-shadow:var(--shadow-1);';
        const qrLabel = document.createElement('div');
        qrLabel.style.cssText = 'font-size:11.5px;color:var(--ink-400);font-weight:500;';
        qrLabel.textContent = t('event.scan_to_join');
        qrWrap.appendChild(qrImg);
        qrWrap.appendChild(qrLabel);
        scroll.appendChild(qrWrap);

        scroll.style.paddingBottom = '32px';
        container.appendChild(scroll);

        // share button handler
        document.getElementById('share-event-btn')?.addEventListener('click', () => {
            if (navigator.share) navigator.share({ title: eventName, url: shareUrl });
            else navigator.clipboard.writeText(shareUrl);
        });
    };

    renderDashboard();
};
