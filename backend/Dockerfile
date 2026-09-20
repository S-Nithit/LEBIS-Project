FROM python:3.11-slim

# PYTHONDONTWRITEBYTECODE: ไม่ต้องสร้างไฟล์ .pyc ใน container
# PYTHONUNBUFFERED: ให้ print/log ออกมาทันที ไม่ค้างใน buffer เวลาดู docker logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# คัดลอก requirements ก่อนโค้ด เพื่อให้ docker cache ชั้น pip install ไว้
# แก้โค้ดแล้ว build ใหม่จะไม่ต้องลง package ใหม่ทั้งหมด
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# --reload = แก้โค้ดแล้วเซิร์ฟเวอร์รีสตาร์ทเอง ใช้ตอน dev เท่านั้น
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
