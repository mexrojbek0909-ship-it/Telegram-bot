# database.py
import sqlite3

DB_NAME = "bot.db"


def init_db():
    with sqlite3.connect(DB_NAME) as con:
        cur = con.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, language TEXT)"
        )
        con.commit()


def add_user(user_id: int):
    with sqlite3.connect(DB_NAME) as con:
        cur = con.cursor()
        cur.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))
        con.commit()


def set_language(user_id: int, lang: str):
    with sqlite3.connect(DB_NAME) as con:
        cur = con.cursor()
        cur.execute(
            "UPDATE users SET language = ? WHERE user_id = ?", (lang, user_id)
        )
        con.commit()


def get_language(user_id: int):
    with sqlite3.connect(DB_NAME) as con:
        cur = con.cursor()
        cur.execute("SELECT language FROM users WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        return row[0] if row else None


def get_users_count():
    with sqlite3.connect(DB_NAME) as con:
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        return cur.fetchone()[0]


def get_all_users():
    with sqlite3.connect(DB_NAME) as con:
        cur = con.cursor()
        cur.execute("SELECT user_id FROM users")
        return [row[0] for row in cur.fetchall()]
