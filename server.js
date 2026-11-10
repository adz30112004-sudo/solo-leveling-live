const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection } = require('tiktok-live-connector');

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

// Trạng thái phiên Live & Game
let tiktokConnection = null;
let currentTikTokUsername = '';
let isTikTokConnected = false;

// Hàng đợi và trạng thái game
const gameState = {
    maleQueue: [],
    femaleQueue: [],
    currentMatch: null,
    matchTimer: null,
    topDonators: [], // Top 3 Đại Gia
    donatorStats: new Map() // uniqueId -> { nickname, avatar, totalDiamonds }
};

// Mẫu avatar mặc định khi test
const DEFAULT_AVATARS_MALE = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
];

const DEFAULT_AVATARS_FEMALE = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
];

let pirateClient = null;

// Hàm kết nối TikTok Live trực tiếp (Không cần API key, không phụ thuộc EulerStream)
async function connectToTikTok(username) {
    if (!username) return;
    username = username.replace(/^@/, '').trim();

    if (pirateClient) {
        try {
            pirateClient.disconnect();
        } catch (e) { }
        pirateClient = null;
    }

    currentTikTokUsername = username;
    console.log(`📡 Đang bắt đầu kết nối trực tiếp phòng Live của @${username}...`);

    try {
        const { TikTokLiveClient, EventType, isStreakOver } = await import('piratetok-live-js');
        const client = new TikTokLiveClient(username);
        pirateClient = client;

        // Xử lý Chat
        client.on(EventType.chat, data => {
            const nickname = data.user?.nickname || data.user?.uniqueId || 'Khán giả';
            const uniqueId = data.user?.uniqueId || ('user_' + Date.now());
            const avatar = data.user?.profilePictureUrl || 
                           data.user?.avatarThumb?.urlList?.[0] || 
                           DEFAULT_AVATARS_MALE[0];
            const comment = data.content || '';

            handleUserChat({
                uniqueId: uniqueId,
                nickname: nickname,
                avatar: avatar,
                comment: comment
            });
        });

        // Xử lý Quà tặng (Gift)
        client.on(EventType.gift, data => {
            if (typeof isStreakOver === 'function' && !isStreakOver(data)) {
                return;
            }

            const nickname = data.user?.nickname || data.user?.uniqueId || 'Khán giả';
            const uniqueId = data.user?.uniqueId || ('user_' + Date.now());
            const avatar = data.user?.profilePictureUrl || 
                           data.user?.avatarThumb?.urlList?.[0] || 
                           DEFAULT_AVATARS_MALE[0];
            const giftName = data.gift?.name || data.gift?.describe || 'Hoa Hồng';
            const repeatCount = Number(data.repeatCount) || 1;
            const singleDiamonds = Number(data.gift?.diamondCount) || 1;
            const giftIcon = data.gift?.image?.urlList?.[0] || '';

            handleUserGift({
                uniqueId: uniqueId,
                nickname: nickname,
                profilePictureUrl: avatar,
                giftName: giftName,
                repeatCount: repeatCount,
                diamondCount: singleDiamonds,
                giftPictureUrl: giftIcon
            });
        });

        // Xử lý Like
        client.on(EventType.like, data => {
            io.emit('new_like', {
                nickname: data.user?.nickname || 'Khán giả',
                likeCount: Number(data.count) || 1,
                totalLikes: Number(data.total) || 1
            });
        });

        // Xử lý tham gia phòng
        client.on(EventType.member, data => {
            io.emit('new_member', {
                uniqueId: data.user?.uniqueId || '',
                nickname: data.user?.nickname || 'Khán giả',
                avatar: data.user?.profilePictureUrl || ''
            });
        });

        // Ngắt kết nối
        client.on(EventType.disconnected, () => {
            isTikTokConnected = false;
            console.log(`⚠️ Phòng Live @${username} đã ngắt kết nối`);
            io.emit('tiktok_status', { connected: false, error: 'Phòng Live đã ngắt kết nối', username: username });
        });

        client.on(EventType.liveEnded, () => {
            isTikTokConnected = false;
            console.log(`🛑 Phiên Live @${username} đã kết thúc`);
            io.emit('tiktok_status', { connected: false, error: 'Phiên Live đã kết thúc', username: username });
        });

        // Kết nối WebSocket trực tiếp
        const roomId = await client.connect();
        isTikTokConnected = true;
        console.log(`✅ [Trực Tiếp] ĐÃ KẾT NỐI THÀNH CÔNG phòng Live: @${username} (Room ID: ${roomId})`);
        io.emit('tiktok_status', { connected: true, username: username, roomId: String(roomId) });

    } catch (err) {
        isTikTokConnected = false;
        console.error(`❌ Lỗi kết nối TikTok Live @${username}:`, err.message);
        io.emit('tiktok_status', { connected: false, error: err.message, username: username });
    }
}

// Xử lý Chat để phân loại Nam / Nữ
function handleUserChat(data) {
    const text = data.comment.trim().toLowerCase();
    const avatar = data.profilePictureUrl || DEFAULT_AVATARS_MALE[0];
    const nickname = data.nickname || data.uniqueId;
    const uniqueId = data.uniqueId;

    let gender = null;
    if (text === '1' || text.includes('nam') || text.includes('trai') || text.includes('boy')) {
        gender = 'male';
    } else if (text === '2' || text.includes('nữ') || text.includes('nu') || text.includes('gai') || text.includes('girl')) {
        gender = 'female';
    }

    if (gender) {
        addUserToQueue({
            id: uniqueId,
            nickname: nickname,
            avatar: avatar,
            gender: gender
        });
    }

    // Phát sự kiện chat bubble lên màn hình
    io.emit('new_chat', {
        id: uniqueId,
        nickname: nickname,
        avatar: avatar,
        comment: data.comment
    });
}

// Xử lý Gift Donate
function handleUserGift(data) {
    const uniqueId = data.uniqueId;
    const nickname = data.nickname || uniqueId;
    const avatar = data.profilePictureUrl || DEFAULT_AVATARS_MALE[0];
    const giftName = data.giftName || 'Hoa Hồng';
    const repeatCount = data.repeatCount || 1;
    const diamonds = (data.diamondCount || 1) * repeatCount;
    const giftIcon = data.giftPictureUrl || '';

    // Cập nhật Bảng Vàng Đại Gia
    let donator = gameState.donatorStats.get(uniqueId);
    if (!donator) {
        donator = { nickname, avatar, totalDiamonds: 0 };
    }
    donator.totalDiamonds += diamonds;
    gameState.donatorStats.set(uniqueId, donator);

    updateTopDonators();

    // Phát alert quà lên màn hình
    io.emit('new_gift', {
        id: uniqueId,
        nickname: nickname,
        avatar: avatar,
        giftName: giftName,
        repeatCount: repeatCount,
        diamonds: diamonds,
        giftIcon: giftIcon
    });

    // 1. TẶNG QUÀ CHỌN PHÁI: HOA HỒNG = PHÁI NAM, TIKTOK = PHÁI NỮ
    const lowerGiftName = giftName.toLowerCase();
    if (lowerGiftName.includes('rose') || lowerGiftName.includes('hoa hồng') || lowerGiftName.includes('hoa hong')) {
        addUserToQueue({
            id: uniqueId,
            nickname: nickname,
            avatar: avatar,
            gender: 'male'
        });
    } else if (lowerGiftName.includes('tiktok') || lowerGiftName.includes('tik tok')) {
        addUserToQueue({
            id: uniqueId,
            nickname: nickname,
            avatar: avatar,
            gender: 'female'
        });
    }

    // 2. CƯỚP BỒ: QUÀ TẶNG "HẠC GIẤY" (PAPER CRANE 99 XU) HOẶC QUÀ TỪ 99 XU
    const isStealGift = lowerGiftName.includes('hạc giấy') ||
        lowerGiftName.includes('hac giay') ||
        lowerGiftName.includes('crane') ||
        lowerGiftName.includes('paper crane') ||
        diamonds >= 99 ||
        lowerGiftName.includes('gg') ||
        lowerGiftName.includes('crown');

    if (isStealGift && gameState.currentMatch && gameState.currentMatch.status !== 'finished') {
        stealPartner({
            id: uniqueId,
            nickname: nickname,
            avatar: avatar,
            diamonds: diamonds,
            giftName: giftName
        });
        return;
    }

    // 3. THANG ĐIỂM CHÚC PHÚC & PHÁ DUYÊN KHI ĐANG GHÉP ĐÔI (5 XU, 10 XU, 20 XU)
    if (gameState.currentMatch && gameState.currentMatch.status !== 'finished') {
        let delta = 0;
        let actionType = null;

        // CHÚC PHÚC (5 xu -> +1%, 10 xu -> +2%, 20 xu -> +4%)
        if (lowerGiftName.includes('bắn tim') || lowerGiftName.includes('finger heart')) {
            delta = +1;
            actionType = 'bless';
        } else if (lowerGiftName.includes('rosa')) {
            delta = +2;
            actionType = 'bless';
        } else if (lowerGiftName.includes('little kisses') || lowerGiftName.includes('kiss') || lowerGiftName.includes('hôn')) {
            delta = +4;
            actionType = 'bless';
        }
        // PHÁ DUYÊN (5 xu -> -1%, 10 xu -> -2%, 20 xu -> -4%)
        else if (lowerGiftName.includes('ok') || lowerGiftName.includes('okay')) {
            delta = -1; // OK (Okay) 5 xu
            actionType = 'curse';
        } else if (lowerGiftName.includes('heo') || lowerGiftName.includes('pig') || lowerGiftName.includes('chú heo')) {
            delta = -2; // Chú Heo May Mắn (Lucky Pig) 10 xu
            actionType = 'curse';
        } else if (lowerGiftName.includes('perfume') || lowerGiftName.includes('nước hoa')) {
            delta = -4; // Nước Hoa Perfume 20 xu
            actionType = 'curse';
        } else if (diamonds >= 1) {
            delta = +1;
            actionType = 'bless';
        }

        if (delta !== 0) {
            const count = Math.max(1, repeatCount || 1);
            const totalDelta = delta * count;

            // Nếu đang trong trạng thái khởi đầu 'pairing', lập tức chuyển sang 'paired' và đếm ngược
            if (gameState.currentMatch.status === 'pairing') {
                gameState.currentMatch.status = 'paired';
                startMatchCountdown();
            }

            gameState.currentMatch.percentage = Math.max(1, Math.min(99, gameState.currentMatch.percentage + totalDelta));
            io.emit('match_updated', {
                match: gameState.currentMatch,
                percentage: gameState.currentMatch.percentage,
                delta: totalDelta,
                actionType: actionType,
                donator: nickname,
                giftName: giftName
            });
        }
    }
}

// Thêm user vào hàng đợi Nam/Nữ
function addUserToQueue(user) {
    const queue = user.gender === 'male' ? gameState.maleQueue : gameState.femaleQueue;

    // Tránh trùng lặp
    const exists = queue.some(u => u.id === user.id);
    if (!exists) {
        queue.push(user);
        io.emit('queue_updated', {
            maleQueue: gameState.maleQueue,
            femaleQueue: gameState.femaleQueue
        });

        // Nếu cả 2 hàng đợi đều có người và sàn đấu đang trống -> Tự động ghép đôi sau 2s
        if (!gameState.currentMatch && gameState.maleQueue.length > 0 && gameState.femaleQueue.length > 0) {
            triggerNextMatch();
        }
    }
}

// Ghép đôi cặp tiếp theo
function triggerNextMatch() {
    if (gameState.maleQueue.length === 0 || gameState.femaleQueue.length === 0) return;

    if (gameState.matchTimer) {
        clearInterval(gameState.matchTimer);
        gameState.matchTimer = null;
    }

    const male = gameState.maleQueue.shift();
    const female = gameState.femaleQueue.shift();

    // Tính % tình duyên ngẫu nhiên (50% - 99%)
    const percentage = Math.floor(Math.random() * 45) + 55;

    gameState.currentMatch = {
        id: Date.now(),
        male: male,
        female: female,
        percentage: percentage,
        status: 'pairing', // 'pairing' -> 'paired' -> 'finished'
        countdown: 60 // 60 giây để xác lập tình cảm, giao lưu hoặc cướp bồ
    };

    io.emit('queue_updated', {
        maleQueue: gameState.maleQueue,
        femaleQueue: gameState.femaleQueue
    });

    io.emit('new_match_started', gameState.currentMatch);

    // Chuyển sang trạng thái ghép thành công sau 2.5s hoạt ảnh
    setTimeout(() => {
        if (gameState.currentMatch && gameState.currentMatch.id === gameState.currentMatch.id) {
            gameState.currentMatch.status = 'paired';
            io.emit('match_status_changed', gameState.currentMatch);
            startMatchCountdown();
        }
    }, 2500);
}

// Đếm ngược xác lập tình yêu
function startMatchCountdown() {
    if (gameState.matchTimer) clearInterval(gameState.matchTimer);

    gameState.matchTimer = setInterval(() => {
        if (!gameState.currentMatch) {
            clearInterval(gameState.matchTimer);
            return;
        }

        gameState.currentMatch.countdown -= 1;
        io.emit('match_countdown', gameState.currentMatch.countdown);

        if (gameState.currentMatch.countdown <= 0) {
            clearInterval(gameState.matchTimer);
            finishMatch();
        }
    }, 1000);
}

// Cướp bồ khi có người donate quà lớn
function stealPartner(thiefUser) {
    if (!gameState.currentMatch) return;

    // Ngẫu nhiên cướp chàng trai hoặc cô gái (hoặc theo giới tính)
    const isStealingFemale = Math.random() > 0.5;
    const victim = isStealingFemale ? gameState.currentMatch.male : gameState.currentMatch.female;

    if (isStealingFemale) {
        gameState.currentMatch.male = thiefUser;
    } else {
        gameState.currentMatch.female = thiefUser;
    }

    gameState.currentMatch.status = 'stolen';
    gameState.currentMatch.stolenBy = thiefUser;
    gameState.currentMatch.victim = victim;
    gameState.currentMatch.percentage = 99; // Cướp thành công thì độ hợp là 99%
    gameState.currentMatch.countdown = Math.max(gameState.currentMatch.countdown, 30); // Đảm bảo còn ít nhất 30s để đối thủ cay cú donate cướp lại!

    io.emit('partner_stolen', {
        match: gameState.currentMatch,
        thief: thiefUser,
        victim: victim
    });

    // 3 giây sau đổi lại status bình thường 'paired' để không hiện thông báo mãi
    setTimeout(() => {
        if (gameState.currentMatch && gameState.currentMatch.status === 'stolen') {
            gameState.currentMatch.status = 'paired';
        }
    }, 3000);
}

// Kết thúc cặp ghép đôi hiện tại
function finishMatch() {
    if (!gameState.currentMatch) return;

    gameState.currentMatch.status = 'finished';
    io.emit('match_finished', gameState.currentMatch);

    setTimeout(() => {
        gameState.currentMatch = null;
        io.emit('match_cleared');

        // Ghép tiếp nếu còn người
        if (gameState.maleQueue.length > 0 && gameState.femaleQueue.length > 0) {
            setTimeout(triggerNextMatch, 1500);
        }
    }, 6500);
}

// Cập nhật Top 3 Đại Gia
function updateTopDonators() {
    const sorted = Array.from(gameState.donatorStats.values())
        .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
        .slice(0, 3);

    gameState.topDonators = sorted;
    io.emit('top_donators_updated', sorted);
}

// Socket IO Kết nối
io.on('connection', socket => {
    // Gửi trạng thái ban đầu cho client vừa vào
    socket.emit('init_state', {
        tiktokStatus: { connected: isTikTokConnected, username: currentTikTokUsername },
        maleQueue: gameState.maleQueue,
        femaleQueue: gameState.femaleQueue,
        currentMatch: gameState.currentMatch,
        topDonators: gameState.topDonators
    });

    // Lệnh từ Admin/Test Panel
    socket.on('admin_connect_tiktok', data => {
        let username = '';
        let apiKey = null;
        if (typeof data === 'string') {
            username = data;
        } else if (data && typeof data === 'object') {
            username = data.username || '';
            apiKey = data.apiKey || null;
        }
        if (username) connectToTikTok(username.trim(), apiKey);
    });

    socket.on('admin_disconnect_tiktok', () => {
        if (pirateClient) {
            try {
                pirateClient.disconnect();
            } catch (e) {}
            pirateClient = null;
        }
        isTikTokConnected = false;
        currentTikTokUsername = '';
        console.log('🔌 Đã ngắt kết nối TikTok Live theo yêu cầu của Admin');
        io.emit('tiktok_status', { connected: false, error: 'Đã ngắt kết nối chủ động' });
    });

    socket.on('admin_simulate_join', data => {
        addUserToQueue({
            id: 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            nickname: data.nickname,
            avatar: data.avatar,
            gender: data.gender
        });
    });

    socket.on('admin_simulate_gift', data => {
        handleUserGift({
            uniqueId: data.uniqueId || 'mock_vip',
            nickname: data.nickname || 'Đại Gia Phố',
            profilePictureUrl: data.avatar || DEFAULT_AVATARS_MALE[0],
            giftName: data.giftName || 'Xe Thể Thao',
            repeatCount: 1,
            diamondCount: data.diamonds || 100,
            giftPictureUrl: data.giftIcon || ''
        });
    });

    socket.on('admin_trigger_next', () => {
        triggerNextMatch();
    });

    socket.on('admin_clear_queue', () => {
        gameState.maleQueue = [];
        gameState.femaleQueue = [];
        io.emit('queue_updated', {
            maleQueue: [],
            femaleQueue: []
        });
    });

    socket.on('admin_clear_match', () => {
        if (gameState.matchTimer) {
            clearInterval(gameState.matchTimer);
            gameState.matchTimer = null;
        }
        gameState.currentMatch = null;
        io.emit('match_cleared');
    });

    socket.on('admin_play_sound', soundName => {
        io.emit('play_sound', { sound: soundName });
    });

    socket.on('admin_toggle_bgm', isPlaying => {
        io.emit('toggle_bgm', isPlaying);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 GAME PHỐ ĐI BỘ GHÉP ĐÔI ĐANG CHẠY TẠI: http://localhost:${PORT}`);
    console.log(`🎮 BẢNG ĐIỀU KHIỂN GIẢ LẬP TEST: http://localhost:${PORT}/admin.html`);
    console.log(`=======================================================`);
});

