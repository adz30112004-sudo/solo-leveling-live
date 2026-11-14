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
        bgImage: '/assets/bg_goblin.png',
        maxHp: 50000,
        timeLimit: 120, // 2 phút
        skillName: 'Mưa Tiễn Quỷ Độc',
        skillDesc: 'Bắn vạn mũi tên tẩm kịch độc gây tê liệt toàn đội thợ săn!',
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
        bgImage: '/assets/bg_snow.png',
        maxHp: 200000,
        timeLimit: 180, // 3 phút
        skillName: 'Bão Băng Tuyệt Diệt',
        skillDesc: 'Triệu hồi bão tuyết âm độ đóng băng và nứt toác mặt đất!',
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
        bgImage: '/assets/bg_demon.png',
        maxHp: 600000,
        timeLimit: 240, // 4 phút
        skillName: 'Thiên Lôi Địa Hỏa',
        skillDesc: 'Gọi sấm sét đỏ rực và dung nham hỏa ngục giáng nát chiến trường!',
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
        bgImage: '/assets/bg_jeju.png',
        maxHp: 1500000,
        timeLimit: 300, // 5 phút
        skillName: 'Trảm Hồn Liêm Tử Thần',
        skillDesc: 'Vung song kiếm liêm bóng đêm chém toác không gian với tốc độ âm thanh!',
        themeColor: '#a855f7',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(168, 85, 247, 0.3) 0%, rgba(15, 5, 25, 0.95) 75%)'
    },
    {
        id: 'gate_god',
        name: 'Cổng Thần: Đền Thờ Cổ Đại',
        rank: 'QUỐC GIA',
        bossName: 'Long Vương Antares',
        bossTitle: 'Hoàng Đế Hủy Diệt Cấp Quốc Gia',
        bossImage: '/assets/boss_antares.png',
        bgImage: '/assets/bg_temple.png',
        maxHp: 5000000,
        timeLimit: 360, // 6 phút
        skillName: 'Hơi Thở Rồng Hủy Diệt',
        skillDesc: 'Phun trào biển lửa rồng hắc ám thiêu rụi toàn bộ thợ săn cấp quốc gia!',
        themeColor: '#ff0033',
        bgGradient: 'radial-gradient(circle at 50% 35%, rgba(255, 0, 51, 0.35) 0%, rgba(25, 5, 5, 0.95) 75%)'
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

// ĐỒNG HỒ ĐẾM NGƯỢC HẦM NGỤC & THẤT BẠI KHI HẾT GIỜ (DUNGEON TIMER)
let dungeonTimer = null;
let dungeonTimeRemaining = STAGES[0].timeLimit;
let isDungeonFailed = false;
let failCountdown = null;

// HỆ THỐNG NỘ KHÍ & ĐẠI BOSS ĐÁNH LẠI (BOSS COUNTER-ATTACK)
let bossRage = 0;                // 0 -> 100%
let isBossCharging = false;       // Đang tụ chiêu thức cảnh báo đỏ
let isBossStunned = false;        // Bị phá chiêu / Choáng nhận x2 damage
let chargeRemainingHits = 50;     // Số hit cần gõ để phá chiêu
let chargeMaxHits = 50;
let chargeTimer = null;
let chargeCountdown = 5;
let stunTimer = null;
let hunterShield = 100;           // Khiên bảo vệ tổ đội thợ săn: 0 -> 100%
let autoRageEnabled = true;       // Tự động tích nộ định kỳ

// Quản lý người chơi: uniqueId -> Player Object
const players = new Map();

// Bảng xếp hạng Top DPS & Top Đại Gia
let topDps = [];
let topDonators = [];

// Quân đoàn bóng tối (những người kích hoạt Arise 99+ xu)
const shadowArmy = [];

// Avatar mặc định khi test (Kho ảnh đa dạng chuẩn style TikTok Việt: nam nữ trẻ, selfie, cafe, phố, gaming, pet)
const DEFAULT_AVATARS = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', // Nam ngầu streetwear
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', // Nữ xinh cafe selfie
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', // Nam trẻ năng động 2k
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', // Nữ aesthetic xinh xắn
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', // Nam thư sinh thanh lịch
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', // Nữ thanh lịch
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', // Nam nụ cười tươi
    'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150', // Bé gái đáng yêu tươi tắn
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', // Nam cá tính
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150', // Nữ cười rạng rỡ
    'https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=150', // Nam học sinh cá tính
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', // Nữ cá tính sang chảnh
    'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150', // Nam phong cách nghệ thuật
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150', // Nữ phong cách thời thượng
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', // Nam bảnh bao
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150', // Nữ người mẫu xinh đẹp
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150', // Meme mèo béo cưng
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=150', // Cún cưng đáng yêu
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', // Gamer nam 3D
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'  // Nữ nụ cười ngọt ngào
];

// Danh sách hồ sơ nick TikTok Việt Nam cực thật: tên thật kèm năm sinh, nickname gaming, meme, icon bio
const VIET_TIKTOK_PROFILES = [
    // --- Nam trẻ tuổi (Streetwear, Sinh viên, Cafe, Gamer) ---
    { id: 'vn_01', nickname: 'Nguyễn Hoàng Long', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', quote: 'Ma lực Hắc Ám Hoàng Đế bùng nổ đến đỉnh cao!' },
    { id: 'vn_02', nickname: 'Minh Quân 2k4', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', quote: 'Tuyệt kỹ Trảm Phong phá tan kết giới hắc ám!' },
    { id: 'vn_03', nickname: 'Lê Tuấn Anh', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', quote: 'Cường hoá thân thể đạt cảnh giới Thiết Giáp!' },
    { id: 'vn_04', nickname: 'Đặng Gia Huy', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', quote: 'Ánh sáng công lý thanh tẩy Hầm Ngục!' },
    { id: 'vn_05', nickname: 'Phan Bảo Nam', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150', quote: 'Cung tên Ma Thuật bách phát bách trúng!' },
    { id: 'vn_06', nickname: 'Vũ Đức Thắng', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', quote: 'Thiết quyền bộc phá công phá vạn dặm!' },
    { id: 'vn_07', nickname: 'Trần Tiến Đạt', avatar: 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=150', quote: 'Triệu hồi Lôi Thần giáng thế trừng phạt!' },
    { id: 'vn_08', nickname: 'Boy Phố Hải Phòng 🏍️', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', quote: 'Không lòng vòng, lướt lẹ chém gục Boss!' },
    { id: 'vn_09', nickname: 'Duy Nến Gaming 🎮', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', quote: 'Cày chay lên Top 1 Thợ Săn không nạp xu!' },
    { id: 'vn_10', nickname: '_hoanglong.99_', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', quote: 'Bật Mode Chiến Binh săn lùng Boss thế giới!' },

    // --- Nữ trẻ tuổi (Selfie cafe, Xinh xắn, Aesthetic, Dễ thương) ---
    { id: 'vn_11', nickname: 'Khánh Huyền ✨', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', quote: 'Kiếm pháp Vũ Điệu Ánh Sáng đạt cảnh giới mới!' },
    { id: 'vn_12', nickname: 'Thuỳ Linh 2k3 🌸', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', quote: 'Phép thuật Băng Tuyết phong ấn vạn vật!' },
    { id: 'vn_13', nickname: 'Ngọc Ánh 🎀', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', quote: 'Thánh quang trị liệu hồi phục toàn bộ binh đoàn!' },
    { id: 'vn_14', nickname: 'Mai Phương Thảo', avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150', quote: 'Mũi tên Xuyên Tâm tiêu diệt điểm yếu Boss!' },
    { id: 'vn_15', nickname: 'Hương Giang 2k5', avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150', quote: 'Sức mạnh Tinh Linh hộ thể bảo vệ đồng đội!' },
    { id: 'vn_16', nickname: 'Hải Yến 🍑', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', quote: 'Tốc độ xuất chiêu nhanh như chớp nhoáng!' },
    { id: 'vn_17', nickname: 'Bé Heo Dễ Thương 🐷', avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150', quote: 'Bé Heo ra tay, gõ bay máu Boss!' },
    { id: 'vn_18', nickname: 'Bích Phương 🌻', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150', quote: 'Khúc ca Chiến Thắng vang vọng khắp Chiến Trường!' },
    { id: 'vn_19', nickname: 'linh.candy_', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', quote: 'Kẹo ngọt nhưng chém ngọt như kiếm katana!' },
    { id: 'vn_20', nickname: 'Cô Bé Mùa Đông ❄️', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', quote: 'Hàn khí cực độ làm chậm mọi chiêu thức Boss!' },

    // --- Trend TikTok / Meme / Độc Đáo ---
    { id: 'vn_21', nickname: 'Mèo Béo Đô Thị 🐱', avatar: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=150', quote: 'Móng vuốt Mèo Béo cào rách giáp Boss!' },
    { id: 'vn_22', nickname: 'Cún Con Đi Lạc 🐶', avatar: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=150', quote: 'Cún con nổi giận hoá thành Ma Sói Hắc Ám!' },
    { id: 'vn_23', nickname: 'Trùm PK Gõ Phím ⌨️', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', quote: 'Tốc độ 300 phím/phút, combo không đối thủ!' },
    { id: 'vn_24', nickname: 'Cậu Út Miền Tây 🌾', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', quote: 'Dân quê chân chất nhưng đấm phát Boss bay màu!' },
    { id: 'vn_25', nickname: 'Tuấn Mõm Không Cay 🌶️', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', quote: 'Mõm thì mõm chứ gánh team là có thật!' },
    { id: 'vn_26', nickname: 'Thánh Thả Tim 99 ❤️', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', quote: 'Triệu hồi Cơn Mưa Tim tăng tốc toàn đội!' },
    { id: 'vn_27', nickname: 'Bé Na 2k5 🐍', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', quote: 'Độc dược Tê Tái khiến Boss mất nửa bình máu!' },
    { id: 'vn_28', nickname: 'Quân Sư Quạt Mo 🪭', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150', quote: 'Bày binh bố trận, Boss chỉ có đường quy phục!' },
    { id: 'vn_29', nickname: 'Đạt Villa Fan ⚡', avatar: 'https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=150', quote: 'Sức mạnh đoàn kết gia đình Villa công phá!' },
    { id: 'vn_30', nickname: 'Hưng Đẹp Trai 🕶️', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', quote: 'Đẹp trai có gì sai? Boss cũng phải nể phục!' }
];

let vietProfileCounter = 0;
function getRandomVietTikTokProfile() {
    // Trả về profile xoay vòng tránh trùng lặp liên tiếp
    const idx = (vietProfileCounter++) % VIET_TIKTOK_PROFILES.length;
    return VIET_TIKTOK_PROFILES[idx];
}

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
        let finalNick = nickname;
        let finalAvatar = avatar;
        if (!finalNick || finalNick.startsWith('Thợ Săn #') || finalNick === 'Thợ Săn Solo' || finalNick === 'Thợ Săn') {
            const randomProf = getRandomVietTikTokProfile();
            finalNick = (finalNick && !finalNick.startsWith('Thợ Săn')) ? finalNick : randomProf.nickname;
            if (!finalAvatar) finalAvatar = randomProf.avatar;
        }
        players.set(uniqueId, {
            uniqueId,
            nickname: finalNick || uniqueId,
            avatar: finalAvatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
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
    if (nickname && !nickname.startsWith('Thợ Săn #')) p.nickname = nickname;
    if (avatar) p.avatar = avatar;
    p.lastAttackTime = Date.now();
    return p;
}

// Cập nhật bảng xếp hạng
function updateLeaderboards() {
    // Top 10 DPS (10 Thợ Săn Hàng Đầu)
    topDps = Array.from(players.values())
        .filter(p => p.totalDamage > 0)
        .sort((a, b) => b.totalDamage - a.totalDamage)
        .slice(0, 10);

    // Top 10 Đại gia (Đệ Nhất Thợ Săn)
    topDonators = Array.from(players.values())
        .filter(p => p.totalDiamonds > 0)
        .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
        .slice(0, 10);
}

// ==========================================
// 3. XỬ LÝ NỘ KHÍ, SÁT THƯƠNG & PHẢN ĐÒN (BOSS COUNTER-ATTACK)
// ==========================================
function startBossCharge(duration = 10) {
    if (isBossCharging || isBossStunned || isBossDefeated) return;
    isBossCharging = true;
    chargeRemainingHits = 50;
    chargeMaxHits = 50;
    chargeCountdown = Math.max(3, duration);

    const currentStage = STAGES[currentStageIndex];
    io.emit('boss_charging_started', {
        skillName: currentStage.skillName,
        skillDesc: currentStage.skillDesc,
        themeColor: currentStage.themeColor,
        countdown: chargeCountdown,
        remainingHits: chargeRemainingHits,
        maxHits: chargeMaxHits
    });

    if (chargeTimer) clearInterval(chargeTimer);
    chargeTimer = setInterval(() => {
        chargeCountdown--;
        io.emit('boss_charge_tick', {
            countdown: chargeCountdown,
            remainingHits: chargeRemainingHits
        });
        if (chargeCountdown <= 0) {
            clearInterval(chargeTimer);
            chargeTimer = null;
            executeBossAttack();
        }
    }, 1000);
}

function executeBossAttack() {
    if (chargeTimer) {
        clearInterval(chargeTimer);
        chargeTimer = null;
    }
    isBossCharging = false;
    bossRage = 0;

    const currentStage = STAGES[currentStageIndex];
    hunterShield = Math.max(0, hunterShield - 40);

    io.emit('boss_attack_triggered', {
        stage: currentStage,
        skillName: currentStage.skillName,
        damageToShield: 40,
        hunterShield,
        isShieldBroken: hunterShield <= 0
    });

    // Nếu Khiên vỡ, sau 4s hồi lại 30%
    if (hunterShield <= 0) {
        setTimeout(() => {
            if (hunterShield <= 0) {
                hunterShield = 30;
                io.emit('hunter_shield_updated', { hunterShield, recovered: true });
            }
        }, 4000);
    }
}

function stunBoss(breakerPlayer = null) {
    if (chargeTimer) {
        clearInterval(chargeTimer);
        chargeTimer = null;
    }
    isBossCharging = false;
    isBossStunned = true;
    bossRage = 0;

    const currentStage = STAGES[currentStageIndex];
    io.emit('boss_stunned', {
        breaker: breakerPlayer ? {
            nickname: breakerPlayer.nickname,
            avatar: breakerPlayer.avatar,
            rank: breakerPlayer.rank
        } : null,
        stage: currentStage,
        duration: 5
    });

    if (stunTimer) clearTimeout(stunTimer);
    stunTimer = setTimeout(() => {
        isBossStunned = false;
        io.emit('boss_recovered', {
            stage: STAGES[currentStageIndex]
        });
    }, 5000);
}

function resetBossRageState() {
    if (chargeTimer) {
        clearInterval(chargeTimer);
        chargeTimer = null;
    }
    if (stunTimer) {
        clearTimeout(stunTimer);
        stunTimer = null;
    }
    isBossCharging = false;
    isBossStunned = false;
    bossRage = 0;
    chargeRemainingHits = 50;
    hunterShield = 100;
}

// ==========================================
// ĐỒNG HỒ ĐẾM NGƯỢC HẦM NGỤC & XỬ LÝ HẾT GIỜ (DUNGEON RAID TIMER)
// ==========================================
function startDungeonTimer() {
    if (dungeonTimer) clearInterval(dungeonTimer);
    if (failCountdown) clearInterval(failCountdown);
    failCountdown = null;

    const currentStage = STAGES[currentStageIndex];
    dungeonTimeRemaining = currentStage.timeLimit || 120;
    isDungeonFailed = false;

    io.emit('dungeon_timer_tick', {
        remaining: dungeonTimeRemaining,
        total: currentStage.timeLimit,
        isWarning: false
    });

    dungeonTimer = setInterval(() => {
        if (!isBossDefeated && !isDungeonFailed) {
            dungeonTimeRemaining--;
            io.emit('dungeon_timer_tick', {
                remaining: dungeonTimeRemaining,
                total: currentStage.timeLimit,
                isWarning: dungeonTimeRemaining <= 30
            });

            if (dungeonTimeRemaining <= 0) {
                clearInterval(dungeonTimer);
                dungeonTimer = null;
                onDungeonFailed();
            }
        }
    }, 1000);
}

function onDungeonFailed() {
    if (isDungeonFailed || isBossDefeated) return;
    isDungeonFailed = true;
    resetBossRageState();

    const currentStage = STAGES[currentStageIndex];
    io.emit('dungeon_failed', {
        stage: currentStage
    });

    let countdown = 6;
    if (failCountdown) clearInterval(failCountdown);
    failCountdown = setInterval(() => {
        countdown--;
        io.emit('fail_countdown', { countdown });
        if (countdown <= 0) {
            clearInterval(failCountdown);
            failCountdown = null;
            retryCurrentStage();
        }
    }, 1000);
}

function retryCurrentStage() {
    isDungeonFailed = false;
    const currentStage = STAGES[currentStageIndex];
    bossCurrentHp = currentStage.maxHp;
    isBossDefeated = false;
    lastHitter = null;
    resetBossRageState();
    startDungeonTimer();

    // Giữ nguyên toàn bộ công sức của thợ săn: cấp độ, rank, tổng sát thương tích luỹ
    updateLeaderboards();

    io.emit('stage_retried', {
        stage: currentStage,
        bossCurrentHp,
        bossMaxHp: currentStage.maxHp,
        timeLimit: currentStage.timeLimit,
        topDps,
        topDonators
    });
}

// Tích nộ tự nhiên theo thời gian
setInterval(() => {
    if (autoRageEnabled && !isBossDefeated && !isBossCharging && !isBossStunned && !isDungeonFailed) {
        bossRage = Math.min(100, bossRage + 2.5);
        io.emit('boss_rage_updated', {
            bossRage: Math.round(bossRage),
            hunterShield
        });
        if (bossRage >= 100) {
            startBossCharge();
        }
    }
}, 1000);

function dealDamage(player, rawDamage, actionType, giftData = null) {
    if (isBossDefeated || isDungeonFailed) return null;

    const currentStage = STAGES[currentStageIndex];
    let damage = Math.max(1, Math.round(rawDamage));

    // Đang Stun nhận x2 sát thương!
    if (isBossStunned) {
        damage = Math.round(damage * 2);
    }

    // Đang tụ chiêu thì trừ hit để phá giáp
    if (isBossCharging) {
        const hitsReduced = actionType === 'gift' ? 30 : (actionType === 'chat' ? 5 : 1);
        chargeRemainingHits = Math.max(0, chargeRemainingHits - hitsReduced);
        io.emit('charge_hits_updated', {
            remaining: chargeRemainingHits,
            max: chargeMaxHits,
            pct: Math.round((chargeRemainingHits / chargeMaxHits) * 100)
        });
        if (chargeRemainingHits <= 0) {
            stunBoss(player);
        }
    } else if (!isBossStunned && !isBossDefeated) {
        // Tăng nộ khí khi bị đánh
        const rageGain = actionType === 'gift' ? 6 : (actionType === 'chat' ? 1.5 : 0.4);
        bossRage = Math.min(100, bossRage + rageGain);
        io.emit('boss_rage_updated', {
            bossRage: Math.round(bossRage),
            hunterShield
        });
        if (bossRage >= 100) {
            startBossCharge();
        }
    }

    // Nếu tặng quà thì hồi phục khiên tổ đội
    if (giftData && giftData.diamonds) {
        hunterShield = Math.min(100, hunterShield + giftData.diamonds * 10);
        io.emit('hunter_shield_updated', { hunterShield });
    }

    // Trừ máu Boss
    bossCurrentHp = Math.max(0, bossCurrentHp - damage);
    player.totalDamage += damage;

    // Cộng EXP và tính lại Level / Rank
    const expGained = giftData ? giftData.diamonds * 1000 : Math.round(damage * 0.5);
    player.exp += expGained;
    const oldRank = player.rank;
    const oldLevel = player.level || 1;
    player.rank = calculateRank(player.exp, player.totalDiamonds);
    player.level = calculateLevel(player.exp);

    const isRankUp = player.rank !== oldRank;
    const isLevelUp = player.level > oldLevel;

    // Phát sự kiện vinh danh thợ săn lên cấp hoặc thăng hạng
    if (isLevelUp || isRankUp) {
        io.emit('hunter_level_up', {
            player: {
                uniqueId: player.uniqueId,
                nickname: player.nickname,
                avatar: player.avatar,
                rank: player.rank,
                level: player.level
            },
            oldLevel,
            newLevel: player.level,
            oldRank,
            newRank: player.rank,
            isLevelUp,
            isRankUp
        });
    }

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
        isCrit: isBossStunned,
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
    resetBossRageState();
    if (dungeonTimer) {
        clearInterval(dungeonTimer);
        dungeonTimer = null;
    }

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
    resetBossRageState();
    startDungeonTimer();

    // Giữ nguyên toàn bộ chỉ số, cấp bậc và sát thương tích luỹ của thợ săn qua các màn
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
        resetBossRageState();
        startDungeonTimer();
        // Giữ nguyên toàn bộ chỉ số, cấp bậc và sát thương tích luỹ của thợ săn
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
        const { TikTokLiveClient, EventType, isStreakOver } = await import('piratetok-live-js');
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
        console.error('Lỗi kết nối TikTok:', err);
        isTikTokConnected = false;
        let errMsg = err.message || 'Không thể kết nối tới TikTok';
        if (err.name === 'HostNotOnlineError' || errMsg.toLowerCase().includes('not online')) {
            errMsg = `Tài khoản @${username} hiện chưa bật Live stream trên TikTok!`;
        } else if (err.name === 'UserNotFoundError' || errMsg.toLowerCase().includes('does not exist')) {
            errMsg = `Không tìm thấy tài khoản TikTok @${username}!`;
        }
        io.emit('tiktok_status', {
            connected: false,
            error: errMsg
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
        dungeonTimeRemaining,
        dungeonTimeLimit: currentStage.timeLimit,
        isDungeonFailed,
        bossRage: Math.round(bossRage),
        isBossCharging,
        chargeCountdown,
        isBossStunned,
        chargeRemainingHits,
        chargeMaxHits,
        hunterShield,
        autoRageEnabled,
        isBossDefeated,
        lastHitter,
        topDps,
        topDonators,
        shadowArmy,
        stagesList: STAGES.map(s => ({ id: s.id, name: s.name, rank: s.rank, maxHp: s.maxHp, skillName: s.skillName, timeLimit: s.timeLimit })),
        tiktokStatus: {
            connected: isTikTokConnected,
            username: currentTikTokUsername
        }
    });

    // ADMIN & CLIENT ATTACK EVENTS
    socket.on('player_attack', (data) => {
        const fallbackProf = getRandomVietTikTokProfile();
        const uid = (data && data.uniqueId) || ('hunter_' + Math.floor(1000 + Math.random() * 9000));
        const nick = (data && data.nickname && !data.nickname.startsWith('Thợ Săn #')) ? data.nickname : fallbackProf.nickname;
        const avatar = (data && data.avatar) || fallbackProf.avatar;
        const user = getOrCreatePlayer(uid, nick, avatar);
        const count = (data && data.count) || 1;
        dealDamage(user, 15 * count, 'like');
    });

    socket.on('player_gift', (gift) => {
        const fallbackProf = getRandomVietTikTokProfile();
        const uid = (gift && gift.uniqueId) || ('vip_' + Math.floor(1000 + Math.random() * 9000));
        const nick = (gift && gift.nickname && !gift.nickname.startsWith('Thợ Săn #')) ? gift.nickname : fallbackProf.nickname;
        const avatar = (gift && gift.avatar) || fallbackProf.avatar;
        const user = getOrCreatePlayer(uid, nick, avatar);
        const diamonds = (gift && gift.diamonds) || 1;
        user.totalDiamonds += diamonds;

        let dmg = diamonds * 500;
        if (diamonds >= 99) {
            dmg = Math.max(100000, diamonds * 1500);
            user.isShadowSoldier = true;
            if (!shadowArmy.some(s => s.uniqueId === user.uniqueId)) {
                shadowArmy.unshift({
                    uniqueId: user.uniqueId,
                    nickname: user.nickname,
                    avatar: user.avatar,
                    rank: 'S'
                });
                if (shadowArmy.length > 8) shadowArmy.pop();
            }
            io.emit('arise_activated', {
                player: {
                    nickname: user.nickname,
                    avatar: user.avatar,
                    rank: user.rank
                },
                giftName: gift.giftName,
                diamonds
            });
        }

        dealDamage(user, dmg, 'gift', {
            giftName: gift.giftName,
            giftIcon: gift.giftIcon,
            diamonds
        });
    });

    socket.on('admin_tap_attack', (count = 1) => {
        const prof = getRandomVietTikTokProfile();
        const testUser = getOrCreatePlayer(prof.id, prof.nickname, prof.avatar);
        dealDamage(testUser, 15 * count, 'like');
    });

    // Admin Boss Counter-Attack & Rage controls
    socket.on('admin_trigger_boss_charge', (duration) => {
        startBossCharge(duration);
    });

    socket.on('admin_trigger_boss_attack', () => {
        executeBossAttack();
    });

    socket.on('admin_stun_boss', () => {
        const p = getOrCreatePlayer('admin_breaker', 'Quản Trị Viên (Admin)', DEFAULT_AVATARS[0]);
        stunBoss(p);
    });

    socket.on('admin_add_rage', (amount = 25) => {
        bossRage = Math.min(100, bossRage + amount);
        io.emit('boss_rage_updated', {
            bossRage: Math.round(bossRage),
            hunterShield
        });
        if (bossRage >= 100) {
            startBossCharge();
        }
    });

    socket.on('admin_toggle_auto_rage', (val) => {
        autoRageEnabled = (val !== undefined) ? val : !autoRageEnabled;
        io.emit('auto_rage_status', { autoRageEnabled });
    });

    socket.on('admin_mock_gift', (gift) => {
        const fallbackProf = getRandomVietTikTokProfile();
        const testUser = getOrCreatePlayer(
            gift.uniqueId || ('vip_' + Math.floor(1000 + Math.random() * 9000)),
            gift.nickname || fallbackProf.nickname,
            gift.avatar || fallbackProf.avatar
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
        isDungeonFailed = false;
        lastHitter = null;
        resetBossRageState();
        startDungeonTimer();
        io.emit('boss_reset', {
            stage: s,
            bossCurrentHp,
            bossMaxHp: s.maxHp,
            bossRage: 0,
            hunterShield: 100
        });
    });

    socket.on('admin_set_dungeon_timer', (sec = 10) => {
        dungeonTimeRemaining = Math.max(1, sec);
        io.emit('dungeon_timer_tick', {
            remaining: dungeonTimeRemaining,
            total: STAGES[currentStageIndex].timeLimit,
            isWarning: dungeonTimeRemaining <= 30
        });
    });

    socket.on('admin_trigger_dungeon_fail', () => {
        onDungeonFailed();
    });

    socket.on('admin_play_sound', (soundName) => {
        io.emit('play_sound_effect', soundName);
    });

    socket.on('admin_mock_10_hunters', () => {
        const MOCK_HUNTERS = [
            { id: 'vn_01', name: 'Nguyễn Hoàng Long', exp: 620000, dmg: 350000, dia: 520, rank: 'QUỐC GIA', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
            { id: 'vn_11', name: 'Khánh Huyền ✨', exp: 185000, dmg: 195000, dia: 120, rank: 'S', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
            { id: 'vn_09', name: 'Duy Nến Gaming 🎮', exp: 142000, dmg: 140000, dia: 100, rank: 'S', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
            { id: 'vn_02', name: 'Minh Quân 2k4', exp: 95000, dmg: 98000, dia: 80, rank: 'S', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
            { id: 'vn_12', name: 'Thuỳ Linh 2k3 🌸', exp: 76000, dmg: 75000, dia: 60, rank: 'S', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
            { id: 'vn_08', name: 'Boy Phố Hải Phòng 🏍️', exp: 46000, dmg: 52000, dia: 45, rank: 'A', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
            { id: 'vn_03', name: 'Lê Tuấn Anh', exp: 32000, dmg: 36000, dia: 30, rank: 'A', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150' },
            { id: 'vn_17', name: 'Bé Heo Dễ Thương 🐷', exp: 18000, dmg: 21000, dia: 15, rank: 'B', avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150' },
            { id: 'vn_05', name: 'Phan Bảo Nam', exp: 8500, dmg: 15000, dia: 8, rank: 'C', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150' },
            { id: 'vn_13', name: 'Ngọc Ánh 🎀', exp: 3200, dmg: 8500, dia: 2, rank: 'D', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' }
        ];

        for (const m of MOCK_HUNTERS) {
            const p = getOrCreatePlayer(m.id, m.name, m.avatar);
            p.exp = m.exp;
            p.level = calculateLevel(m.exp);
            p.rank = m.rank;
            p.totalDamage = m.dmg;
            p.totalDiamonds = m.dia;
        }

        updateLeaderboards();
        io.emit('leaderboard_updated', { topDps, topDonators, currentStage });
        console.log('✅ Đã nạp danh sách 10 thợ săn hàng đầu (Nick TikTok Việt thật 100%)');
    });

    socket.on('admin_mock_level_up', () => {
        const candidateProfiles = VIET_TIKTOK_PROFILES.slice(0, 10);
        const chosen = candidateProfiles[Math.floor(Math.random() * candidateProfiles.length)];
        const p = getOrCreatePlayer(chosen.id, chosen.nickname, chosen.avatar);
        const oldLvl = p.level || 1;
        const newLvl = oldLvl + 1;
        p.level = newLvl;
        p.exp += newLvl * 150;
        p.rank = calculateRank(p.exp, p.totalDiamonds);
        p.totalDamage += 15000;
        updateLeaderboards();
        io.emit('leaderboard_updated', { topDps, topDonators, currentStage });

        io.emit('hunter_level_up', {
            player: {
                uniqueId: p.uniqueId,
                nickname: chosen.nickname,
                avatar: chosen.avatar,
                rank: p.rank,
                level: p.level
            },
            oldLevel: oldLvl,
            newLevel: newLvl,
            oldRank: p.rank,
            newRank: p.rank,
            isLevelUp: true,
            isRankUp: false,
            quote: chosen.quote || 'Sức mạnh ma lực được khai mở vượt bậc!'
        });
        console.log(`✨ Mock Level Up emitted cho ${chosen.nickname}: Lv.${oldLvl} -> Lv.${newLvl}`);
    });

    socket.on('admin_reset_all_hunters', () => {
        players.clear();
        updateLeaderboards();
        io.emit('leaderboard_updated', { topDps, topDonators, currentStage });
        console.log('🔄 Đã xoá toàn bộ dữ liệu thợ săn theo yêu cầu Admin');
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
    startDungeonTimer();
    console.log(`=======================================================`);
    console.log(`⚔️ GAME SOLO LEVELING RAID BOSS ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`🎮 BẢNG QUẢN TRỊ ADMIN TEST: http://localhost:${PORT}/admin.html`);
    console.log(`=======================================================`);
});
