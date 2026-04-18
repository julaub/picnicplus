// js/components/participants.js
import { state } from '../state.js';

const AVATAR_COLORS = ['#0E7A4D','#E76A2C','#8E5CC2','#1F6FB8','#C94A3A','#0A5A3A','#B88515','#4F6B8A','#D9527E'];
const RSVP_CYCLE = ['going', 'maybe', 'declined', 'pending'];
const RSVP_LABELS = { going: 'Going', maybe: 'Maybe', declined: 'Declined', pending: 'Invited' };

const rsvpState = new Map(); // participantId → rsvp status

const initials = (name) => name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

export const initParticipants = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const render = () => {
        container.innerHTML = '';
        const participants = state.participants || [];

        // ── Header ──
        const header = document.createElement('div');
        header.className = 'pp-header';
        header.innerHTML = `
            <div class="pp-header-row">
                <div>
                    <div class="pp-subtitle" style="color:var(--green-700);text-transform:uppercase;letter-spacing:.06em;font-size:11px;font-weight:700;">Who's Coming</div>
                    <h1 class="pp-title">Guest list</h1>
                    <div class="pp-subtitle" style="margin-top:4px;">Tap a status pill to cycle it</div>
                </div>
            </div>`;
        container.appendChild(header);

        // ── Avatar stack summary ──
        const counts = { going: 0, maybe: 0, pending: 0 };
        participants.forEach(p => {
            const rs = rsvpState.get(p.id) || (p.role === 'organizer' ? 'going' : 'pending');
            if (rs === 'going') counts.going++;
            else if (rs === 'maybe') counts.maybe++;
            else counts.pending++;
        });

        const stackWrap = document.createElement('div');
        stackWrap.className = 'pp-avatar-stack';

        const avatarRow = document.createElement('div');
        avatarRow.className = 'pp-avatar-row';
        participants.slice(0, 5).forEach((p, i) => {
            const av = document.createElement('div');
            av.className = 'pp-avatar';
            av.style.cssText = `background:${AVATAR_COLORS[i % AVATAR_COLORS.length]};margin-left:${i === 0 ? 0 : -10}px;border:2.5px solid var(--bg);width:34px;height:34px;font-size:12px;`;
            av.textContent = initials(p.name);
            avatarRow.appendChild(av);
        });

        const countText = document.createElement('div');
        countText.style.cssText = 'font-size:13px;color:var(--ink-700);font-weight:500;';
        countText.innerHTML = `<b style="color:var(--ink-900)">${counts.going}</b> going · <b style="color:var(--ink-900)">${counts.maybe}</b> maybe · <b style="color:var(--ink-900)">${counts.pending}</b> pending`;

        stackWrap.appendChild(avatarRow);
        stackWrap.appendChild(countText);
        container.appendChild(stackWrap);

        // ── Guest list card ──
        const card = document.createElement('div');
        card.className = 'pp-guest-list-card';
        card.style.marginTop = '14px';

        if (participants.length === 0) {
            card.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--ink-400);font-size:14px;">No guests yet. Share the invite link to get started.</div>`;
        } else {
            participants.forEach((p, idx) => {
                const isMe = state.currentUser && p.id === state.currentUser.id;
                const colorIdx = idx % AVATAR_COLORS.length;

                if (!rsvpState.has(p.id)) {
                    rsvpState.set(p.id, p.role === 'organizer' ? 'going' : 'pending');
                }

                const row = document.createElement('div');
                row.className = 'pp-guest-row';

                const av = document.createElement('div');
                av.className = 'pp-avatar';
                av.style.background = AVATAR_COLORS[colorIdx];
                av.textContent = initials(p.name);

                const body = document.createElement('div');
                body.className = 'pp-guest-body';
                body.innerHTML = `
                    <div class="pp-guest-name">${p.name}${isMe ? ' <span style="font-size:11px;color:var(--ink-400);font-weight:500;">(You)</span>' : ''}</div>
                    <div class="pp-guest-handle">${p.role === 'organizer' ? '👑 Organizer' : '@' + p.name.toLowerCase().replace(/\s+/g, '')}</div>`;

                const rsvpStatus = rsvpState.get(p.id);
                const pill = document.createElement('button');
                pill.className = `pp-rsvp ${rsvpStatus}`;
                pill.textContent = RSVP_LABELS[rsvpStatus];
                pill.addEventListener('click', () => {
                    const curr = rsvpState.get(p.id);
                    const next = RSVP_CYCLE[(RSVP_CYCLE.indexOf(curr) + 1) % RSVP_CYCLE.length];
                    rsvpState.set(p.id, next);
                    pill.className = `pp-rsvp ${next}`;
                    pill.textContent = RSVP_LABELS[next];
                    // update summary counts
                    const newCounts = { going: 0, maybe: 0, pending: 0 };
                    participants.forEach(q => {
                        const rs = rsvpState.get(q.id) || 'pending';
                        if (rs === 'going') newCounts.going++;
                        else if (rs === 'maybe') newCounts.maybe++;
                        else newCounts.pending++;
                    });
                    countText.innerHTML = `<b style="color:var(--ink-900)">${newCounts.going}</b> going · <b style="color:var(--ink-900)">${newCounts.maybe}</b> maybe · <b style="color:var(--ink-900)">${newCounts.pending}</b> pending`;
                });

                row.appendChild(av);
                row.appendChild(body);
                row.appendChild(pill);
                card.appendChild(row);
            });
        }
        container.appendChild(card);

        // ── CTA ──
        const ctaWrap = document.createElement('div');
        ctaWrap.style.cssText = 'padding:14px 16px 0;';
        const cta = document.createElement('button');
        cta.className = 'pp-cta secondary';
        cta.style.position = 'static';
        cta.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Invite guests`;
        cta.addEventListener('click', () => {
            if (state.picnicId) {
                const url = `${window.location.origin}${window.location.pathname}#picnic=${state.picnicId}`;
                if (navigator.share) navigator.share({ title: 'Join my picnic!', url });
                else navigator.clipboard.writeText(url).then(() => {
                    cta.textContent = 'Link copied!';
                    setTimeout(() => { cta.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Invite guests`; }, 2000);
                });
            } else {
                document.querySelector('.pp-nav-item[data-target="view-map"]')?.click();
            }
        });
        ctaWrap.appendChild(cta);
        container.appendChild(ctaWrap);

        // padding at bottom
        const spacer = document.createElement('div');
        spacer.style.height = '24px';
        container.appendChild(spacer);
    };

    render();
    window.addEventListener('stateUpdated', (e) => {
        if (e.detail.topic === 'participants' || e.detail.topic === 'all') render();
    });
};
