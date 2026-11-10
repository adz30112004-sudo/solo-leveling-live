// Khởi tạo Socket.IO
const socket = io();

// ==========================================
// HỆ THỐNG ÂM THANH GAME (HYBRID HTML5 AUDIO + BGM LOOP)
// ==========================================
const SOUND_FILES = {
    coin: '/assets/sounds/coin.wav',
    fanfare: '/assets/sounds/fanfare.wav',
    thunder: '/assets/sounds/thunder.wav',
    join: '/assets/sounds/join.wav',
    bgm: '/assets/sounds/bgm.wav',
    success_8386: '/assets/sounds/success_8386.wav',
    steal_1: '/assets/sounds/steal_1.wav',
    steal_2: '/assets/sounds/steal_2.wav'
};

let isAudioUnlocked = false;
let audioMuted = false;
let isBgmPlaying = false;

// BGM Audio element
const bgmAudio = new Audio(SOUND_FILES.bgm);
bgmAudio.loop = true;
bgmAudio.volume = 0.28;

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function unlockAudio(playFeedback = true) {
    isAudioUnlocked = true;
    const banner = document.getElementById('audio-unlock-banner');
    if (banner) banner.style.display = 'none';

    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
        soundBtn.innerHTML = '🔊 Âm Thanh: <b>BẬT</b>';
        soundBtn.style.color = '#00ff88';
    }

    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
    } catch (e) {}

    // Bật nhạc nền BGM lặp lại vui nhộn
    if (!audioMuted && !isBgmPlaying) {
        bgmAudio.play().then(() => {
            isBgmPlaying = true;
        }).catch(err => console.warn('BGM play blocked:', err));
    }

    // Phát ngay tiếng chuông để xác nhận người dùng nghe được ngay lập tức!
    if (playFeedback && !audioMuted) {
        playSoundFile('coin');
    }
}

function toggleAudio() {
    audioMuted = !audioMuted;
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
        if (audioMuted) {
            soundBtn.innerHTML = '🔇 Âm Thanh: <b>TẮT</b>';
            soundBtn.style.color = '#ff4444';
            bgmAudio.pause();
            isBgmPlaying = false;
        } else {
            soundBtn.innerHTML = '🔊 Âm Thanh: <b>BẬT</b>';
            soundBtn.style.color = '#00ff88';
            unlockAudio(true);
        }
    }
}

// Bất kỳ tương tác nào trên trang đều kích hoạt mở khóa âm thanh
['click', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (!isAudioUnlocked) {
            unlockAudio(true);
        }
    }, { once: false });
});

// Hàm phát file âm thanh WAV với volume chuẩn
function playSoundFile(soundKey) {
    if (audioMuted) return;
    const url = SOUND_FILES[soundKey];
    if (!url) return;

    try {
        const audio = new Audio(url);
        audio.volume = soundKey === 'bgm' ? 0.3 : 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn(`HTML5 Audio blocked or error for ${soundKey}:`, err);
                playSynthSound(soundKey);
            });
        }
    } catch (e) {
        console.warn(`HTML5 Audio instantiation error for ${soundKey}:`, e);
        playSynthSound(soundKey);
    }
}

// Fallback Oscillator Synth nếu file WAV bị chặn do Autoplay policy
function playSynthSound(soundKey) {
    if (audioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        if (soundKey === 'coin' || soundKey === 'join') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(soundKey === 'join' ? 523.25 : 987.77, ctx.currentTime);
            osc.frequency.setValueAtTime(soundKey === 'join' ? 783.99 : 1318.51, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } else if (soundKey === 'fanfare') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                gain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
            });
        } else if (soundKey === 'thunder') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.6, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.7);
        }
    } catch (e) {
        console.warn('Synth error:', e);
    }
}

// Các hàm âm thanh nghiệp vụ
function playCoinSound() {
    playSoundFile('coin');
}

function playFanfareSound() {
    playSoundFile('fanfare');
}

function playThunderSound() {
    playSoundFile('thunder');
}

function playJoinSound() {
    playSoundFile('join');
}

function playSuccess8386Sound() {
    playFanfareSound();
    setTimeout(() => {
        playSoundFile('success_8386');
    }, 450);
}

let stealCount = 0;
function playStealVoiceSound(forceKey = null) {
    playThunderSound();
    const key = forceKey || (stealCount % 2 === 0 ? 'steal_1' : 'steal_2');
    stealCount++;
    setTimeout(() => {
        playSoundFile(key);
    }, 450);
}

// Nhận lệnh test âm thanh từ Socket (Admin)
socket.on('play_sound', data => {
    if (data && data.sound) {
        if (!isAudioUnlocked) unlockAudio(false);
        if (data.sound === 'success_8386') {
            playSuccess8386Sound();
        } else if (data.sound === 'steal_1' || data.sound === 'steal_2' || data.sound === 'thunder') {
            playStealVoiceSound(data.sound === 'thunder' ? null : data.sound);
        } else {
            playSoundFile(data.sound);
        }
    }
});

socket.on('toggle_bgm', shouldPlay => {
    if (shouldPlay) {
        unlockAudio(false);
        bgmAudio.play().then(() => isBgmPlaying = true).catch(() => {});
    } else {
        bgmAudio.pause();
        isBgmPlaying = false;
    }
});

// DOM Elements
const maleQueueList = document.getElementById('male-queue-list');
const femaleQueueList = document.getElementById('female-queue-list');
const stageContainer = document.getElementById('stage-container');
const giftToastContainer = document.getElementById('gift-toast-container');
const topLeaderboard = document.getElementById('top-leaderboard');
const tiktokStatusDot = document.getElementById('tiktok-status-dot');
const tiktokStatusText = document.getElementById('tiktok-status-text');

// State
let currentMatchData = null;

// ==========================================
// 1. NHẬN TRẠNG THÁI KHỞI TẠO TỪ SERVER
// ==========================================
let latestMaleQueue = [];
let latestFemaleQueue = [];
let prevQueueCount = 0;

socket.on('init_state', data => {
    latestMaleQueue = data.maleQueue || [];
    latestFemaleQueue = data.femaleQueue || [];
    updateQueues(data.maleQueue, data.femaleQueue);
    updateTopDonators(data.topDonators);
    if (data.currentMatch) {
        renderMatch(data.currentMatch);
    } else {
        renderEmptyStage(data.maleQueue, data.femaleQueue);
    }
    updateTikTokStatus(data.tiktokStatus);
});

socket.on('tiktok_status', status => {
    updateTikTokStatus(status);
});

function updateTikTokStatus(status) {
    if (!status) return;
    if (status.connected) {
        tiktokStatusDot.style.background = '#00ff88';
        tiktokStatusText.innerText = `@${status.username}`;
    } else {
        tiktokStatusDot.style.background = '#ff4444';
        tiktokStatusText.innerText = status.error ? 'Lỗi kết nối' : 'Chưa kết nối';
    }
}

// ==========================================
// 2. CẬP NHẬT HÀNG ĐỢI NAM & NỮ
// ==========================================
socket.on('queue_updated', data => {
    latestMaleQueue = data.maleQueue || [];
    latestFemaleQueue = data.femaleQueue || [];
    const currentCount = (data.maleQueue?.length || 0) + (data.femaleQueue?.length || 0);
    if (currentCount > prevQueueCount && prevQueueCount !== 0) {
        playJoinSound();
    }
    prevQueueCount = currentCount;
    updateQueues(data.maleQueue, data.femaleQueue);
    if (!currentMatchData) {
        renderEmptyStage(data.maleQueue, data.femaleQueue);
    }
});

// Hàm tính toán vị trí đứng đám đông đông đúc, xếp lớp tự nhiên, sát nhau không giới hạn
function getNaturalCrowdSlot(i, gender) {
    const swsys = ['sway-1', 'sway-2', 'sway-3', 'sway-4'];
    const sway = swsys[i % 4];

    // Tier 0 (Hàng đầu tiên sát sân khấu nhất): 2 người
    if (i === 0) return { bottom: 10, offset: 48, scale: 0.96, zIndex: 35, sway };
    if (i === 1) return { bottom: 16, offset: 8,  scale: 0.94, zIndex: 34, sway };

    // Tier 1 (Hàng thứ hai đứng chen vai): 3 người
    if (i === 2) return { bottom: 52, offset: 68, scale: 0.88, zIndex: 28, sway };
    if (i === 3) return { bottom: 58, offset: 32, scale: 0.87, zIndex: 27, sway };
    if (i === 4) return { bottom: 64, offset: 2,  scale: 0.86, zIndex: 26, sway };

    // Tier 2 (Hàng thứ ba đông đúc): 3 người
    if (i === 5) return { bottom: 98, offset: 58, scale: 0.82, zIndex: 22, sway };
    if (i === 6) return { bottom: 104, offset: 18, scale: 0.81, zIndex: 21, sway };
    if (i === 7) return { bottom: 110, offset: 74, scale: 0.80, zIndex: 20, sway };

    // Tier 3 (Hàng thứ tư đông nghẹt): 3 người
    if (i === 8) return { bottom: 142, offset: 36, scale: 0.75, zIndex: 16, sway };
    if (i === 9) return { bottom: 148, offset: 4,  scale: 0.74, zIndex: 15, sway };
    if (i === 10) return { bottom: 154, offset: 66, scale: 0.73, zIndex: 14, sway };

    // Tier 4 (Hàng thứ năm): 4 người
    if (i === 11) return { bottom: 182, offset: 22, scale: 0.68, zIndex: 10, sway };
    if (i === 12) return { bottom: 188, offset: 54, scale: 0.67, zIndex: 9,  sway };
    if (i === 13) return { bottom: 194, offset: 2,  scale: 0.66, zIndex: 8,  sway };
    if (i === 14) return { bottom: 200, offset: 72, scale: 0.65, zIndex: 7,  sway };

    // Tier 5 (Hàng phía xa nhìn về sân khấu): 4 người
    if (i === 15) return { bottom: 224, offset: 38, scale: 0.61, zIndex: 5,  sway };
    if (i === 16) return { bottom: 228, offset: 12, scale: 0.60, zIndex: 4,  sway };
    if (i === 17) return { bottom: 234, offset: 62, scale: 0.59, zIndex: 3,  sway };
    if (i === 18) return { bottom: 240, offset: 28, scale: 0.58, zIndex: 2,  sway };

    // Tier 6+ (Đông kéo dài phía sau):
    const sub = i - 19;
    return {
        bottom: 250 + (sub % 4) * 16,
        offset: 8 + ((i * 37) % 65),
        scale: Math.max(0.52, 0.56 - Math.floor(sub / 4) * 0.02),
        zIndex: Math.max(1, 2),
        sway
    };
}

function updateQueues(males, females) {
    // Cập nhật số lượng trên badge
    const maleBadge = document.querySelector('.queue-badge-male');
    if (maleBadge) maleBadge.innerHTML = `PHÁI NAM (${males?.length || 0}) 🌹`;

    const femaleBadge = document.querySelector('.queue-badge-female');
    if (femaleBadge) femaleBadge.innerHTML = `PHÁI NỮ (${females?.length || 0}) 🎵`;

    // 1. Render Đám đông Phái Nam bên trái (Đông đúc, đứng sát nhau, có tên user)
    if (!males || males.length === 0) {
        maleQueueList.innerHTML = `
            <div class="crowd-empty-hint">
                <div class="empty-ghost-silhouette"></div>
                <div class="empty-hint-text">Chưa có ai<br>🌹 Tặng Hoa</div>
            </div>
        `;
    } else {
        const maxDisplay = 25;
        const visibleMales = males.slice(0, maxDisplay);
        const remaining = males.length - visibleMales.length;
        maleQueueList.innerHTML = visibleMales.map((user, idx) => {
            const slot = getNaturalCrowdSlot(idx, 'male');
            return `
                <div class="crowd-person male-crowd-char ${slot.sway}" style="bottom: ${slot.bottom}px; left: ${slot.offset}px; transform: scale(${slot.scale}); z-index: ${slot.zIndex};">
                    <div class="crowd-nametag-above">
                        <span class="crowd-queue-num">#${idx + 1}</span>
                        <span class="crowd-name-text">${user.nickname}</span>
                    </div>
                    <div class="standing-avatar-head">
                        <img src="${user.avatar}" alt="${user.nickname}">
                    </div>
                    <img class="standing-body-img" src="/assets/male_body.png" alt="Male">
                    <div class="standing-shadow"></div>
                </div>
            `;
        }).join('') + (remaining > 0 ? `<div class="crowd-overflow-badge">+${remaining} bạn nam nữa</div>` : '');
    }

    // 2. Render Đám đông Phái Nữ bên phải (Đông đúc, đứng sát nhau, có tên user)
    if (!females || females.length === 0) {
        femaleQueueList.innerHTML = `
            <div class="crowd-empty-hint">
                <div class="empty-ghost-silhouette"></div>
                <div class="empty-hint-text">Chưa có ai<br>🎵 Tặng TikTok</div>
            </div>
        `;
    } else {
        const maxDisplay = 25;
        const visibleFemales = females.slice(0, maxDisplay);
        const remaining = females.length - visibleFemales.length;
        femaleQueueList.innerHTML = visibleFemales.map((user, idx) => {
            const slot = getNaturalCrowdSlot(idx, 'female');
            return `
                <div class="crowd-person female-crowd-char ${slot.sway}" style="bottom: ${slot.bottom}px; right: ${slot.offset}px; transform: scale(${slot.scale}); z-index: ${slot.zIndex};">
                    <div class="crowd-nametag-above">
                        <span class="crowd-queue-num">#${idx + 1}</span>
                        <span class="crowd-name-text">${user.nickname}</span>
                    </div>
                    <div class="standing-avatar-head">
                        <img src="${user.avatar}" alt="${user.nickname}">
                    </div>
                    <img class="standing-body-img" src="/assets/female_body.png" alt="Female">
                    <div class="standing-shadow"></div>
                </div>
            `;
        }).join('') + (remaining > 0 ? `<div class="crowd-overflow-badge">+${remaining} bạn nữ nữa</div>` : '');
    }
}

// ==========================================
// 3. SÂN KHẤU GHÉP ĐÔI (MATCHMAKING STAGE)
// ==========================================
socket.on('new_match_started', match => {
    currentMatchData = match;
    renderMatch(match);
    playJoinSound();
});

socket.on('match_status_changed', match => {
    currentMatchData = match;
    renderMatch(match);
    playFanfareSound();
    fireConfetti();
});

socket.on('match_countdown', countdown => {
    const countdownEl = document.getElementById('match-countdown');
    if (countdownEl) {
        countdownEl.innerText = `${countdown}s`;
    }
});

socket.on('match_updated', data => {
    const match = data.match || data;
    currentMatchData = match;
    const rateEl = document.getElementById('heart-rate-val');
    if (rateEl) {
        rateEl.innerText = `${match.percentage}%`;
        rateEl.style.transform = 'scale(1.35)';
        rateEl.style.color = data.actionType === 'curse' ? '#0072ff' : '#ff0055';
        setTimeout(() => {
            if (rateEl) {
                rateEl.style.transform = 'scale(1)';
                rateEl.style.color = '#ff0055';
            }
        }, 300);
    }

    // Hiển thị hiệu ứng bay số nổi (+1%, +2%, -4%...)
    if (data.delta) {
        showFloatingDelta(data.delta, data.actionType);
    }
});

function showFloatingDelta(delta, actionType) {
    const stage = document.getElementById('stage-container');
    if (!stage) return;

    const el = document.createElement('div');
    el.className = `floating-delta ${actionType || (delta > 0 ? 'bless' : 'curse')}`;
    const sign = delta > 0 ? `+${delta}%` : `${delta}%`;
    el.innerHTML = delta > 0 ? `💖 ${sign}` : `💔 ${sign}`;
    stage.appendChild(el);

    setTimeout(() => el.remove(), 1200);
}

socket.on('match_finished', match => {
    const statusBox = document.querySelector('.match-status-box');
    if (statusBox) {
        statusBox.classList.add('finished-pink-mode');
        statusBox.innerHTML = `
            <div class="success-8386-box">
                <div style="font-size: 24px; animation: popIn 0.3s;">🎉💍🎉</div>
                <div class="badge-8386">👑 8 3 8 6 👑</div>
                <div class="title-8386">CHÚC HAI BẠN 8 3 8 6</div>
                <div class="subtitle-8386">MÃI ĐỈNH MÃI ĐỈNH LUÔN! 🔥</div>
                <div class="names-8386">${match.male.nickname} 💘 ${match.female.nickname}</div>
                <div class="desc-8386">Tình duyên ${match.percentage}% • Trăm năm viên mãn!</div>
            </div>
        `;
        playSuccess8386Sound();
        fireConfetti();
    }
});

socket.on('match_cleared', () => {
    currentMatchData = null;
    renderEmptyStage(latestMaleQueue, latestFemaleQueue);
});

// Render Lời Mời Tham Gia khi chưa có ai hoặc đang chờ thêm 1 bạn để đủ cặp
function renderEmptyStage(males = latestMaleQueue, females = latestFemaleQueue) {
    if (currentMatchData) return;

    const maleCount = males?.length || 0;
    const femaleCount = females?.length || 0;

    let titleText = 'MỜI THAM GIA NAM HOẶC NỮ';
    let subtitleText = 'ĐỂ BẮT ĐẦU GHÉP ĐÔI';
    let hintText = '⚡ Đủ 1 Nam & 1 Nữ sẽ tự động bước lên bục ghép đôi! ⚡';

    if (maleCount === 0 && femaleCount === 0) {
        titleText = 'MỜI THAM GIA NAM HOẶC NỮ';
        subtitleText = 'ĐỂ BẮT ĐẦU GHÉP ĐÔI';
        hintText = '🌹 Tặng Hoa Hồng (Nam) • 🎵 Tặng TikTok (Nữ)';
    } else if (maleCount > 0 && femaleCount === 0) {
        titleText = `ĐÃ CÓ ${maleCount} BẠN NAM ĐANG CHỜ`;
        subtitleText = 'MỜI BẠN NỮ THAM GIA GHÉP ĐÔI!';
        hintText = '🎵 Tặng TikTok (1 xu) để lên bục ghép đôi ngay!';
    } else if (femaleCount > 0 && maleCount === 0) {
        titleText = `ĐÃ CÓ ${femaleCount} BẠN NỮ ĐANG CHỜ`;
        subtitleText = 'MỜI BẠN NAM THAM GIA GHÉP ĐÔI!';
        hintText = '🌹 Tặng Hoa Hồng (1 xu) để lên bục ghép đôi ngay!';
    }

    stageContainer.innerHTML = `
        <div class="empty-heart-stage-callout">
            <div class="callout-pill-tag">💖 BỤC GHÉP ĐÔI HỒ GƯƠM 💖</div>
            <div class="empty-stage-main-title">${titleText}</div>
            <div class="empty-stage-sub-title">${subtitleText}</div>

            <div class="empty-stage-cta-row">
                <div class="stage-cta-pill male-cta ${maleCount > 0 ? 'active' : ''}">
                    <img src="/assets/icons/tiktok_rose.png" class="stage-cta-icon" alt="Rose">
                    <div class="stage-cta-text">
                        <span class="cta-action">🌹 Hoa Hồng (1 xu)</span>
                        <span class="cta-target">VÀO PHÁI NAM ${maleCount > 0 ? `(${maleCount})` : ''}</span>
                    </div>
                </div>

                <div class="stage-cta-heart">💘</div>

                <div class="stage-cta-pill female-cta ${femaleCount > 0 ? 'active' : ''}">
                    <img src="/assets/icons/tiktok_logo.png" class="stage-cta-icon" alt="TikTok">
                    <div class="stage-cta-text">
                        <span class="cta-action">🎵 TikTok (1 xu)</span>
                        <span class="cta-target">VÀO PHÁI NỮ ${femaleCount > 0 ? `(${femaleCount})` : ''}</span>
                    </div>
                </div>
            </div>

            <div class="empty-stage-bottom-hint">${hintText}</div>
        </div>
    `;
}

// Render cặp đôi đứng đúng vào bục trái tim của ảnh nền
function renderMatch(match) {
    const isPairing = match.status === 'pairing';

    stageContainer.innerHTML = `
        <!-- CẶP ĐÔI ĐỨNG ĐÚNG BỤC TRÁI TIM -->
        <div class="couple-on-heart-stage">
            <!-- Chàng Trai trên bục trái tim -->
            <div class="character-slot male" id="slot-male">
                <div class="character-avatar-bubble">
                    <img src="${match.male.avatar}" alt="${match.male.nickname}">
                </div>
                <img class="character-body-img" src="/assets/male_body.png" alt="Male Body">
                <div class="character-shadow"></div>
                <div class="character-tag male-tag">👑 ${match.male.nickname}</div>
            </div>

            <!-- Trái tim kết nối trên bục -->
            <div class="podium-heart-connector">
                <div class="connector-heart-icon">${isPairing ? '⚡' : '💖'}</div>
                <div class="connector-label">${isPairing ? 'Đang soi...' : 'HỢP ĐÔI'}</div>
            </div>

            <!-- Cô Gái trên bục trái tim -->
            <div class="character-slot female" id="slot-female">
                <div class="character-avatar-bubble">
                    <img src="${match.female.avatar}" alt="${match.female.nickname}">
                </div>
                <img class="character-body-img" src="/assets/female_body.png" alt="Female Body">
                <div class="character-shadow"></div>
                <div class="character-tag female-tag">💖 ${match.female.nickname}</div>
            </div>
        </div>

        <!-- Box Tỉ Lệ Hợp Đôi (Sáng Rực Rỡ Lung Linh) -->
        <div class="match-status-box">
            <div class="match-heart-rate">
                <span class="heart-icon">💘</span>
                <span id="heart-rate-val">${match.percentage}%</span>
            </div>
            <div class="match-title">TỶ LỆ TÌNH DUYÊN</div>
            <div class="countdown-pill" id="match-countdown">${match.countdown || 60}s</div>
        </div>
    `;
}

// ==========================================
// 4. HIỆU ỨNG CƯỚP BỒ (DRAMA STEAL PARTNER)
// ==========================================
socket.on('partner_stolen', data => {
    playStealVoiceSound();
    renderMatch(data.match);

    // Hiển thị thông báo cướp bồ và tự động tắt sau đúng 3 giây!
    showStolenAlert(data.thief, data.victim);

    // Hiệu ứng giật rung màn hình
    const viewport = document.getElementById('game-viewport');
    viewport.style.transform = 'scale(1.04) translate(-3px, 4px)';
    setTimeout(() => viewport.style.transform = 'none', 300);
});

// Hàm hiển thị Popup Cướp Bồ tự biến mất sau 3 giây
function showStolenAlert(thief, victim) {
    const existing = document.getElementById('stolen-popup-alert');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'stolen-popup-alert';
    banner.className = 'stolen-popup-alert';
    banner.innerHTML = `
        <div class="stolen-title">⚡ BỊ CƯỚP BỒ TRẮNG TRỢN! ⚡</div>
        <div class="stolen-desc"><b>${thief?.nickname || 'Khán giả'}</b> vừa cướp bồ thành công!</div>
        <div class="stolen-callout">🔥 Cay thế nhờ! Mau nạp Hạc Giấy cướp lại đê! 🔥</div>
    `;

    const viewport = document.getElementById('game-viewport');
    if (viewport) {
        viewport.appendChild(banner);
    }

    // Đúng 3 giây sau tự động mờ dần và biến mất hoàn toàn!
    setTimeout(() => {
        banner.classList.add('fade-out');
        setTimeout(() => banner.remove(), 400);
    }, 3000);
}

// ==========================================
// 5. CẬP NHẬT TOP 3 PHÚ HỘ (LEADERBOARD)
// ==========================================
socket.on('top_donators_updated', donators => {
    updateTopDonators(donators);
});

function updateTopDonators(donators) {
    if (!donators || donators.length === 0) return;

    const top1 = donators[0];
    topLeaderboard.innerHTML = `
        <div class="leader-card rank-1">
            <div class="leader-avatar-wrap">
                <span class="crown-badge">👑</span>
                <img class="leader-avatar" src="${top1.avatar}" alt="${top1.nickname}">
            </div>
            <div class="leader-info">
                <span class="leader-title">👑 ĐỆ NHẤT PHÚ HỘ 👑</span>
                <span class="leader-name">${top1.nickname}</span>
                <span class="leader-diamonds">${top1.totalDiamonds} 💎</span>
            </div>
        </div>
    `;
}

// ==========================================
// 6. THÔNG BÁO DONATE (HÀNG ĐỢI TỐI ĐA 3 THÔNG BÁO, HIỆN TỪ TỪ)
// ==========================================
const MAX_VISIBLE_TOASTS = 3;
const TOAST_DURATION_MS = 3800; // Mỗi thông báo hiển thị trong 3.8s
const TOAST_INTERVAL_MS = 800;  // Hiện từ từ: giãn cách 0.8s giữa các thông báo

const giftToastQueue = [];
let activeToastCount = 0;
let isProcessingToastQueue = false;

socket.on('new_gift', gift => {
    // Đẩy thông báo vào hàng đợi
    giftToastQueue.push(gift);
    // Xử lý hàng đợi
    triggerGiftToastQueue();
});

function triggerGiftToastQueue() {
    if (isProcessingToastQueue) return;
    if (giftToastQueue.length === 0) return;

    // Giới hạn: chỉ cho hiển thị tối đa 3 thông báo cùng lúc
    if (activeToastCount >= MAX_VISIBLE_TOASTS) {
        return;
    }

    isProcessingToastQueue = true;
    const gift = giftToastQueue.shift();
    displaySingleGiftToast(gift);

    // Hiện từ từ: chờ ít nhất TOAST_INTERVAL_MS mới cho thông báo kế tiếp xuất hiện
    setTimeout(() => {
        isProcessingToastQueue = false;
        triggerGiftToastQueue();
    }, TOAST_INTERVAL_MS);
}

function displaySingleGiftToast(gift) {
    playCoinSound();
    activeToastCount++;

    const toast = document.createElement('div');
    toast.className = 'gift-toast';
    toast.innerHTML = `
        <img class="toast-avatar" src="${gift.avatar}" alt="${gift.nickname}">
        <div class="toast-content">
            <span class="toast-name">${gift.nickname}</span>
            <span class="toast-gift">Tặng <b>${gift.giftName}</b> x${gift.repeatCount} (${gift.diamonds} 💎)</span>
        </div>
        ${gift.giftIcon ? `<img src="${gift.giftIcon}" style="width: 28px; height: 28px; margin-left: auto; object-fit: contain;">` : ''}
    `;

    giftToastContainer.appendChild(toast);

    // Tự động mờ dần và gỡ bỏ sau TOAST_DURATION_MS
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
            activeToastCount = Math.max(0, activeToastCount - 1);
            // Kiểm tra hàng đợi để lấy thông báo kế tiếp xuất hiện
            triggerGiftToastQueue();
        }, 350);
    }, TOAST_DURATION_MS);
}

// Pháo hoa Confetti chúc mừng
function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const pieces = [];
    const colors = ['#fe2c55', '#25f4ee', '#ffd700', '#ffffff', '#ff4b82'];

    for (let i = 0; i < 60; i++) {
        pieces.push({
            x: canvas.width / 2,
            y: canvas.height * 0.45,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.8) * 14,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 10
        });
    }

    let frame = 0;
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // trọng lực
            p.rotation += p.vRot;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        frame++;
        if (frame < 90) {
            requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    requestAnimationFrame(render);
}

// ==========================================
// TỰ ĐỘNG SCALE VỪA KHÍT 100% STUDIO (OBS / TIKTOK LIVE STUDIO / MOBILE)
// ==========================================
function autoFitStudioScreen() {
    const vp = document.getElementById('game-viewport');
    if (!vp) return;
    const baseW = 430;
    const baseH = 764;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    const scale = Math.min(winW / baseW, winH / baseH);
    vp.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', autoFitStudioScreen);
window.addEventListener('DOMContentLoaded', autoFitStudioScreen);
autoFitStudioScreen();

