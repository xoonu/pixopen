export function isErrorStatus(message: string): boolean {
  return /failed|error|timeout|not found|required|exists|unable|select a pixoo|fix the|no frames|can't reach|didn't respond|rejected|already in use|give your project a name/i.test(
    message,
  );
}

export type StatusToastTone = 'info' | 'success' | 'error';

export function statusToastTone(message: string): StatusToastTone {
  if (isErrorStatus(message)) return 'error';
  if (
    /saved|deployed|imported|duplicated|deleted|running on|connected to|added |updated |removed slide|stopped live|copied frame|added empty|moved frame|placed live|test pattern|found \d+ devices|search complete|added \d/i.test(
      message,
    )
  ) {
    return 'success';
  }
  return 'info';
}
