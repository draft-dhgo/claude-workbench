/**
 * 로그 콘텐츠 기본 최대 길이 (설정값)
 * commandQueueService.ts 에서 import 하여 사용
 */
export const LOG_CONTENT_MAX_LENGTH = 100;

/**
 * 렌더러에 표시할 최대 로그 라인 수.
 * 이 값을 초과하면 가장 오래된 로그부터 제거한다.
 */
export const MAX_LOG_LINES = 500;

/**
 * 문자열이 maxLength를 초과하면 maxLength 위치에서 잘라 '...'를 붙여 반환한다.
 * maxLength 이하이면 원본을 그대로 반환한다.
 *
 * @param text     원본 문자열
 * @param maxLength 최대 허용 길이 (기본값: LOG_CONTENT_MAX_LENGTH)
 * @returns        축약된 문자열 (maxLength + 3 이하)
 */
export function truncateLogContent(
  text: string,
  maxLength: number = LOG_CONTENT_MAX_LENGTH
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
