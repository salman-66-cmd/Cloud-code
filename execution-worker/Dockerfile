FROM python:3.11-slim

# Install Node.js, GCC, G++, build-essential
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    g++ \
    make \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged runner user
RUN groupadd -g 1001 runnergroup && \
    useradd -u 1001 -g runnergroup -m -s /bin/bash runneruser

WORKDIR /worker

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Set permissions for unprivileged user
RUN chown -R runneruser:runnergroup /worker
USER runneruser

CMD ["python", "runners/worker.py"]
