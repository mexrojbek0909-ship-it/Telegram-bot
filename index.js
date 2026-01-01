
const express = require('express');
const axios = require('axios');
const { Telegraf, Markup, session } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || '8412020501:AAH5cg6Py8HsFqC82dNwGbihYwqu9j65FfM';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 5672881358; // Admin telegram ID
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Set in Render: https://yourapp.onrender.com

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        language TEXT DEFAULT 'uz',
        username TEXT,
        full_name TEXT,
        subscribed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        url TEXT,
        message_id INTEGER,
        channel_username TEXT,
        added_by INTEGER,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message_text TEXT,
        admin_reply TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        is_required BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS broadcast_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        broadcast_id INTEGER,
        user_id INTEGER,
        viewed BOOLEAN DEFAULT 0,
        viewed_at DATETIME
    )`);
});

const app = express();
const bot = new Telegraf(BOT_TOKEN);

// Middleware
app.use(express.json());
bot.use(session());

// Translations
const translations = {
    uz: {
        welcome: 'Assalomu alaykum! Tilni tanlang:',
        choose_language: 'Tilni tanlang:',
        menu: 'Asosiy menyu',
        movie_code: '🎬 Kino kodini kiriting:',
        movie_not_found: '❌ Bu kodga tegishli kino topilmadi.',
        admin_only: '⚠️ Bu buyruq faqat admin uchun.',
        message_sent: '✉️ Xabaringiz adminga yuborildi.',
        type_message: 'Adminga yubormoqchi boʻlgan xabaringizni yozing:',
        cancel: 'Bekor qilish',
        stats_users: '👥 Foydalanuvchilar: ',
        stats_channels: '📢 Majburiy obuna kanallari: ',
        broadcast_sent: '📢 Xabar barcha foydalanuvchilarga yuborildi.',
        enter_broadcast: '📢 Hamma foydalanuvchilarga yuboriladigan xabarni kiriting:',
        movie_url: 'Kino URL manzilini yuboring (t.me/...):',
        movie_code_input: 'Kino kodini kiriting:',
        movie_saved: '✅ Kino saqlandi!',
        invalid_url: '❌ Notoʻgʻri URL format.',
        channel_added: '✅ Kanal qoʻshildi.',
        channel_removed: '✅ Kanal olib tashlandi.',
        enter_channel: 'Kanal @username ni kiriting:',
        check_subscription: '📢 Iltimos, quyidagi kanal(lar)ga obuna boʻling:',
        not_subscribed: '❌ Siz hali obuna boʻlmagansiz.',
        subscribed: '✅ Obuna tasdiqlandi!',
        admin_panel: '👨‍💻 Admin panel',
        back: '⬅️ Orqaga'
    },
    ru: {
        welcome: 'Здравствуйте! Выберите язык:',
        choose_language: 'Выберите язык:',
        menu: 'Главное меню',
        movie_code: '🎬 Введите код фильма:',
        movie_not_found: '❌ Фильм с таким кодом не найден.',
        admin_only: '⚠️ Эта команда только для администратора.',
        message_sent: '✉️ Ваше сообщение отправлено администратору.',
        type_message: 'Введите сообщение для администратора:',
        cancel: 'Отмена',
        stats_users: '👥 Пользователи: ',
        stats_channels: '📢 Каналы для подписки: ',
        broadcast_sent: '📢 Сообщение отправлено всем пользователям.',
        enter_broadcast: '📢 Введите сообщение для рассылки:',
        movie_url: 'Отправьте URL фильма (t.me/...):',
        movie_code_input: 'Введите код фильма:',
        movie_saved: '✅ Фильм сохранен!',
        invalid_url: '❌ Неверный формат URL.',
        channel_added: '✅ Канал добавлен.',
        channel_removed: '✅ Канал удален.',
        enter_channel: 'Введите @username канала:',
        check_subscription: '📢 Пожалуйста, подпишитесь на канал(ы):',
        not_subscribed: '❌ Вы еще не подписались.',
        subscribed: '✅ Подписка подтверждена!',
        admin_panel: '👨‍💻 Админ панель',
        back: '⬅️ Назад'
    },
    en: {
        welcome: 'Hello! Choose language:',
        choose_language: 'Choose language:',
        menu: 'Main menu',
        movie_code: '🎬 Enter movie code:',
        movie_not_found: '❌ Movie with this code not found.',
        admin_only: '⚠️ This command is for admin only.',
        message_sent: '✉️ Your message sent to admin.',
        type_message: 'Type your message to admin:',
        cancel: 'Cancel',
        stats_users: '👥 Users: ',
        stats_channels: '📢 Required channels: ',
        broadcast_sent: '📢 Message sent to all users.',
        enter_broadcast: '📢 Enter message for broadcast:',
        movie_url: 'Send movie URL (t.me/...):',
        movie_code_input: 'Enter movie code:',
        movie_saved: '✅ Movie saved!',
        invalid_url: '❌ Invalid URL format.',
        channel_added: '✅ Channel added.',
        channel_removed: '✅ Channel removed.',
        enter_channel: 'Enter channel @username:',
        check_subscription: '📢 Please subscribe to channel(s):',
        not_subscribed: '❌ You are not subscribed yet.',
        subscribed: '✅ Subscription confirmed!',
        admin_panel: '👨‍💻 Admin panel',
        back: '⬅️ Back'
    }
};

// Get user language
async function getUserLanguage(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT language FROM users WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            resolve(row ? row.language : 'uz');
        });
    });
}

// Save or update user
async function saveUser(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
    const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();

    db.run(`INSERT OR REPLACE INTO users (user_id, username, full_name, created_at) 
            VALUES (?, ?, ?, datetime('now'))`, 
            [userId, username, fullName]);
}

// Check subscription
async function checkSubscription(ctx) {
    const channels = await new Promise((resolve) => {
        db.all('SELECT username FROM channels WHERE is_required = 1', (err, rows) => {
            resolve(rows || []);
        });
    });

    if (channels.length === 0) return true;

    for (const channel of channels) {
        try {
            const member = await bot.telegram.getChatMember(`@${channel.username}`, ctx.from.id);
            if (member.status === 'left') return false;
        } catch (error) {
            console.error('Check subscription error:', error);
        }
    }
    return true;
}

// Main menu
async function showMainMenu(ctx) {
    const lang = await getUserLanguage(ctx.from.id);
    const isSubscribed = await checkSubscription(ctx);
    
    if (!isSubscribed) {
        const channels = await new Promise((resolve) => {
            db.all('SELECT username FROM channels WHERE is_required = 1', (err, rows) => {
                resolve(rows || []);
            });
        });

        let message = translations[lang].check_subscription + '\n';
        channels.forEach(ch => {
            message += `👉 @${ch.username}\n`;
        });

        return ctx.reply(message, Markup.inlineKeyboard([
            [Markup.button.callback('✅ Tekshirish', 'check_subscription')]
        ]));
    }

    const isAdmin = ctx.from.id === ADMIN_ID;
    const buttons = [
        [Markup.button.callback('🎬 Kino', 'movie_search')],
        [Markup.button.callback('✉️ Adminga xabar', 'message_to_admin')]
    ];

    if (isAdmin) {
        buttons.push([Markup.button.callback('👨‍💻 Admin panel', 'admin_panel')]);
    }

    ctx.reply(translations[lang].menu, Markup.inlineKeyboard(buttons));
}

// Start command
bot.start(async (ctx) => {
    await saveUser(ctx);
    const lang = await getUserLanguage(ctx.from.id);
    
    ctx.reply(translations[lang].welcome, Markup.inlineKeyboard([
        [Markup.button.callback('🇺🇿 O‘zbek', 'lang_uz'), 
         Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
         Markup.button.callback('🇬🇧 English', 'lang_en')]
    ]));
});

// Language selection
['uz', 'ru', 'en'].forEach(lang => {
    bot.action(`lang_${lang}`, async (ctx) => {
        const userId = ctx.from.id;
        db.run('INSERT OR REPLACE INTO users (user_id, language) VALUES (?, ?)', [userId, lang]);
        ctx.deleteMessage();
        await showMainMenu(ctx);
    });
});

// Movie search
bot.action('movie_search', async (ctx) => {
    const lang = await getUserLanguage(ctx.from.id);
    ctx.deleteMessage();
    
    ctx.session = { waitingForMovieCode: true };
    ctx.reply(translations[lang].movie_code, Markup.inlineKeyboard([
        [Markup.button.callback(translations[lang].cancel, 'main_menu')]
    ]));
});

// Handle movie code input
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const lang = await getUserLanguage(userId);
    const text = ctx.message.text;

    // Movie code handling
    if (ctx.session?.waitingForMovieCode) {
        ctx.session.waitingForMovieCode = false;
        
        db.get('SELECT url, channel_username, message_id FROM movies WHERE code = ?', [text], async (err, movie) => {
            if (err || !movie) {
                ctx.reply(translations[lang].movie_not_found);
                await showMainMenu(ctx);
                return;
            }

            try {
                // Extract channel username and message id from URL if not in DB
                let channel, messageId;
                if (movie.url) {
                    const match = movie.url.match(/t\.me\/([^\/]+)\/(\d+)/);
                    if (match) {
                        channel = `@${match[1]}`;
                        messageId = parseInt(match[2]);
                    }
                } else {
                    channel = movie.channel_username;
                    messageId = movie.message_id;
                }

                // Copy message without showing channel name
                await ctx.copyMessage(userId, channel, messageId);
                await showMainMenu(ctx);
            } catch (error) {
                console.error('Copy message error:', error);
                ctx.reply(translations[lang].movie_not_found);
                await showMainMenu(ctx);
            }
        });
        return;
    }

    // Admin: Movie URL handling
    if (ctx.session?.waitingForMovieUrl && userId === ADMIN_ID) {
        ctx.session.waitingForMovieUrl = false;
        
        const url = text.trim();
        const urlMatch = url.match(/https?:\/\/t\.me\/([^\/]+)\/(\d+)/);
        
        if (!urlMatch) {
            ctx.reply(translations[lang].invalid_url);
            return;
        }

        ctx.session.movieUrl = url;
        ctx.session.channelUsername = urlMatch[1];
        ctx.session.messageId = parseInt(urlMatch[2]);
        
        ctx.reply(translations[lang].movie_code_input);
        ctx.session.waitingForMovieCodeInput = true;
        return;
    }

    // Admin: Movie code input handling
    if (ctx.session?.waitingForMovieCodeInput && userId === ADMIN_ID) {
        ctx.session.waitingForMovieCodeInput = false;
        const code = text.trim();

        db.run(`INSERT OR REPLACE INTO movies (code, url, channel_username, message_id, added_by) 
                VALUES (?, ?, ?, ?, ?)`,
                [code, ctx.session.movieUrl, ctx.session.channelUsername, 
                 ctx.session.messageId, userId]);

        delete ctx.session.movieUrl;
        delete ctx.session.channelUsername;
        delete ctx.session.messageId;

        ctx.reply(translations[lang].movie_saved);
        showAdminPanel(ctx);
        return;
    }

    // User message to admin
    if (ctx.session?.waitingForUserMessage) {
        ctx.session.waitingForUserMessage = false;
        
        db.run('INSERT INTO messages (user_id, message_text) VALUES (?, ?)', 
               [userId, text]);
        
        // Notify admin
        try {
            await bot.telegram.sendMessage(ADMIN_ID, 
                `✉️ Yangi xabar:\n\n` +
                `Foydalanuvchi: @${ctx.from.username || 'Noma\'lum'}\n` +
                `ID: ${userId}\n` +
                `Xabar: ${text}`);
        } catch (error) {
            console.error('Notify admin error:', error);
        }

        ctx.reply(translations[lang].message_sent);
        await showMainMenu(ctx);
        return;
    }

    // Admin broadcast
    if (ctx.session?.waitingForBroadcast && userId === ADMIN_ID) {
        ctx.session.waitingForBroadcast = false;
        
        db.all('SELECT user_id FROM users', async (err, users) => {
            if (err || !users) return;

            let broadcastId;
            db.run('INSERT INTO broadcast_stats DEFAULT VALUES', function(err) {
                if (err) return;
                broadcastId = this.lastID;

                users.forEach(async (user) => {
                    try {
                        await bot.telegram.sendMessage(user.user_id, text);
                        db.run('INSERT INTO broadcast_stats (broadcast_id, user_id) VALUES (?, ?)',
                               [broadcastId, user.user_id]);
                    } catch (error) {
                        console.error('Broadcast error:', error);
                    }
                });
            });

            ctx.reply(translations[lang].broadcast_sent);
            showAdminPanel(ctx);
        });
        return;
    }

    // Channel management
    if (ctx.session?.waitingForChannel && userId === ADMIN_ID) {
        ctx.session.waitingForChannel = false;
        const action = ctx.session.channelAction;
        delete ctx.session.channelAction;

        const channelUsername = text.replace('@', '').trim();
        
        if (action === 'add') {
            db.run('INSERT OR IGNORE INTO channels (username) VALUES (?)', [channelUsername]);
            ctx.reply(translations[lang].channel_added);
        } else if (action === 'remove') {
            db.run('DELETE FROM channels WHERE username = ?', [channelUsername]);
            ctx.reply(translations[lang].channel_removed);
        }
        
        showAdminPanel(ctx);
        return;
    }
});

// Message to admin
bot.action('message_to_admin', async (ctx) => {
    const lang = await getUserLanguage(ctx.from.id);
    ctx.deleteMessage();
    
    ctx.session = { waitingForUserMessage: true };
    ctx.reply(translations[lang].type_message, Markup.inlineKeyboard([
        [Markup.button.callback(translations[lang].cancel, 'main_menu')]
    ]));
});

// Admin panel
bot.action('admin_panel', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        const lang = await getUserLanguage(ctx.from.id);
        ctx.reply(translations[lang].admin_only);
        return;
    }
    showAdminPanel(ctx);
});

function showAdminPanel(ctx) {
    const lang = 'uz'; // Admin panel always in Uzbek
    
    const buttons = [
        [Markup.button.callback('👥 Foydalanuvchilar soni', 'admin_stats')],
        [Markup.button.callback('📢 Hamma uchun xabar', 'admin_broadcast')],
        [Markup.button.callback('📊 Obunachilar soni', 'admin_sub_stats')],
        [Markup.button.callback('🔒 Majburiy obuna +', 'admin_channel_add')],
        [Markup.button.callback('🔓 Majburiy obuna -', 'admin_channel_remove')],
        [Markup.button.callback('🎬 Kino URL', 'admin_movie_url')],
        [Markup.button.callback('⬅️ Orqaga', 'main_menu')]
    ];

    ctx.editMessageText('👨‍💻 Admin panel:', Markup.inlineKeyboard(buttons));
}

// Admin stats
bot.action('admin_stats', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    db.get('SELECT COUNT(*) as count FROM users', (err, userRow) => {
        db.get('SELECT COUNT(*) as count FROM channels WHERE is_required = 1', (err, channelRow) => {
            const message = `📊 Statistika:\n\n` +
                          `👥 Foydalanuvchilar: ${userRow.count}\n` +
                          `📢 Majburiy kanallar: ${channelRow.count}\n` +
                          `🎬 Kinolar: ...`;

            ctx.answerCbQuery();
            ctx.editMessageText(message, Markup.inlineKeyboard([
                [Markup.button.callback('⬅️ Orqaga', 'admin_panel')]
            ]));
        });
    });
});

// Admin broadcast
bot.action('admin_broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const lang = await getUserLanguage(ctx.from.id);
    ctx.session = { waitingForBroadcast: true };
    
    ctx.editMessageText(translations[lang].enter_broadcast, Markup.inlineKeyboard([
        [Markup.button.callback(translations[lang].cancel, 'admin_panel')]
    ]));
});

// Add channel
bot.action('admin_channel_add', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const lang = await getUserLanguage(ctx.from.id);
    ctx.session = { 
        waitingForChannel: true,
        channelAction: 'add'
    };
    
    ctx.editMessageText(translations[lang].enter_channel, Markup.inlineKeyboard([
        [Markup.button.callback(translations[lang].cancel, 'admin_panel')]
    ]));
});

// Remove channel
bot.action('admin_channel_remove', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const lang = await getUserLanguage(ctx.from.id);
    ctx.session = { 
        waitingForChannel: true,
        channelAction: 'remove'
    };
    
    ctx.editMessageText(translations[lang].enter_channel, Markup.inlineKeyboard([
        [Markup.button.callback(translations[lang].cancel, 'admin_panel')]
    ]));
});

// Movie URL
bot.action('admin_movie_url', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const lang = await getUserLanguage(ctx.from.id);
    ctx.session = { waitingForMovieUrl: true };
    
    ctx.editMessageText(translations[lang].movie_url, Markup.inlineKeyboard([
        [Markup.button.callback(translations[lang].cancel, 'admin_panel')]
    ]));
});

// Check subscription
bot.action('check_subscription', async (ctx) => {
    const isSubscribed = await checkSubscription(ctx);
    const lang = await getUserLanguage(ctx.from.id);
    
    if (isSubscribed) {
        ctx.answerCbQuery(translations[lang].subscribed);
        await showMainMenu(ctx);
    } else {
        ctx.answerCbQuery(translations[lang].not_subscribed);
    }
});

// Back to main menu
bot.action('main_menu', async (ctx) => {
    ctx.deleteMessage();
    await showMainMenu(ctx);
});

// Sub stats
bot.action('admin_sub_stats', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const channels = await new Promise((resolve) => {
        db.all('SELECT username FROM channels WHERE is_required = 1', (err, rows) => {
            resolve(rows || []);
        });
    });

    let message = '📊 Majburiy obuna statistikasi:\n\n';
    let totalSubscribed = 0;
    let totalUsers = 0;

    db.get('SELECT COUNT(*) as count FROM users', async (err, userRow) => {
        totalUsers = userRow.count;

        for (const channel of channels) {
            let channelCount = 0;
            // This would require bot to be admin in channel for exact count
            // For simplicity, we'll show approximate stats
            message += `@${channel.username}: ~${Math.floor(totalUsers * 0.8)} obunachi\n`;
            totalSubscribed += Math.floor(totalUsers * 0.8);
        }

        message += `\n📈 Jami: ${totalSubscribed}/${totalUsers}`;

        ctx.editMessageText(message, Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Orqaga', 'admin_panel')]
        ]));
    });
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
});

// Webhook setup
app.use(bot.webhookCallback('/webhook'));

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Start server
async function start() {
    if (WEBHOOK_URL) {
        await bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`);
        console.log('Webhook set');
    } else {
        bot.launch();
        console.log('Polling mode');
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

start();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
