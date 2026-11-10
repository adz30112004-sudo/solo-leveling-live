const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));
app.use(express.json());

// ==========================================
// 1. CẤU HÌNH 5 CỔNG HẦM NGỤC & ĐẠI BOSS
// ==========================================
const STAGES = [
    {
        id: 'gate_e',
        name: 'Cổng Hạng E: Hang Goblin',
        rank: 'E',
        bossName: 'Vua Goblin Hắc Ám',
        bossTitle: 'Chúa Tể Bộ Tộc Quỷ Lùn',
        bossImage: '/assets/boss_goblin.png',
        maxHp: 50000,
        themeColor: '#00ff88',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(0, 255, 136, 0.15) 0%, rgba(10, 15, 20, 0.95) 75%)'
    },
    {
        id: 'gate_c',
        name: 'Cổng Hạng C: Rừng Tuyết Hàn Khí',
        rank: 'C',
        bossName: 'Bạch Quỷ Vương Baruka',
        bossTitle: 'Hàn Băng Thần Tướng',
        bossImage: '/assets/boss_baruka.png',
        maxHp: 200000,
        themeColor: '#00c6ff',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(0, 198, 255, 0.2) 0%, rgba(10, 15, 30, 0.95) 75%)'
    },
    {
        id: 'gate_b',
        name: 'Cổng Hạng B: Lâu Đài Quỷ Dung Nham',
        rank: 'B',
        bossName: 'Quỷ Vương Baran',
        bossTitle: 'Lôi Thần Thống Lĩnh',
        bossImage: '/assets/boss_baran.png',
        maxHp: 600000,
        themeColor: '#ff0055',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(255, 0, 85, 0.25) 0%, rgba(25, 10, 15, 0.95) 75%)'
    },
    {
        id: 'gate_s',
        name: 'Cổng Hạng S: Đảo Kiến Diệt Chủng',
        rank: 'S',
        bossName: 'Kiến Vương Beru',
        bossTitle: 'Vua Diệt Chủng Thợ Săn',
        bossImage: '/assets/boss_beru.png',
        maxHp: 1500000,
        themeColor: '#a855f7',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(168, 85, 247, 0.3) 0%, rgba(15, 5, 25, 0.95) 75%)'
    },
    {
        id: 'gate_god',
        name: 'Cổng Thần: Hầm Ngục Kép',
        rank: 'QUỐC GIA',
        bossName: 'Tượng Thần Cười Cổ Đại',
        bossTitle: 'Kẻ Thống Trị Đền Thờ Cấm Kỵ',
        bossImage: '/assets/boss_statue.png',
        maxHp: 5000000,
        themeColor: '#ef4444',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(239, 68, 68, 0.35) 0%, rgba(20, 5, 5, 0.95) 75%)'
    }
];

// ==========================================
// 2. TRẠNG THÁI TRÒ CHƠI (GAME STATE)
// ==========================================
let currentStageIndex = 0;
let bossCurrentHp = STAGES[0].maxHp;
let isBossDefeated = false;
let lastHitter = null;
let defeatCountdown = null;

// Quản lý người chơi: uniqueId -> Player Object
const players = new Map();

// Bảng xếp hạng Top DPS & Top Đại Gia
let topDps = [];
let topDonators = [];

// Quân đoàn bóng tối (những người kích hoạt Arise 99+ xu)
const shadowArmy = [];

// Avatar mặc định khi test
const DEFAULT_AVATARS = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
];

// Hàm xếp hạng Thợ Săn dựa trên EXP
function calculateRank(exp, diamonds) {
    if (diamonds >= 500 || exp >= 500000) return 'QUỐC GIA';
    if (diamonds >= 99 || exp >= 100000) return 'S';
    if (diamonds >= 50 || exp >= 40000) return 'A';
    if (diamonds >= 20 || exp >= 15000) return 'B';
    if (diamonds >= 5 || exp >= 5000) return 'C';
    if (diamonds >= 1 || exp >= 1000) return 'D';
    return 'E';
}

function calculateLevel(exp) {
    return Math.max(1, Math.floor(Math.sqrt(exp / 50)) + 1);
}

// Lấy hoặc tạo hồ sơ người chơi
function getOrCreatePlayer(uniqueId, nickname, avatar) {
    if (!players.has(uniqueId)) {
        players.set(uniqueId, {
            uniqueId,
            nickname: nickname || uniqueId,
            avatar: avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
            rank: 'E',
            level: 1,
            exp: 0,
            totalDamage: 0,
            totalDiamonds: 0,
            isShadowSoldier: false,
            lastAttackTime: Date.now()
        });
    }
    const p = players.get(uniqueId);
    if (nickname) p.nickname = nickname;
    if (avatar) p.avatar = avatar;
    p.lastAttackTime = Date.now();
    return p;
}

// Cập nhật bảng xếp hạng
function updateLeaderboards() {
    // Top 3 DPS
    topDps = Array.from(players.values())
        .filter(p => p.totalDamage > 0)
        .sort((a, b) => b.totalDamage - a.totalDamage)
        .slice(0, 3);

    // Top 3 Đại gia (Đệ Nhất Thợ Săn)
    topDonators = Array.from(players.values())
        .filter(p => p.totalDiamonds > 0)
        .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
        .slice(0, 3);
}

// ==========================================
// 3. XỬ LÝ SÁT THƯƠNG & THĂNG CẤP
// ==========================================
function dealDamage(player, rawDamage, actionType, giftData = null) {
    if (isBossDefeated) return null;

    const currentStage = STAGES[currentStageIndex];
    let damage = Math.max(1, Math.round(rawDamage));

    // Trừ máu Boss
    bossCurrentHp = Math.max(0, bossCurrentHp - damage);
    player.totalDamage += damage;

    // Cộng EXP và tính lại Level / Rank
    const expGained = giftData ? giftData.diamonds * 1000 : Math.round(damage * 0.5);
    player.exp += expGained;
    const oldRank = player.rank;
    player.rank = calculateRank(player.exp, player.totalDiamonds);
    player.level = calculateLevel(player.exp);

    const isRankUp = player.rank !== oldRank;

    updateLeaderboards();

    const attackResult = {
        player: {
            uniqueId: player.uniqueId,
            nickname: player.nickname,
            avatar: player.avatar,
            rank: player.rank,
            level: player.level,
            isShadowSoldier: player.isShadowSoldier
        },
        damage,
        actionType,
        giftName: giftData ? giftData.giftName : null,
        giftIcon: giftData ? giftData.giftIcon : null,
        isRankUp,
        bossCurrentHp,
        bossMaxHp: currentStage.maxHp,
        hpPercent: Math.round((bossCurrentHp / currentStage.maxHp) * 100)
    };

    // Bắn sự kiện đòn đánh
    io.emit('boss_damaged', attackResult);
    io.emit('leaderboard_updated', { topDps, topDonators, currentStage });

    // Kiểm tra Boss bị hạ gục (Defeated)
    if (bossCurrentHp <= 0) {
        onBossDefeated(player);
    }

    return attackResult;
}

function onBossDefeated(killer) {
    if (isBossDefeated) return;
    isBossDefeated = true;
    lastHitter = killer;

    const currentStage = STAGES[currentStageIndex];

    io.emit('boss_defeated', {
        stage: currentStage,
        killer: {
            uniqueId: killer.uniqueId,
            nickname: killer.nickname,
            avatar: killer.avatar,
            rank: killer.rank,
            level: killer.level
        },
        topDps
    });

    // Đếm ngược 6 giây tự động mở Cổng tiếp theo
    let countdown = 6;
    if (defeatCountdown) clearInterval(defeatCountdown);

    defeatCountdown = setInterval(() => {
        countdown--;
        io.emit('stage_countdown', { countdown });
        if (countdown <= 0) {
            clearInterval(defeatCountdown);
            defeatCountdown = null;
            goToNextStage();
        }
    }, 1000);
}

function goToNextStage() {
    currentStageIndex = (currentStageIndex + 1) % STAGES.length;
    const nextStage = STAGES[currentStageIndex];
    bossCurrentHp = nextStage.maxHp;
    isBossDefeated = false;
    lastHitter = null;

    // Reset sát thương vòng mới để mọi người cùng đua lại Top DPS
    for (const p of players.values()) {
        p.totalDamage = 0;
    }
    updateLeaderboards();

    io.emit('new_stage_started', {
        stage: nextStage,
        bossCurrentHp,
        bossMaxHp: nextStage.maxHp,
        topDps,
        topDonators
    });
}

function setCustomStage(stageIndex) {
    if (stageIndex >= 0 && stageIndex < STAGES.length) {
        if (defeatCountdown) {
            clearInterval(defeatCountdown);
            defeatCountdown = null;
        }
        currentStageIndex = stageIndex;
        const s = STAGES[currentStageIndex];
        bossCurrentHp = s.maxHp;
        isBossDefeated = false;
        lastHitter = null;
        for (const p of players.values()) {
            p.totalDamage = 0;
        }
        updateLeaderboards();
        io.emit('new_stage_started', {
            stage: s,
            bossCurrentHp,
            bossMaxHp: s.maxHp,
            topDps,
            topDonators
        });
    }
}

// ==========================================
// 4. KẾT NỐI TIKTOK LIVE THẬT (TRỰC TIẾP MIỄN PHÍ)
// ==========================================
let pirateClient = null;
let currentTikTokUsername = '';
let isTikTokConnected = false;

async function connectToTikTok(username) {
    if (!username) return;
    username = username.replace(/^@/, '').trim();

    if (pirateClient) {
        try {
            pirateClient.disconnect();
        } catch (e) {}
        pirateClient = null;
    }

    try {
        const { TikTokLiveClient, EventType, isStreakOver } = require('piratetok-live-js');
        currentTikTokUsername = username;

        pirateClient = new TikTokLiveClient(username);

        pirateClient.on(EventType.CONNECTED, (state) => {
            isTikTokConnected = true;
            io.emit('tiktok_status', {
                connected: true,
                username: currentTikTokUsername,
                roomId: state?.roomId || null
            });
        });

        pirateClient.on(EventType.DISCONNECTED, () => {
            isTikTokConnected = false;
            io.emit('tiktok_status', { connected: false, error: 'Đã ngắt kết nối' });
        });

        // 1. Sự kiện Thả Tim (Chạm màn hình ➔ Đánh thường)
        pirateClient.on(EventType.LIKE, (data) => {
            try {
                const uid = data.user?.uniqueId || 'viewer_' + Date.now();
                const name = data.user?.nickname || data.user?.uniqueId || 'Thợ Săn Ẩn Danh';
                const avatar = data.user?.profilePictureUrl || DEFAULT_AVATARS[0];
                const likeCount = Math.max(1, data.likeCount || 1);

                const player = getOrCreatePlayer(uid, name, avatar);
                const damagePerLike = 5 + Math.floor(player.level * 1.5);
                dealDamage(player, damagePerLike * likeCount, 'like');
            } catch (err) {
                console.warn('Like processing error:', err.message);
            }
        });

        // 2. Sự kiện Chat (Gõ phím ➔ Kỹ năng)
        pirateClient.on(EventType.CHAT, (data) => {
            try {
                const uid = data.user?.uniqueId || 'chat_' + Date.now();
                const name = data.user?.nickname || data.user?.uniqueId || 'Thợ Săn';
                const avatar = data.user?.profilePictureUrl || DEFAULT_AVATARS[0];
                const comment = (data.comment || '').trim();

                const player = getOrCreatePlayer(uid, name, avatar);
                const damage = 25 + player.level * 2;
                dealDamage(player, damage, 'chat');

                io.emit('player_chat', {
                    nickname: player.nickname,
                    avatar: player.avatar,
                    comment,
                    rank: player.rank
                });
            } catch (err) {
                console.warn('Chat processing error:', err.message);
            }
        });

        // 3. Sự kiện Tặng Quà Donate
        pirateClient.on(EventType.GIFT, (data) => {
            try {
                const uid = data.user?.uniqueId || 'donator_' + Date.now();
                const name = data.user?.nickname || data.user?.uniqueId || 'Đại Gia';
                const avatar = data.user?.profilePictureUrl || DEFAULT_AVATARS[0];

                const giftName = data.giftDetails?.giftName || data.giftName || 'Quà TikTok';
                const diamonds = data.giftDetails?.diamondCount || data.diamonds || 1;
                const repeatCount = data.repeatCount || data.comboCount || 1;
                const totalDiamonds = diamonds * repeatCount;

                const player = getOrCreatePlayer(uid, name, avatar);
                player.totalDiamonds += totalDiamonds;

                let icon = '/assets/icons/tiktok_rose.png';
                if (diamonds >= 99) icon = '/assets/icons/tiktok_paper_crane.png';
                else if (diamonds >= 20) icon = '/assets/icons/tiktok_perfume.png';
                else if (diamonds >= 10) icon = '/assets/icons/tiktok_rosa.png';
                else if (diamonds >= 5) icon = '/assets/icons/tiktok_finger_heart.png';

                // Tính toán sát thương theo xu
                let damage = totalDiamonds * 500;

                // Kỹ năng tối thượng ARISE (99+ xu)
                if (diamonds >= 99) {
                    damage = Math.max(100000, totalDiamonds * 1500);
                    player.isShadowSoldier = true;
                    if (!shadowArmy.some(s => s.uniqueId === player.uniqueId)) {
                        shadowArmy.unshift({
                            uniqueId: player.uniqueId,
                            nickname: player.nickname,
                            avatar: player.avatar,
                            rank: 'S'
                        });
                        if (shadowArmy.length > 8) shadowArmy.pop();
                    }
                    io.emit('arise_activated', {
                        player: {
                            nickname: player.nickname,
                            avatar: player.avatar,
                            rank: player.rank
                        },
                        giftName,
                        diamonds: totalDiamonds
                    });
                }

                dealDamage(player, damage, 'gift', {
                    giftName,
                    giftIcon: icon,
                    diamonds: totalDiamonds
                });
            } catch (err) {
                console.warn('Gift processing error:', err.message);
            }
        });

        await pirateClient.connect();
    } catch (err) {
        isTikTokConnected = false;
        io.emit('tiktok_status', {
            connected: false,
            error: err.message || 'Không thể kết nối tới TikTok'
        });
    }
}

// ==========================================
// 5. KẾT NỐI SOCKET.IO VỚI CLIENT & ADMIN
// ==========================================
io.on('connection', (socket) => {
    const currentStage = STAGES[currentStageIndex];

    // Gửi toàn bộ trạng thái hiện tại cho người mới vào
    socket.emit('init_game_state', {
        currentStageIndex,
        stage: currentStage,
        bossCurrentHp,
        bossMaxHp: currentStage.maxHp,
        isBossDefeated,
        lastHitter,
        topDps,
        topDonators,
        shadowArmy,
        stagesList: STAGES.map(s => ({ id: s.id, name: s.name, rank: s.rank, maxHp: s.maxHp })),
        tiktokStatus: {
            connected: isTikTokConnected,
            username: currentTikTokUsername
        }
    });

    // ADMIN EVENTS
    socket.on('admin_tap_attack', (count = 1) => {
        const testUser = getOrCreatePlayer('test_hunter_1', 'Thợ Săn Solo (Test)', DEFAULT_AVATARS[0]);
        dealDamage(testUser, 15 * count, 'like');
    });

    socket.on('admin_mock_gift', (gift) => {
        const testUser = getOrCreatePlayer(
            'vip_' + Math.floor(Math.random() * 999),
            gift.nickname || 'Đại Gia Solo',
            gift.avatar || DEFAULT_AVATARS[1]
        );
        const diamonds = gift.diamonds || 1;
        testUser.totalDiamonds += diamonds;

        let dmg = diamonds * 500;
        if (diamonds >= 99) {
            dmg = Math.max(100000, diamonds * 1500);
            testUser.isShadowSoldier = true;
            if (!shadowArmy.some(s => s.uniqueId === testUser.uniqueId)) {
                shadowArmy.unshift({
                    uniqueId: testUser.uniqueId,
                    nickname: testUser.nickname,
                    avatar: testUser.avatar,
                    rank: 'S'
                });
                if (shadowArmy.length > 8) shadowArmy.pop();
            }
            io.emit('arise_activated', {
                player: {
                    nickname: testUser.nickname,
                    avatar: testUser.avatar,
                    rank: testUser.rank
                },
                giftName: gift.giftName,
                diamonds
            });
        }

        dealDamage(testUser, dmg, 'gift', {
            giftName: gift.giftName,
            giftIcon: gift.giftIcon || '/assets/icons/tiktok_rose.png',
            diamonds
        });
    });

    socket.on('admin_switch_stage', (stageIdx) => {
        setCustomStage(stageIdx);
    });

    socket.on('admin_reset_boss', () => {
        const s = STAGES[currentStageIndex];
        bossCurrentHp = s.maxHp;
        isBossDefeated = false;
        lastHitter = null;
        io.emit('boss_reset', {
            stage: s,
            bossCurrentHp,
            bossMaxHp: s.maxHp
        });
    });

    socket.on('admin_play_sound', (soundName) => {
        io.emit('play_sound_effect', soundName);
    });

    socket.on('admin_connect_tiktok', (username) => {
        connectToTikTok(username);
    });

    socket.on('admin_disconnect_tiktok', () => {
        if (pirateClient) {
            try { pirateClient.disconnect(); } catch (e) {}
            pirateClient = null;
        }
        isTikTokConnected = false;
        currentTikTokUsername = '';
        io.emit('tiktok_status', { connected: false, error: 'Đã ngắt kết nối' });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚔️ GAME SOLO LEVELING RAID BOSS ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`🎮 BẢNG QUẢN TRỊ ADMIN TEST: http://localhost:${PORT}/admin.html`);
    console.log(`=======================================================`);
});
