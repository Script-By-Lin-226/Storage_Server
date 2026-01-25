# Linux LVM Setup Guide

This guide helps you configure the storage server to work with Linux Logical Volume Manager (LVM) for scalable storage.

## Prerequisites

- Linux system with LVM installed
- Root or sudo access
- LVM volume group and logical volume created

## Step 1: Create LVM Logical Volume (if not already created)

```bash
# Create a physical volume (replace /dev/sdb with your disk)
sudo pvcreate /dev/sdb

# Create a volume group
sudo vgcreate storage-vg /dev/sdb

# Create a logical volume (adjust size as needed, e.g., 100G, 500G, 1T)
sudo lvcreate -L 500G -n storage-lv storage-vg

# Format the logical volume
sudo mkfs.ext4 /dev/storage-vg/storage-lv

# Create mount point
sudo mkdir -p /mnt/lvm-storage

# Mount the logical volume
sudo mount /dev/storage-vg/storage-lv /mnt/lvm-storage

# Make it permanent by adding to /etc/fstab
echo "/dev/storage-vg/storage-lv /mnt/lvm-storage ext4 defaults 0 2" | sudo tee -a /etc/fstab
```

## Step 2: Create Upload Directory

```bash
# Create the upload directory
sudo mkdir -p /mnt/lvm-storage/uploads

# Set proper ownership (replace 'youruser' with your application user)
sudo chown -R youruser:youruser /mnt/lvm-storage/uploads

# Set proper permissions
sudo chmod -R 755 /mnt/lvm-storage/uploads
```

## Step 3: Configure Environment Variables

Update your `.env` file:

```env
# Storage directory - point to your LVM mount
UPLOAD_DIR=/mnt/lvm-storage/uploads

# Or use a standard location
# UPLOAD_DIR=/var/storage/uploads

# Other configurations...
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
ACCESS_TOKEN_EXP=30
REFRESH_TOKEN_EXP=7
ALGORITHM=HS256
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Step 4: Verify Permissions

Ensure the application user has read/write access:

```bash
# Check current permissions
ls -la /mnt/lvm-storage/uploads

# If needed, adjust ownership
sudo chown -R $(whoami):$(whoami) /mnt/lvm-storage/uploads
```

## Step 5: Test the Setup

```bash
# Test directory creation
python3 -c "from pathlib import Path; Path('/mnt/lvm-storage/uploads').mkdir(parents=True, exist_ok=True); print('Directory accessible')"

# Test write permissions
touch /mnt/lvm-storage/uploads/test.txt && rm /mnt/lvm-storage/uploads/test.txt && echo "Write permissions OK"
```

## LVM Management Commands

### Extend Logical Volume (when you need more space)

```bash
# Extend the logical volume (add 100GB)
sudo lvextend -L +100G /dev/storage-vg/storage-lv

# Resize the filesystem
sudo resize2fs /dev/storage-vg/storage-lv

# Verify new size
df -h /mnt/lvm-storage
```

### Check LVM Status

```bash
# Check physical volumes
sudo pvs

# Check volume groups
sudo vgs

# Check logical volumes
sudo lvs

# Check filesystem usage
df -h /mnt/lvm-storage
```

### Add More Storage

```bash
# Add a new physical disk
sudo pvcreate /dev/sdc

# Extend the volume group
sudo vgextend storage-vg /dev/sdc

# Extend the logical volume
sudo lvextend -l +100%FREE /dev/storage-vg/storage-lv

# Resize filesystem
sudo resize2fs /dev/storage-vg/storage-lv
```

## Systemd Service Setup (Optional)

Create a systemd service to ensure the application starts on boot:

```bash
sudo nano /etc/systemd/system/storage-server.service
```

Add the following:

```ini
[Unit]
Description=Storage Server
After=network.target postgresql.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/server_storage
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/python3 /path/to/server_storage/main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable storage-server
sudo systemctl start storage-server
sudo systemctl status storage-server
```

## Monitoring Storage Usage

The dashboard automatically shows:
- Total disk space
- Used space
- Free space percentage
- File count and distribution

You can also monitor via command line:

```bash
# Watch storage usage
watch -n 5 'df -h /mnt/lvm-storage && du -sh /mnt/lvm-storage/uploads'

# Get detailed file count
find /mnt/lvm-storage/uploads -type f | wc -l
```

## Backup Recommendations

For LVM-based storage, consider:

1. **LVM Snapshots** (for quick backups):
```bash
sudo lvcreate -L 10G -s -n storage-snapshot /dev/storage-vg/storage-lv
sudo mount /dev/storage-vg/storage-snapshot /mnt/snapshot
# Copy files...
sudo umount /mnt/snapshot
sudo lvremove /dev/storage-vg/storage-snapshot
```

2. **Regular Backups**:
```bash
# Create backup script
sudo nano /usr/local/bin/backup-storage.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/storage"
SOURCE_DIR="/mnt/lvm-storage/uploads"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/storage_backup_$DATE.tar.gz $SOURCE_DIR

# Keep only last 7 days
find $BACKUP_DIR -name "storage_backup_*.tar.gz" -mtime +7 -delete
```

3. **Schedule with Cron**:
```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-storage.sh
```

## Troubleshooting

### Permission Denied Errors

```bash
# Check SELinux (if enabled)
sudo getenforce
sudo setenforce 0  # Temporarily disable for testing

# Check AppArmor (if enabled)
sudo aa-status
```

### Disk Full Errors

```bash
# Check space
df -h

# Find large files
du -h /mnt/lvm-storage/uploads | sort -rh | head -20

# Extend LVM volume (see above)
```

### Mount Issues

```bash
# Check if mounted
mount | grep lvm-storage

# Remount if needed
sudo mount -a

# Check fstab syntax
sudo mount -o remount /mnt/lvm-storage
```

## Performance Optimization

For better performance with large files:

1. **Adjust I/O Scheduler**:
```bash
echo deadline | sudo tee /sys/block/sdb/queue/scheduler
```

2. **Increase Read-Ahead**:
```bash
sudo blockdev --setra 8192 /dev/storage-vg/storage-lv
```

3. **Tune Filesystem**:
```bash
sudo tune2fs -o journal_data_writeback /dev/storage-vg/storage-lv
```

## Security Considerations

1. **Firewall Rules**:
```bash
# Allow only necessary ports
sudo ufw allow 8000/tcp  # Backend API
sudo ufw allow 3000/tcp  # Frontend (if serving from same machine)
```

2. **Directory Permissions**:
```bash
# Restrict access to upload directory
sudo chmod 750 /mnt/lvm-storage/uploads
sudo chown appuser:appuser /mnt/lvm-storage/uploads
```

3. **Regular Updates**:
```bash
sudo apt update && sudo apt upgrade  # Debian/Ubuntu
sudo yum update  # CentOS/RHEL
```
