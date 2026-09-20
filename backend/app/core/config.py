"""
ค่าตั้งต้นของระบบ อ่านมาจากไฟล์ .env

ทำไมต้องมีไฟล์นี้: เราไม่เขียนรหัสผ่านหรือ secret ลงในโค้ดตรงๆ
โค้ดอ่านค่าจากตรงนี้ที่เดียว เวลาเปลี่ยนค่าก็ไปแก้ที่ .env ไฟล์เดียวจบ

วิธีใช้ในไฟล์อื่น:
    from app.core.config import settings
    print(settings.DATABASE_URL)
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ---------- ฐานข้อมูล ----------
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@db:5432/lebis"

    # ---------- ความปลอดภัย ----------
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 วัน

    # ---------- CORS ----------
    # เก็บเป็นข้อความเดียวคั่นด้วยจุลภาค แล้วค่อยแตกเป็น list ด้วย cors_origins_list
    CORS_ORIGINS: str = "http://localhost:3000"

    # ---------- LINE (ใช้ Phase 3) ----------
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    LINE_CHANNEL_SECRET: str = ""

    # ---------- ทั่วไป ----------
    ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # ถ้าใน .env มีตัวแปรที่คลาสนี้ไม่รู้จัก ให้ข้ามไป ไม่ต้อง error
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """แปลง "a,b" เป็น ["a", "b"] ให้ FastAPI ใช้ได้"""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """อ่าน .env ครั้งเดียวแล้วจำไว้ ไม่ต้องอ่านซ้ำทุกครั้งที่เรียก"""
    return Settings()


settings = get_settings()
