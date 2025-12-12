# SQLite Corruption Prevention Guide

## What Happens if SQLite Gets Corrupted?

If a SQLite database becomes corrupted, you may experience:

1. **Application Crashes**: The application may fail to start or crash during database operations
2. **Data Loss**: Corrupted pages may result in missing or unreadable data
3. **Query Failures**: SQL queries may return errors like:
   - `database disk image is malformed`
   - `database is locked`
   - `disk I/O error`
4. **Integrity Check Failures**: `PRAGMA integrity_check` will return errors instead of "ok"

## Common Causes of SQLite Corruption

1. **Hardware Failures**: Disk failures, power outages, or memory corruption
2. **File System Issues**: File system bugs, full disk, or permission problems
3. **Concurrent Access**: Multiple processes writing to the same database without proper locking
4. **Improper Shutdown**: Application crashes or forced termination during writes
5. **Network File Systems**: Using SQLite on NFS or other network file systems without proper configuration

## Prevention Measures Implemented

### 1. **WAL Mode (Write-Ahead Logging)**
- **Status**: ✅ Enabled
- **Benefit**: Better concurrency, crash recovery, and reduced corruption risk
- **Configuration**: `_journal_mode=WAL`

### 2. **Connection Pool Settings**
- **Status**: ✅ Configured
- **Settings**:
  - `MaxOpenConns: 1` - SQLite works best with a single connection
  - `MaxIdleConns: 1` - Prevents connection leaks
  - `ConnMaxLifetime: 0` - Keeps connections alive

### 3. **Busy Timeout**
- **Status**: ✅ Enabled (5 seconds)
- **Benefit**: Prevents "database is locked" errors
- **Configuration**: `_busy_timeout=5000`

### 4. **Foreign Key Constraints**
- **Status**: ✅ Enabled
- **Benefit**: Ensures referential integrity
- **Configuration**: `_foreign_keys=1`

### 5. **Synchronous Mode**
- **Status**: ✅ Set to NORMAL
- **Benefit**: Balances safety and performance
- **Configuration**: `_synchronous=NORMAL`

### 6. **Startup Integrity Check**
- **Status**: ✅ Enabled
- **Benefit**: Detects corruption immediately on startup
- **Implementation**: `PRAGMA integrity_check` runs on database initialization

### 7. **Automatic Backups**
- **Status**: ✅ Available (can be enabled)
- **Benefit**: Regular backups allow recovery from corruption
- **Implementation**: `AutoBackup()` function with configurable intervals

## How to Use Backup and Recovery

### Manual Backup

```go
// Create a backup
err := db.Backup("/path/to/backup.db")
if err != nil {
    log.Fatal(err)
}
```

### Automatic Backups

```go
// Start automatic backups (every 6 hours)
ctx := context.Background()
go db.AutoBackup(ctx, "/path/to/backups", 6*time.Hour)
```

### Check Database Integrity

```go
// Check if database is corrupted
err := db.CheckIntegrity()
if err != nil {
    log.Printf("Database corruption detected: %v", err)
    // Restore from backup
}
```

### Restore from Backup

```go
// Restore database from backup
err := db.RestoreFromBackup("/path/to/backup.db", "/path/to/database.db")
if err != nil {
    log.Fatal(err)
}
```

## Best Practices

### 1. **Regular Backups**
- Enable automatic backups with `AutoBackup()`
- Keep backups for at least 7 days
- Store backups in a different location than the main database

### 2. **Monitor Integrity**
- Run `CheckIntegrity()` periodically (e.g., daily)
- Log integrity check results
- Alert on corruption detection

### 3. **Proper Shutdown**
- Always close database connections gracefully
- Use context cancellation for clean shutdown
- Wait for pending transactions to complete

### 4. **Avoid Network File Systems**
- If possible, store SQLite databases on local disk
- If using network storage, ensure proper locking and caching

### 5. **Disk Space Monitoring**
- Monitor available disk space
- Ensure sufficient space for WAL files
- Clean up old WAL files if needed

### 6. **Error Handling**
- Always check database operation errors
- Implement retry logic for transient errors
- Log all database errors for debugging

## Recovery Procedures

### If Corruption is Detected

1. **Stop the Application**: Immediately stop all database operations
2. **Check Integrity**: Run `PRAGMA integrity_check` to assess damage
3. **Attempt Recovery**: Try `PRAGMA quick_check` for faster assessment
4. **Restore from Backup**: Use the most recent backup
5. **Verify Restored Database**: Run integrity check on restored database
6. **Investigate Root Cause**: Check logs, disk health, and system resources

### Emergency Recovery Commands

```sql
-- Quick integrity check (faster, less thorough)
PRAGMA quick_check;

-- Full integrity check (slower, more thorough)
PRAGMA integrity_check;

-- Check WAL file
PRAGMA wal_checkpoint(TRUNCATE);

-- Rebuild database (last resort)
VACUUM;
```

## Monitoring and Alerts

### Recommended Monitoring

1. **Database Size**: Monitor database file size growth
2. **WAL File Size**: Monitor WAL file size (should be small)
3. **Integrity Checks**: Run periodic integrity checks
4. **Backup Status**: Monitor backup success/failure
5. **Error Rates**: Monitor database error rates

### Alert Triggers

- Integrity check failures
- Backup failures
- Database lock timeouts
- Disk space below threshold
- Unusual error rates

## Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [SQLite Corruption](https://www.sqlite.org/howtocorrupt.html)
- [WAL Mode](https://www.sqlite.org/wal.html)
- [Backup API](https://www.sqlite.org/backup.html)

## Summary

The application now includes comprehensive corruption prevention:

✅ **WAL mode** for crash recovery  
✅ **Connection pooling** optimized for SQLite  
✅ **Startup integrity checks** to detect corruption early  
✅ **Automatic backup** functionality  
✅ **Recovery procedures** for restoring from backups  
✅ **Proper error handling** and logging  

These measures significantly reduce the risk of corruption and provide recovery options if corruption occurs.


