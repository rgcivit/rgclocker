import { useEffect, useRef } from 'react';
import { useLockers } from '../context/LockerContext';

const FIVE_MINUTES_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Custom Hook to automatically lock a locker after 5 minutes of user inactivity.
 * Tracks user actions (mousemove, keydown, click, scroll) and resets the timer.
 * @param {string} lockerId - The ID of the locker to lock
 * @param {Function} onLockCallback - Optional callback triggered when the locker gets locked
 */
export function useAutoLock(lockerId, onLockCallback) {
  const { lockLocker, isLockerUnlocked } = useLockers();
  const timerRef = useRef(null);

  useEffect(() => {
    // If locker is not unlocked, do not start inactivity tracking
    if (!lockerId || !isLockerUnlocked(lockerId)) {
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        console.log(`[Auto-Lock] Locker ${lockerId} locked due to 5 minutes of inactivity.`);
        lockLocker(lockerId);
        if (onLockCallback) {
          onLockCallback();
        }
      }, FIVE_MINUTES_MS);
    };

    // Track user interaction events
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    // Initialize timer
    resetTimer();

    // Attach listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup on unmount or dependency change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [lockerId, isLockerUnlocked, lockLocker, onLockCallback]);
}

export default useAutoLock;
