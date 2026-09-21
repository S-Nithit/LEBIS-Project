# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /src

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8000

# คำสั่งเริ่มเซิร์ฟเวอร์
# - app:app  = ไฟล์ app.py ตัวแปรชื่อ app (ของเดิมเขียน app.main:app ซึ่งไม่มีในโปรเจกต์นี้
#   ตอนรันในเครื่องไม่พังเพราะ docker-compose.yaml เขียน command ทับไว้
#   แต่บน Railway ที่ใช้ Dockerfile ตรงๆ จะพังทันที)
# - ${PORT:-8000} = Railway กำหนดพอร์ตมาให้ผ่านตัวแปร PORT ต้องฟังตามนั้น
#   ถ้าไม่มี (เช่นรันเองในเครื่อง) ใช้ 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]

