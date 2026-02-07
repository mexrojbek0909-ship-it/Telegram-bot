# main.py
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
)
from database import init_db, set_language, get_language, add_user
from admin import admin_router
from openai import OpenAI

BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"
OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"

logging.basicConfig(level=logging.INFO)

client = OpenAI(api_key=OPENAI_API_KEY)

with open("ai_prompt.txt", "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


LANG_TEXT = {
    "uz": {
        "choose": "Tilni tanlang:",
        "start": "Xush kelibsiz! Savolingizni yozing.",
    },
    "ru": {
        "choose": "Выберите язык:",
        "start": "Добро пожаловать! Задайте вопрос.",
    },
    "en": {
        "choose": "Choose language:",
        "start": "Welcome! Ask your question.",
    },
}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    add_user(user.id)
    keyboard = [
        [
            InlineKeyboardButton("🇺🇿 Uzbek", callback_data="lang_uz"),
            InlineKeyboardButton("🇷🇺 Русский", callback_data="lang_ru"),
            InlineKeyboardButton("🇬🇧 English", callback_data="lang_en"),
        ]
    ]
    await update.message.reply_text(
        "Choose language / Tilni tanlang / Выберите язык",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def lang_select(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    lang = query.data.split("_")[1]
    set_language(query.from_user.id, lang)
    await query.message.reply_text(LANG_TEXT[lang]["start"])


async def ai_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    lang = get_language(user_id)
    if not lang:
        await start(update, context)
        return

    prompt = f"{SYSTEM_PROMPT}\nLanguage: {lang}\nUser: {update.message.text}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": prompt}],
    )

    await update.message.reply_text(response.choices[0].message.content)


def main():
    init_db()
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(lang_select, pattern="^lang_"))
    app.add_handler(admin_router())
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, ai_reply))

    app.run_polling()


if __name__ == "__main__":
    main()
