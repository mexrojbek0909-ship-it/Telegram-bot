# admin.py
from telegram import Update
from telegram.ext import CommandHandler, ContextTypes
from database import get_users_count, get_all_users

ADMIN_ID = 123456789  # YOUR TELEGRAM ID


def admin_only(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if update.effective_user.id != ADMIN_ID:
            return
        return await func(update, context)
    return wrapper


@admin_only
async def admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    count = get_users_count()
    await update.message.reply_text(f"👤 Total users: {count}")


@admin_only
async def broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = " ".join(context.args)
    if not text:
        await update.message.reply_text("Usage: /broadcast message")
        return
    for user_id in get_all_users():
        try:
            await context.bot.send_message(user_id, text)
        except:
            pass
    await update.message.reply_text("Broadcast sent.")


def admin_router():
    from telegram.ext import ApplicationHandlerStop
    return CommandHandler(
        ["admin", "broadcast"],
        lambda u, c: admin_panel(u, c)
        if u.message.text.startswith("/admin")
        else broadcast(u, c),
    )
