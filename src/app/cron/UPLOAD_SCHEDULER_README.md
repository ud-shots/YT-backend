# Database-Driven Video Upload Scheduler

## Overview
This implementation provides a robust, database-driven video upload scheduling system that replaces the hardcoded time slots with dynamic, configurable schedules stored in the database.

## Key Features

### 1. Dynamic Time Slots
- Upload schedules are stored in the database (not hardcoded)
- Each day can have multiple time slots with different limits
- Configurable start/end times and maximum uploads per slot

### 2. Safe Locking Mechanism
- Prevents duplicate uploads using atomic database operations
- Uses status transitions: `initiate` → `pending` → `uploading` → `success`/`failed`
- Handles stale/failed uploads by resetting them after 30 minutes

### 3. Time Zone Support
- Uses Asia/Kolkata timezone consistently
- Proper time comparisons using Moment Timezone

### 4. Upload Limits
- Enforces daily upload limits per time slot
- Counts uploads for the current day only
- Respects `max_uploads` setting for each slot

## Database Schema

### Upload Schedules Table
```sql
CREATE TABLE upload_schedules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  day VARCHAR(20) NOT NULL,           -- monday, tuesday, etc.
  start_time TIME NOT NULL,           -- HH:MM:SS format
  end_time TIME NOT NULL,             -- HH:MM:SS format
  max_uploads INTEGER DEFAULT 1,      -- Maximum uploads allowed in this slot
  slot_name VARCHAR(50),              -- Optional name (morning, afternoon, evening)
  is_active BOOLEAN DEFAULT TRUE      -- Whether this schedule is active
);
```

## How It Works

### 1. Time Slot Detection
- Every minute, the cron job checks the current time in Asia/Kolkata timezone
- Finds active slots for the current day that are within the time range
- Verifies that the slot hasn't reached its upload limit

### 2. Video Selection
- Finds the oldest pending video with `status = 'initiate'`
- Atomically updates its status to `pending` to prevent duplicate processing
- If the update affects 0 rows, another process already locked that video

### 3. Upload Process
- Calls the existing `mediaProccess` function to handle the upload
- Updates the final status to `success` or `failed` based on results
- Handles errors gracefully and ensures proper status updates

## Configuration Example

Sample schedule data:
```json
[
  {
    "user_id": "user-123",
    "day": "monday",
    "start_time": "09:00:00",
    "end_time": "11:59:59",
    "max_uploads": 1,
    "slot_name": "morning",
    "is_active": true
  },
  {
    "user_id": "user-123",
    "day": "monday",
    "start_time": "12:00:00",
    "end_time": "17:59:59",
    "max_uploads": 1,
    "slot_name": "afternoon",
    "is_active": true
  }
]
```

This allows:
- 1 upload between 9:00 AM - 11:59 AM
- 1 upload between 12:00 PM - 5:59 PM
- Total of 2 uploads on Monday

## Safety Features

### 1. Race Condition Prevention
- Uses atomic database updates to lock videos
- Prevents multiple processes from uploading the same video

### 2. Stale Upload Recovery
- Detects uploads stuck in `pending` status for >30 minutes
- Resets them back to `initiate` for retry

### 3. Error Handling
- Proper try/catch blocks with status updates
- Ensures videos don't get stuck in processing state

## Service Functions

### UploadSchedulerService
- `getCurrentTimeInfo()` - Get current time in Asia/Kolkata
- `getActiveSlotsForDay(day)` - Find active slots for a day
- `isWithinTimeSlot()` - Check if time is in a slot
- `getUploadCountForSlot()` - Count uploads for a slot today
- `findActiveSlot()` - Find current active upload slot
- `findNextVideoToUpload()` - Get next video with locking
- `resetStalePendingVideos()` - Recover stuck uploads

## Migration

Run the migration to create the upload_schedules table:
```bash
# The migration file is at src/migrations/create-upload-schedules-table.ts
```

## Testing

A test file is provided at `src/app/cron/upload-scheduler.test.ts` with comprehensive tests for all functionality.

## Production Considerations

1. **Database Indexes**: The migration includes indexes for performance
2. **Cron Monitoring**: The system prevents parallel execution
3. **Error Recovery**: Stale uploads are automatically reset
4. **Scalability**: Uses efficient database queries with proper indexing