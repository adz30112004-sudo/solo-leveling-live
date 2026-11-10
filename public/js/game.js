// Khởi tạo Socket.IO
const socket = io();

// ==========================================
// 1. ÂM THANH GAME (HYBRID WEB AUDIO + SFX)
// ==========================================
const SOUND_FILES = {
    coin: '/assets/sounds/coin.wav',
    fanfare: '/assets/sounds/fanfare.wav',
    thunder: '/assets/sounds/thunder.wav',
    join: '/assets/sounds/join.wav',
    arise_voice: '/assets/sounds/steal_1.wav',
    victory: '/assets/sounds/success_8386.wav'
};

const audioCache = {};
for (const [key, path] of Object.entries(SOUND_FILES)) {
    const a = new Audio(path);
    a.preload = 'auto';
    audioCache[key] = a;
}

function playSound(key) {
    try {
        if (audioCache[key]) {
            const clone = audioCache[key].cloneNode();
            clone.volume = 0.85;
            clone.play().catch(() => {});
        }
    } catch (e) {}
}

// Bộ tạo âm thanh chém kiếm Web Audio cho tốc độ phản hồi cực nhạy
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let sfxCtx = null;

function playSlashSound(isCrit = false) {
    try {
        if (!sfxCtx) sfxCtx = new AudioCtx();
        if (sfxCtx.state === 'suspended') sfxCtx.resume();

        const osc = sfxCtx.createOscillator();
        const gain = sfxCtx.createGain();

        osc.type = isCrit ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(isCrit ? 800 : 450, sfxCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, sfxCtx.currentTime + 0.08);

        gain.gain.setValueAtTime(isCrit ? 0.25 : 0.12, sfxCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, sfxCtx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(sfxCtx.destination);

        osc.start();
        osc.stop(sfxCtx.currentTime + 0.09);
    } catch (e) {}
}

// ==========================================
// 2. CANVAS HẠT VẾT CHÉM KIẾM (SLASH PARTICLES)
// ==========================================
const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = 430;
    canvas.height = 764;
}
resizeCanvas();

const slashes = [];
function addSlashParticle(x, y, color = '#00ffff') {
    const angle = (Math.random() - 0.5) * Math.PI * 0.8;
    const len = Math.random() * 40 + 30;
    slashes.push({
        x, y,
        len,
        angle,
        color,
        life: 1.0
    });
}

function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3 * s.life;
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.color;
        ctx.globalAlpha = s.life;

        ctx.beginPath();
        ctx.moveTo(-s.len / 2, 0);
        ctx.lineTo(s.len / 2, 0);
        ctx.stroke();
        ctx.restore();

        s.life -= 0.08;
        if (s.life <= 0) slashes.splice(i, 1);
    }

    requestAnimationFrame(renderCanvas);
}
renderCanvas();

// ==========================================
// 3. UI ELEMENTS & FLOATING DAMAGE
// ==========================================
const bossHpBarFill = document.getElementById('boss-hp-bar-fill');
const bossHpBarDelay = document.getElementById('boss-hp-bar-delay');
const bossHpText = document.getElementById('boss-hp-text');
const bossNameEl = document.getElementById('boss-name');
const bossTitleEl = document.getElementById('boss-title');
const bossSpriteEl = document.getElementById('boss-sprite');
const gateNameEl = document.getElementById('gate-name');
const gateRankBadgeEl = document.getElementById('gate-rank-badge');
const damageContainer = document.getElementById('damage-container');
const dpsListEl = document.getElementById('dps-list');
const shadowListEl = document.getElementById('shadow-list');
const huntersFieldEl = document.getElementById('hunters-field');
const toastContainer = document.getElementById('toast-container');
const ariseScreen = document.getElementById('arise-screen');
const victoryBanner = document.getElementById('victory-banner');
const bossContainer = document.getElementById('boss-container');
const topHunterAvatar = document.getElementById('top-hunter-avatar');
const topHunterName = document.getElementById('top-hunter-name');
const topHunterDiamonds = document.getElementById('top-hunter-diamonds');

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function updateHpBar(current, max) {
    const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
    bossHpBarFill.style.width = pct + '%';
    setTimeout(() => {
        if (bossHpBarDelay) bossHpBarDelay.style.width = pct + '%';
    }, 250);
    bossHpText.innerText = `${formatNumber(current)} / ${formatNumber(max)} (${pct}%)`;
}

function updateStageInfo(stage, currentHp, maxHp) {
    if (!stage) return;
    bossNameEl.innerText = stage.bossName.toUpperCase();
    bossTitleEl.innerText = stage.bossTitle;
    gateNameEl.innerText = stage.name.toUpperCase();
    gateRankBadgeEl.innerText = `HẠNG ${stage.rank}`;
    if (stage.bossImage) {
        bossSpriteEl.src = stage.bossImage;
    }
    updateHpBar(currentHp, maxHp);
}

function spawnDamageNumber(damage, type = 'normal', nickname = '') {
    const el = document.createElement('div');
    el.className = `dmg-number ${type}`;

    // Tọa độ ngẫu nhiên quanh thân Boss
    const left = 32 + (Math.random() - 0.5) * 40;
    const top = 38 + (Math.random() - 0.5) * 30;
    el.style.left = left + '%';
    el.style.top = top + '%';

    if (type === 'arise') {
        el.innerHTML = `🔥 ARISE! -${formatNumber(damage)}`;
    } else if (type === 'crit') {
        el.innerHTML = `⚡ CRIT! -${formatNumber(damage)}`;
    } else {
        el.innerHTML = `-${formatNumber(damage)}`;
    }

    damageContainer.appendChild(el);
    setTimeout(() => el.remove(), 900);

    // Bắn vệt chém trên canvas
    const cx = (canvas.width * left) / 100;
    const cy = (canvas.height * (top + 15)) / 100;
    const color = type === 'arise' ? '#a855f7' : (type === 'crit' ? '#ffd700' : '#00ffff');
    addSlashParticle(cx, cy, color);
}

function flashBossHit() {
    if (!bossSpriteEl) return;
    bossSpriteEl.classList.remove('boss-hit');
    void bossSpriteEl.offsetWidth; // trigger reflow
    bossSpriteEl.classList.add('boss-hit');
    setTimeout(() => {
        bossSpriteEl.classList.remove('boss-hit');
    }, 90);
}

// Quản lý hàng ngũ thợ săn chiến đấu (avatar khán giả)
const activeHunters = new Map();

function addOrUpdateHunter(player) {
    if (!player || !huntersFieldEl) return;

    if (!activeHunters.has(player.uniqueId)) {
        const item = document.createElement('div');
        item.className = 'hunter-soldier';
        item.id = `hunter_${player.uniqueId}`;
        item.innerHTML = `
            <div class="soldier-avatar-wrap">
                <img class="soldier-avatar rank-${player.rank.toLowerCase()}" src="${player.avatar}">
                <span class="soldier-rank-badge">${player.rank}</span>
            </div>
            <span class="soldier-name">${player.nickname}</span>
        `;
        huntersFieldEl.prepend(item);
        activeHunters.set(player.uniqueId, item);

        // Giữ tối đa 8 avatar trên hàng ngũ
        while (huntersFieldEl.children.length > 8) {
            const last = huntersFieldEl.lastElementChild;
            if (last) {
                const uid = last.id.replace('hunter_', '');
                activeHunters.delete(uid);
                last.remove();
            }
        }
    } else {
        const item = activeHunters.get(player.uniqueId);
        // Nhảy nhẹ khi chém
        item.style.transform = 'translateY(-6px) scale(1.1)';
        setTimeout(() => {
            item.style.transform = 'translateY(0) scale(1.0)';
        }, 120);
    }
}

// Quản lý hàng đợi Toast quà tặng
const toastQueue = [];
let isShowingToast = false;

function enqueueToast(player, giftName, giftIcon, diamonds) {
    toastQueue.push({ player, giftName, giftIcon, diamonds });
    if (!isShowingToast) showNextToast();
}

function showNextToast() {
    if (toastQueue.length === 0) {
        isShowingToast = false;
        return;
    }
    isShowingToast = true;
    const item = toastQueue.shift();

    const t = document.createElement('div');
    t.className = 'gift-toast';
    t.innerHTML = `
        <img class="toast-avatar" src="${item.player.avatar}">
        <div class="toast-text">
            <b>${item.player.nickname}</b> tặng <b>${item.giftName}</b> (${item.diamonds}💎)
        </div>
        <img class="toast-gift-icon" src="${item.giftIcon}">
    `;
    toastContainer.appendChild(t);

    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'scale(0.8)';
        setTimeout(() => t.remove(), 200);
        setTimeout(showNextToast, 350);
    }, 2800);
}

// Cập nhật Bảng xếp hạng
function renderLeaderboards(topDps, topDonators) {
    if (dpsListEl && topDps) {
        if (topDps.length === 0) {
            dpsListEl.innerHTML = '<div class="dps-item empty">Chưa có thợ săn...</div>';
        } else {
            dpsListEl.innerHTML = topDps.map((p, idx) => `
                <div class="dps-item">
                    <span>${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : '🥉')}</span>
                    <img class="dps-item-avatar" src="${p.avatar}">
                    <span class="dps-item-name">${p.nickname}</span>
                    <span class="dps-item-pct">${formatNumber(p.totalDamage)}</span>
                </div>
            `).join('');
        }
    }

    if (topHunterAvatar && topDonators && topDonators.length > 0) {
        const top1 = topDonators[0];
        topHunterAvatar.src = top1.avatar;
        topHunterName.innerText = top1.nickname;
        topHunterDiamonds.innerText = `${formatNumber(top1.totalDiamonds)} 💎`;
    }
}

function renderShadowArmy(shadowArmy) {
    if (!shadowListEl) return;
    if (!shadowArmy || shadowArmy.length === 0) {
        shadowListEl.innerHTML = '<div class="shadow-item empty">Chờ lệnh ARISE...</div>';
    } else {
        shadowListEl.innerHTML = shadowArmy.slice(0, 3).map(s => `
            <div class="shadow-item">
                <img class="shadow-item-avatar" src="${s.avatar}">
                <span class="dps-item-name" style="color: #e9d5ff;">${s.nickname}</span>
                <span style="font-size: 8px; color: gold; font-weight: 900;">👑 Hạng S</span>
            </div>
        `).join('');
    }
}

// ==========================================
// 4. LẮNG NGHE SỰ KIỆN TỪ GAME SERVER
// ==========================================
socket.on('init_game_state', (data) => {
    updateStageInfo(data.stage, data.bossCurrentHp, data.bossMaxHp);
    renderLeaderboards(data.topDps, data.topDonators);
    renderShadowArmy(data.shadowArmy);
    if (data.isBossDefeated) {
        victoryBanner.classList.remove('hidden');
    }
});

socket.on('boss_damaged', (data) => {
    updateHpBar(data.bossCurrentHp, data.bossMaxHp);
    flashBossHit();

    let type = 'normal';
    if (data.actionType === 'gift') {
        type = (data.giftName && data.giftName.includes('Hạc')) ? 'arise' : 'crit';
        playSound(data.damage >= 100000 ? 'thunder' : 'coin');
        if (data.giftName) {
            enqueueToast(data.player, data.giftName, data.giftIcon, data.giftDiamonds || 1);
        }
    } else {
        playSlashSound(Math.random() > 0.7);
    }

    spawnDamageNumber(data.damage, type, data.player.nickname);
    addOrUpdateHunter(data.player);
});

socket.on('leaderboard_updated', (data) => {
    renderLeaderboards(data.topDps, data.topDonators);
});

// Sự kiện ARISE (TRỖI DẬY) 99+ xu
socket.on('arise_activated', (data) => {
    playSound('arise_voice');
    setTimeout(() => playSound('thunder'), 300);

    const heroImg = document.getElementById('arise-hero-avatar');
    const heroName = document.getElementById('arise-hero-name');
    if (heroImg) heroImg.src = data.player.avatar;
    if (heroName) heroName.innerText = data.player.nickname;

    ariseScreen.classList.remove('hidden');
    setTimeout(() => {
        ariseScreen.classList.add('hidden');
    }, 3800);
});

// Sự kiện Boss bị hạ gục
socket.on('boss_defeated', (data) => {
    playSound('victory');
    victoryBanner.classList.remove('hidden');
    const vicKiller = document.getElementById('vic-killer');
    if (vicKiller) {
        vicKiller.innerText = `🗡️ Đòn Kết Liễu: @${data.killer.nickname} (Hạng ${data.killer.rank})`;
    }
});

socket.on('stage_countdown', (data) => {
    const el = document.getElementById('vic-next-gate');
    if (el) el.innerHTML = `Cổng Tiếp Theo Mở Trong: <b>${data.countdown}s</b>`;
});

socket.on('new_stage_started', (data) => {
    victoryBanner.classList.add('hidden');
    updateStageInfo(data.stage, data.bossCurrentHp, data.bossMaxHp);
    renderLeaderboards(data.topDps, data.topDonators);
    playSound('fanfare');
});

socket.on('boss_reset', (data) => {
    victoryBanner.classList.add('hidden');
    updateStageInfo(data.stage, data.bossCurrentHp, data.bossMaxHp);
});

socket.on('play_sound_effect', (soundName) => {
    playSound(soundName);
});
