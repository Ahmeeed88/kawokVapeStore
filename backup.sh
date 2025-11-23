#!/bin/bash

# KawokVapeStore Backup Script
# Usage: ./backup.sh

# Configuration
PROJECT_DIR="/path/to/your/kawok-vape-store"
BACKUP_DIR="$PROJECT_DIR/backup"
DB_FILE="$PROJECT_DIR/prisma/dev.db"
DATE_FORMAT=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup-$DATE_FORMAT.db"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database file exists
if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file not found at $DB_FILE"
    exit 1
fi

# Create backup
echo "Creating backup: $BACKUP_FILE"
cp "$DB_FILE" "$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup created successfully: $BACKUP_FILE"
    
    # Set proper permissions
    chmod 644 "$BACKUP_FILE"
    
    # Remove old backups (retention)
    echo "Removing backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "backup-*.db" -mtime +$RETENTION_DAYS -delete
    
    # List current backups
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/backup-*.db
else
    echo "Error: Backup failed!"
    exit 1
fi

echo "Backup process completed."